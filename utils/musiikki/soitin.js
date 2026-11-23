/**
 * Palvelinkohtainen musiikkisoitin: jono, toistotilat ja äänikanavayhteys.
 *
 * Yksi Soitin-olio per palvelin. Äänikirjasto (@discordjs/voice) ja äänen
 * hakutapa annetaan sisään, joten logiikan voi testata ilman Discordia ja
 * ulkoisia ohjelmia (ks. scripts/musiikkitesti.js).
 */

const { asetukset: lueAsetukset, lataaAaniKirjasto } = require("./config");
const { MusiikkiVirhe, haeKappaleet, hakulause, onTarkoituksellaSaavuttamaton } = require("./lahteet");
const ytdlp = require("./ytdlp");

const soittimet = new Map(); // guildId -> Soitin

const TOISTOTILAT = ["pois", "kappale", "jono"];
const ALKUVIRHE_RAJA_MS = 15_000; // jos tavuja ei tullut ja kesti näin vähän, haku epäonnistui

async function oletusLuoVirta(kappale) {
    return ytdlp.virta(kappale.url ?? hakulause(kappale));
}

async function haeSoundCloudVara(kappale, asetukset) {
    const haku = [kappale.artisti, kappale.otsikko].filter(Boolean).join(" ").slice(0, 200);
    if (!haku) return null;

    const tulokset = await haeKappaleet(haku, {
        pyytaja: kappale.pyytaja,
        hakulahde: "soundcloud",
        asetukset
    });
    return tulokset.kappaleet[0] ?? null;
}

function ytdlpVirheluokka(err) {
    if (typeof err?.stderrLuokka === "string") return err.stderrLuokka;
    return ytdlp.stderrDiagnostiikka(err?.stderr ?? err?.yksityiskohta ?? err?.message).stderrLuokka;
}

function voiSoundCloudVarmistus(kappale, err) {
    if (kappale.hakulahde !== "youtube" || !["YouTube", "Spotify"].includes(kappale.lahde)) return false;
    if (kappale.suoraSyote && onTarkoituksellaSaavuttamaton(err)) return false;
    if (err?.message === "YTDLP_PUUTTUU" || ["ENOENT", "EACCES", "EPERM"].includes(err?.code)) return false;
    return true;
}

class Soitin {
    /**
     * @param {object} o
     * @param {string} o.guildId
     * @param {object} o.voice        @discordjs/voice (tai testifeikki)
     * @param {Function} [o.luoVirta] kappale -> { stream, sulje, tavuja, virhe }
     * @param {object} [o.asetukset]
     * @param {Function} [o.ilmoita]  tapahtuma -> void (näytetään tekstikanavalla)
     */
    constructor({
        guildId,
        voice,
        luoVirta = oletusLuoVirta,
        haeSoundCloud = haeSoundCloudVara,
        asetukset = lueAsetukset(),
        ilmoita = () => {}
    }) {
        this.guildId = guildId;
        this.voice = voice;
        this.luoVirta = luoVirta;
        this.haeSoundCloud = haeSoundCloud;
        this.asetukset = asetukset;
        this.ilmoita = tapahtuma => {
            try { Promise.resolve(ilmoita(tapahtuma)).catch(() => {}); } catch { /* ei kaada soittoa */ }
        };

        this.jono = [];
        this.nyt = null;
        this.silmukka = "pois";
        this.yhteys = null;
        this.kanavaId = null;
        this.yhdistaa = null;
        this.yhdistaaKanavalle = null;
        this.virta = null;
        this.resurssi = null;
        this.alkoi = 0;
        this.sarja = 0;
        this.valmis = true;
        this.lopetettu = false;
        this.ajastinTyhja = null;
        this.ajastinYksin = null;

        this.soitin = voice.createAudioPlayer({
            behaviors: { noSubscriber: voice.NoSubscriberBehavior.Pause }
        });

        this.soitin.on(voice.AudioPlayerStatus.Idle, () => this.#kappaleValmis());
        this.soitin.on("error", err => {
            console.error(`❌ Äänisoittimen virhe (${this.guildId}):`, err.message);
            this.#kappaleValmis(err || new Error("soittimen virhe"));
        });
    }

    // -----------------------------------------------------------------------
    // Yhteys
    // -----------------------------------------------------------------------

    /** Liittyy kanavalle. Samanaikaiset kutsut jakavat saman yhdistämisen. */
    yhdista(kanava) {
        if (this.yhteys && this.kanavaId === kanava.id) return Promise.resolve();

        if (!this.yhdistaa || this.yhdistaaKanavalle !== kanava.id) {
            this.yhdistaaKanavalle = kanava.id;
            this.yhdistaa = this.#yhdista(kanava).finally(() => { this.yhdistaa = null; });
        }

        return this.yhdistaa;
    }

    async #yhdista(kanava) {
        const v = this.voice;
        this.yhteys?.destroy();

        const yhteys = v.joinVoiceChannel({
            channelId: kanava.id,
            guildId: kanava.guild.id,
            adapterCreator: kanava.guild.voiceAdapterCreator,
            selfDeaf: true
        });

        try {
            await v.entersState(yhteys, v.VoiceConnectionStatus.Ready, 20_000);
        } catch {
            yhteys.destroy();
            throw new MusiikkiVirhe("Äänikanavalle liittyminen ei onnistunut. Tarkista botin oikeudet (Yhdistä ja Puhu).");
        }

        // Jos yhteys katkeaa (esim. botti siirretään toiselle kanavalle), annetaan
        // sille hetki palautua; muuten siivotaan koko soitin pois.
        yhteys.on(v.VoiceConnectionStatus.Disconnected, async () => {
            if (this.lopetettu) return;
            try {
                await Promise.race([
                    v.entersState(yhteys, v.VoiceConnectionStatus.Signalling, 5_000),
                    v.entersState(yhteys, v.VoiceConnectionStatus.Connecting, 5_000)
                ]);
            } catch {
                this.lopeta();
            }
        });

        yhteys.subscribe(this.soitin);
        this.yhteys = yhteys;
        this.kanavaId = kanava.id;
    }

    // -----------------------------------------------------------------------
    // Jono
    // -----------------------------------------------------------------------

    /**
     * Lisää kappaleet jonoon ja aloittaa soiton jos mitään ei soi.
     * @returns {{ lisatyt: object[], pudotettu: number, soiHeti: boolean }}
     */
    lisaa(kappaleet) {
        const tilaa = this.asetukset.maxJono - this.jono.length;

        if (tilaa <= 0) {
            throw new MusiikkiVirhe(`Jono on täynnä (max ${this.asetukset.maxJono} kappaletta).`);
        }

        const lisatyt = kappaleet.slice(0, tilaa);
        const soiHeti = !this.nyt;

        this.jono.push(...lisatyt);
        clearTimeout(this.ajastinTyhja);

        if (soiHeti) {
            this.#seuraava().catch(err => console.error("❌ Soiton aloitus epäonnistui:", err));
        }

        return { lisatyt, pudotettu: kappaleet.length - lisatyt.length, soiHeti };
    }

    sekoita() {
        for (let i = this.jono.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.jono[i], this.jono[j]] = [this.jono[j], this.jono[i]];
        }
        return this.jono.length;
    }

    toisto(tila) {
        if (!TOISTOTILAT.includes(tila)) throw new MusiikkiVirhe("Tuntematon toistotila.");
        this.silmukka = tila;
        return tila;
    }

    /** @returns {object|null} ohitettu kappale */
    ohita() {
        if (!this.nyt) return null;

        const kappale = this.nyt;
        this.valmis = true;
        this.virta?.sulje();

        try { this.soitin.stop(true); } catch { /* ei soinut */ }

        this.#seuraava({ ohitus: true }).catch(err => console.error("❌ Ohitus epäonnistui:", err));
        return kappale;
    }

    /** @returns {"tauolla"|"jatkuu"|null} */
    tauko() {
        const { AudioPlayerStatus: S } = this.voice;
        const tila = this.soitin.state.status;

        if (tila === S.Playing || tila === S.Buffering) {
            this.soitin.pause(true);
            return "tauolla";
        }

        if (tila === S.Paused || tila === S.AutoPaused) {
            this.soitin.unpause();
            return "jatkuu";
        }

        return null;
    }

    nytTiedot() {
        const { AudioPlayerStatus: S } = this.voice;
        const tila = this.soitin.state.status;

        return {
            kappale: this.nyt,
            kulunutS: Math.floor((this.resurssi?.playbackDuration ?? 0) / 1000),
            tauolla: tila === S.Paused || tila === S.AutoPaused
        };
    }

    // -----------------------------------------------------------------------
    // Elinkaari
    // -----------------------------------------------------------------------

    lopeta() {
        if (this.lopetettu) return;
        this.lopetettu = true;

        clearTimeout(this.ajastinTyhja);
        clearTimeout(this.ajastinYksin);
        this.jono = [];
        this.nyt = null;
        this.sarja++;
        this.virta?.sulje();

        try { this.soitin.stop(true); } catch { /* jo pysäytetty */ }
        try { this.yhteys?.destroy(); } catch { /* jo tuhottu */ }

        if (soittimet.get(this.guildId) === this) soittimet.delete(this.guildId);
    }

    /** Kutsutaan kun botin äänikanavan jäsenet muuttuvat. */
    kanavaMuuttui(ihmisiaKanavalla) {
        clearTimeout(this.ajastinYksin);
        if (ihmisiaKanavalla > 0) return;

        this.ajastinYksin = setTimeout(() => {
            this.ilmoita({ tyyppi: "poistu", syy: "yksin" });
            this.lopeta();
        }, this.asetukset.poistuYksinMs);
        this.ajastinYksin.unref?.();
    }

    // -----------------------------------------------------------------------
    // Sisäiset
    // -----------------------------------------------------------------------

    #aloitaTyhjaAjastin() {
        clearTimeout(this.ajastinTyhja);

        this.ajastinTyhja = setTimeout(() => {
            if (!this.nyt && this.jono.length === 0) {
                this.ilmoita({ tyyppi: "poistu", syy: "jono" });
                this.lopeta();
            }
        }, this.asetukset.poistuJononJalkeenMs);
        this.ajastinTyhja.unref?.();
    }

    /** Kappale loppui, ohitettiin tai epäonnistui. */
    #kappaleValmis(virhe = null) {
        if (this.lopetettu || !this.nyt || this.valmis) return;
        this.valmis = true;

        const kappale = this.nyt;
        const virta = this.virta;
        const eiTullutAanta = virta ? virta.tavuja() === 0 : false;
        const epaonnistui = Boolean(virhe) || (eiTullutAanta && Date.now() - this.alkoi < ALKUVIRHE_RAJA_MS);

        virta?.sulje();
        this.virta = null;
        this.resurssi = null;

        if (epaonnistui) {
            if (voiSoundCloudVarmistus(kappale, virhe)) {
                const sarja = ++this.sarja;
                this.#jatkaSoundCloudilla(kappale, virhe, sarja)
                    .catch(err => console.error("❌ SoundCloud-varatoisto epäonnistui:", err));
                return;
            }

            this.ilmoita({
                tyyppi: "virhe",
                kappale,
                syy: virta?.virhe?.() || (typeof virhe === "string" ? virhe : virhe?.message) || "",
                viesti: "Äänen lataaminen epäonnistui. Kokeile toista kappaletta tai hakutulosta."
            });
            if (this.silmukka === "kappale") this.silmukka = "pois"; // ei toisteta rikkinäistä kappaletta
            this.nyt = null;
        }

        this.#seuraava().catch(err => console.error("❌ Seuraavan kappaleen aloitus epäonnistui:", err));
    }

    async #soundCloudVirta(kappale, ytVirhe, onPeruttu) {
        const alkuperainenVirheluokka = ytdlpVirheluokka(ytVirhe);
        console.info("[musiikki-toisto] " + JSON.stringify({
            vaihe: "youtube-aanivirhe",
            virheluokka: alkuperainenVirheluokka,
            varahaku: "SoundCloud"
        }));

        try {
            const soundCloudKappale = await this.haeSoundCloud(kappale, this.asetukset);
            if (onPeruttu()) return null;
            if (!soundCloudKappale) {
                throw new Error("SoundCloud-varahausta ei löytynyt soitettavaa tulosta.");
            }

            const virta = await this.luoVirta(soundCloudKappale);
            if (onPeruttu()) {
                virta.sulje();
                return null;
            }

            console.info("[musiikki-toisto] " + JSON.stringify({
                vaihe: "soundcloud-aanivirta-valmis",
                onnistui: true
            }));
            return { kappale: soundCloudKappale, virta };
        } catch (soundCloudVirhe) {
            if (onPeruttu()) return null;

            console.warn("[musiikki-toisto] " + JSON.stringify({
                vaihe: "soundcloud-aanivirta-epaonnistui",
                alkuperainenVirheluokka,
                varavirheluokka: ytdlpVirheluokka(soundCloudVirhe)
            }));
            const yhdistettyVirhe = new MusiikkiVirhe(
                "YouTube-äänen lataus epäonnistui, eikä samaa kappaletta saatu käynnistettyä SoundCloudista. Kokeile myöhemmin uudelleen tai valitse toinen hakutulos."
            );
            yhdistettyVirhe.kayttajaViesti = yhdistettyVirhe.message;
            throw yhdistettyVirhe;
        }
    }

    async #jatkaSoundCloudilla(kappale, ytVirhe, sarja) {
        const onPeruttu = () => sarja !== this.sarja || this.lopetettu;

        try {
            const varavirta = await this.#soundCloudVirta(kappale, ytVirhe, onPeruttu);
            if (!varavirta || onPeruttu()) return;

            this.nyt = varavirta.kappale;
            this.valmis = false;
            this.virta = varavirta.virta;
            this.resurssi = this.voice.createAudioResource(varavirta.virta.stream, {
                inputType: this.voice.StreamType.Arbitrary,
                metadata: varavirta.kappale
            });
            this.alkoi = Date.now();
            this.soitin.play(this.resurssi);
            this.ilmoita({ tyyppi: "soi", kappale: varavirta.kappale });
        } catch (err) {
            if (onPeruttu()) return;

            this.virta?.sulje();
            this.virta = null;
            if (this.silmukka === "kappale") this.silmukka = "pois";
            this.nyt = null;
            this.valmis = true;
            this.resurssi = null;
            this.ilmoita({
                tyyppi: "virhe",
                kappale,
                syy: err.message,
                viesti: err?.kayttajaViesti ?? "Äänen lataaminen epäonnistui. Kokeile toista kappaletta tai hakutulosta."
            });
            await this.#seuraava();
        }
    }

    async #seuraava({ ohitus = false } = {}) {
        clearTimeout(this.ajastinTyhja);
        const sarja = ++this.sarja;

        let seuraava;
        const toistetaan = this.silmukka === "kappale" && this.nyt && !ohitus;

        if (toistetaan) {
            seuraava = this.nyt;
        } else {
            if (this.silmukka === "jono" && this.nyt) this.jono.push(this.nyt);
            seuraava = this.jono.shift();
        }

        if (!seuraava) {
            const soiOli = Boolean(this.nyt);
            this.nyt = null;
            this.resurssi = null;
            if (soiOli) this.ilmoita({ tyyppi: "jono_loppui" });
            this.#aloitaTyhjaAjastin();
            return;
        }

        this.nyt = seuraava;
        this.valmis = false;
        this.alkoi = Date.now();

        try {
            let soitettava = seuraava;
            let virta;
            try {
                virta = await this.luoVirta(seuraava);
            } catch (ytVirhe) {
                if (sarja !== this.sarja || this.lopetettu) return;

                if (!voiSoundCloudVarmistus(seuraava, ytVirhe)) throw ytVirhe;
                const varavirta = await this.#soundCloudVirta(
                    seuraava,
                    ytVirhe,
                    () => sarja !== this.sarja || this.lopetettu
                );
                if (!varavirta) return;
                virta = varavirta.virta;
                soitettava = varavirta.kappale;
            }

            // Välillä ehdittiin ohittaa tai lopettaa
            if (sarja !== this.sarja || this.lopetettu) {
                virta.sulje();
                return;
            }

            this.virta = virta;
            this.nyt = soitettava;
            const v = this.voice;
            this.resurssi = v.createAudioResource(virta.stream, { inputType: v.StreamType.Arbitrary, metadata: soitettava });
            this.alkoi = Date.now();
            this.soitin.play(this.resurssi);

            if (!toistetaan) this.ilmoita({ tyyppi: "soi", kappale: soitettava });
        } catch (err) {
            if (sarja !== this.sarja || this.lopetettu) return;

            this.virta?.sulje();
            this.virta = null;
            this.resurssi = null;
            const puuttuu = err.message === "YTDLP_PUUTTUU";
            const viesti = err?.kayttajaViesti ??
                (puuttuu ? "yt-dlp puuttuu palvelimelta" : "Äänen lataaminen epäonnistui. Kokeile toista kappaletta tai hakutulosta.");
            this.ilmoita({ tyyppi: "virhe", kappale: seuraava, syy: err.message, viesti });
            if (puuttuu) this.jono = []; // ei kannata yrittää jokaista kappaletta erikseen

            if (this.silmukka === "kappale") this.silmukka = "pois";
            this.nyt = null;
            this.valmis = true;
            await this.#seuraava();
        }
    }
}

// ---------------------------------------------------------------------------
// Rekisteri
// ---------------------------------------------------------------------------

function haeSoitin(guildId) {
    return soittimet.get(guildId) ?? null;
}

/** Luo soittimen palvelimelle. Heittää MusiikkiVirhe jos äänikirjastoa ei ole. */
function luoSoitin(guildId, valinnat = {}) {
    const { voice, ...muut } = valinnat;
    let aani = voice;

    if (!aani) {
        const kirjasto = lataaAaniKirjasto();
        if (!kirjasto.ok) throw new MusiikkiVirhe(kirjasto.syy);
        aani = kirjasto.voice;
    }

    const soitin = new Soitin({ guildId, voice: aani, ...muut });
    soittimet.set(guildId, soitin);
    return soitin;
}

module.exports = { Soitin, haeSoitin, luoSoitin, TOISTOTILAT };
