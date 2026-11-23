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
const { createHash } = require("node:crypto");

const soittimet = new Map(); // guildId -> Soitin
const SOUNDCLOUD_YRITYSTEN_MAX = 5;
const UUDELLEENYRITETTAVAT_VIRHEET = new Set([
    "drm-suojattu",
    "formaatti",
    "yksityinen",
    "poistettu",
    "ei-saatavilla",
    "alue-estetty",
    "ikarajoitus",
    "kayttooikeusrajoitus"
]);
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
    return tulokset.kappaleet;
}

function ytdlpVirheluokka(err) {
    if (typeof err?.stderrLuokka === "string") return err.stderrLuokka;
    return ytdlp.stderrDiagnostiikka(err?.stderr ?? err?.yksityiskohta ?? err?.message).stderrLuokka;
}

function ytdlpVirheDiagnostiikka(err) {
    const stderr = err?.stderr ?? err?.yksityiskohta ?? err?.message ?? "";
    return {
        varavirheluokka: ytdlpVirheluokka(err),
        varavirheVaihe: typeof err?.vaihe === "string" ? err.vaihe : null,
        varavirheKoodi: typeof err?.code === "string" ? err.code : null,
        varavirheExitCode: Number.isInteger(err?.exitCode) ? err.exitCode : null,
        varavirheOte: ytdlp.turvallinenDiagnostiikkaTeksti(stderr)
    };
}

function virheVirrasta(err, virta) {
    const stderr = virta?.virhe?.();
    if (!stderr) return err;

    return Object.assign(new Error(err?.message ?? "YTDLP_VIRHE"), {
        cause: err,
        stderr,
        ...ytdlp.stderrDiagnostiikka(stderr)
    });
}

function kappaleenTunniste(kappale) {
    if (!kappale?.url) return null;
    return createHash("sha256").update(String(kappale.url)).digest("hex").slice(0, 16);
}

function onSoundCloud(kappale) {
    return kappale?.hakulahde === "soundcloud" || /soundcloud/i.test(kappale?.lahde ?? "");
}

function kappaleenAvain(url) {
    try {
        const osoite = new URL(url);
        return `${osoite.origin}${osoite.pathname.replace(/\/+$/, "")}`.toLowerCase();
    } catch {
        return String(url ?? "").toLowerCase();
    }
}

function soundCloudEhdokkaat(kappaleet, ohitettavaUrl) {
    const nahty = new Set();
    if (ohitettavaUrl) nahty.add(kappaleenAvain(ohitettavaUrl));

    return (Array.isArray(kappaleet) ? kappaleet : kappaleet ? [kappaleet] : [])
        .filter(onSoundCloud)
        .filter(kappale => {
            const url = kappaleenAvain(kappale.url);
            if (!url || nahty.has(url)) return false;
            nahty.add(url);
            return true;
        })
        .slice(0, SOUNDCLOUD_YRITYSTEN_MAX);
}

function voiYrittaaSoundCloudVarmistusta(err) {
    return UUDELLEENYRITETTAVAT_VIRHEET.has(ytdlpVirheluokka(err));
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
        this.toistonVaravaihtoehdot = [];
        this.toistonYritys = 1;
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
        clearTimeout(this.ajastinTyhja);
        if (this.lopetettu) throw new MusiikkiVirhe("Soitin on jo suljettu. Yritä lisätä kappale uudelleen.");
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

        if (this.lopetettu) {
            yhteys.destroy();
            throw new MusiikkiVirhe("Soitin suljettiin ennen äänikanavalle liittymistä. Yritä lisätä kappale uudelleen.");
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
        if (this.lopetettu) {
            throw new MusiikkiVirhe("Soitin on jo suljettu. Yritä lisätä kappale uudelleen.");
        }

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
        this.toistonVaravaihtoehdot = [];
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
        const toistovirhe = virheVirrasta(virhe, virta);
        const eiTullutAanta = virta ? virta.tavuja() === 0 : false;
        const epaonnistui = Boolean(virhe) || (eiTullutAanta && Date.now() - this.alkoi < ALKUVIRHE_RAJA_MS);

        if (epaonnistui) {
            console.warn("[musiikki-toisto] " + JSON.stringify({
                vaihe: "aanivirta-epäonnistui",
                lahde: kappale.lahde,
                kappaleTunniste: kappaleenTunniste(kappale),
                virheluokka: ytdlpVirheluokka(toistovirhe),
                yritys: this.toistonYritys,
                onnistui: false
            }));
        }

        virta?.sulje();
        this.virta = null;
        this.resurssi = null;

        if (epaonnistui) {
            if (voiSoundCloudVarmistus(kappale, toistovirhe)) {
                const sarja = ++this.sarja;
                this.#jatkaSoundCloudilla(kappale, toistovirhe, sarja)
                    .catch(err => console.error("❌ SoundCloud-varatoisto epäonnistui:", err));
                return;
            }

            if (onSoundCloud(kappale) && this.toistonVaravaihtoehdot.length &&
                voiYrittaaSoundCloudVarmistusta(toistovirhe)) {
                const sarja = ++this.sarja;
                this.#jatkaSoundCloudVaihtoehdoilla(
                    kappale,
                    this.toistonVaravaihtoehdot,
                    this.toistonYritys,
                    sarja
                ).catch(err => console.error("❌ SoundCloud-vaihtoehdot epäonnistuivat:", err));
                return;
            }

            this.ilmoita({
                tyyppi: "virhe",
                kappale,
                syy: toistovirhe?.stderr || (typeof toistovirhe === "string" ? toistovirhe : toistovirhe?.message) || "",
                viesti: "Äänen lataaminen epäonnistui. Kokeile toista kappaletta tai hakutulosta."
            });
            if (this.silmukka === "kappale") this.silmukka = "pois"; // ei toisteta rikkinäistä kappaletta
            this.nyt = null;
            this.toistonVaravaihtoehdot = [];
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
            const soundCloudKappaleet = soundCloudEhdokkaat(
                await this.haeSoundCloud(kappale, this.asetukset)
            );
            if (onPeruttu()) return null;
            if (!soundCloudKappaleet.length) {
                throw new Error("SoundCloud-varahausta ei löytynyt soitettavaa tulosta.");
            }
            const tulos = await this.#avaaSoundCloudEhdokkaat(soundCloudKappaleet, onPeruttu);
            return tulos;
        } catch (soundCloudVirhe) {
            if (onPeruttu()) return null;

            console.warn("[musiikki-toisto] " + JSON.stringify({
                vaihe: "soundcloud-aanivirta-epaonnistui",
                alkuperainenVirheluokka,
                ...ytdlpVirheDiagnostiikka(soundCloudVirhe)
            }));
            const yhdistettyVirhe = new MusiikkiVirhe(
                "YouTube-äänen lataus epäonnistui, eikä yhtään SoundCloudista löytynyttä tulosta saatu käynnistettyä. Kokeile myöhemmin uudelleen tai valitse toinen hakutulos."
            );
            yhdistettyVirhe.kayttajaViesti = yhdistettyVirhe.message;
            throw yhdistettyVirhe;
        }
    }

    async #avaaSoundCloudEhdokkaat(ehdokkaat, onPeruttu, yrityksenSiirto = 0) {
        const kokeiltavat = soundCloudEhdokkaat(ehdokkaat).slice(0, SOUNDCLOUD_YRITYSTEN_MAX - yrityksenSiirto);
        let viimeisinVirhe = null;

        for (let indeksi = 0; indeksi < kokeiltavat.length; indeksi++) {
            if (onPeruttu()) return null;

            const kappale = kokeiltavat[indeksi];
            const yritys = yrityksenSiirto + indeksi + 1;
            try {
                const virta = await this.luoVirta(kappale);
                console.info("[musiikki-toisto] " + JSON.stringify({
                    vaihe: "soundcloud-yritys",
                    lahde: kappale.lahde,
                    kappaleTunniste: kappaleenTunniste(kappale),
                    virheluokka: null,
                    yritys,
                    onnistui: true
                }));
                if (onPeruttu()) {
                    virta.sulje();
                    return null;
                }

                return {
                    kappale,
                    virta,
                    varavaihtoehdot: kokeiltavat.slice(indeksi + 1),
                    yritys
                };
            } catch (err) {
                viimeisinVirhe = err;
                console.warn("[musiikki-toisto] " + JSON.stringify({
                    vaihe: "soundcloud-yritys",
                    lahde: kappale.lahde,
                    kappaleTunniste: kappaleenTunniste(kappale),
                    virheluokka: ytdlpVirheluokka(err),
                    yritys,
                    onnistui: false
                }));
                if (onPeruttu()) return null;
                if (!voiYrittaaSoundCloudVarmistusta(err)) throw err;
            }
        }

        throw viimeisinVirhe ?? new Error("SoundCloud-varahausta ei löytynyt soitettavaa tulosta.");
    }

    async #jatkaSoundCloudVaihtoehdoilla(kappale, ehdokkaat, yritys, sarja) {
        const onPeruttu = () => sarja !== this.sarja || this.lopetettu;
        try {
            const varavirta = await this.#avaaSoundCloudEhdokkaat(ehdokkaat, onPeruttu, yritys);
            if (!varavirta || onPeruttu()) return;

            this.nyt = varavirta.kappale;
            this.valmis = false;
            this.virta = varavirta.virta;
            this.toistonVaravaihtoehdot = varavirta.varavaihtoehdot;
            this.toistonYritys = varavirta.yritys;
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
            this.resurssi = null;
            this.toistonVaravaihtoehdot = [];
            if (this.silmukka === "kappale") this.silmukka = "pois";
            this.nyt = null;
            this.valmis = true;
            this.ilmoita({
                tyyppi: "virhe",
                kappale,
                syy: err?.stderr ?? err?.message ?? "",
                viesti: "SoundCloud-tulosten äänivirtojen avaaminen epäonnistui. Kokeile toista hakua tai lähdettä."
            });
            await this.#seuraava();
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
            this.toistonVaravaihtoehdot = varavirta.varavaihtoehdot;
            this.toistonYritys = varavirta.yritys;
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
            this.toistonVaravaihtoehdot = [];
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
        if (this.lopetettu) return;

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
            this.toistonVaravaihtoehdot = [];
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
            let varavaihtoehdot = soundCloudEhdokkaat(
                seuraava.varatoistonEhdokkaat,
                seuraava.url
            );
            let yritys = 1;
            varavaihtoehdot = varavaihtoehdot.slice(0, SOUNDCLOUD_YRITYSTEN_MAX - 1);
            try {
                virta = await this.luoVirta(seuraava);
                console.info("[musiikki-toisto] " + JSON.stringify({
                    vaihe: "aanivirta-yritys",
                    lahde: seuraava.lahde,
                    kappaleTunniste: kappaleenTunniste(seuraava),
                    virheluokka: null,
                    yritys,
                    onnistui: true
                }));
            } catch (ytVirhe) {
                if (sarja !== this.sarja || this.lopetettu) return;

                console.warn("[musiikki-toisto] " + JSON.stringify({
                    vaihe: "aanivirta-yritys",
                    lahde: seuraava.lahde,
                    kappaleTunniste: kappaleenTunniste(seuraava),
                    virheluokka: ytdlpVirheluokka(ytVirhe),
                    yritys,
                    onnistui: false
                }));

                if (onSoundCloud(seuraava) && varavaihtoehdot.length &&
                    voiYrittaaSoundCloudVarmistusta(ytVirhe)) {
                    const varavirta = await this.#avaaSoundCloudEhdokkaat(
                        varavaihtoehdot,
                        () => sarja !== this.sarja || this.lopetettu,
                        yritys
                    );
                    if (!varavirta) return;
                    virta = varavirta.virta;
                    soitettava = varavirta.kappale;
                    varavaihtoehdot = varavirta.varavaihtoehdot;
                    yritys = varavirta.yritys;
                } else {
                    if (!voiSoundCloudVarmistus(seuraava, ytVirhe)) throw ytVirhe;
                    const varavirta = await this.#soundCloudVirta(
                        seuraava,
                        ytVirhe,
                        () => sarja !== this.sarja || this.lopetettu
                    );
                    if (!varavirta) return;
                    virta = varavirta.virta;
                    soitettava = varavirta.kappale;
                    varavaihtoehdot = varavirta.varavaihtoehdot;
                    yritys = varavirta.yritys;
                }
            }

            // Välillä ehdittiin ohittaa tai lopettaa
            if (sarja !== this.sarja || this.lopetettu) {
                virta.sulje();
                return;
            }

            this.virta = virta;
            this.nyt = soitettava;
            this.toistonVaravaihtoehdot = varavaihtoehdot;
            this.toistonYritys = yritys;
            const v = this.voice;
            this.resurssi = v.createAudioResource(virta.stream, { inputType: v.StreamType.Arbitrary, metadata: soitettava });
            this.alkoi = Date.now();
            this.soitin.play(this.resurssi);

            if (!toistetaan) this.ilmoita({ tyyppi: "soi", kappale: soitettava });
        } catch (err) {
            if (sarja !== this.sarja || this.lopetettu) return;

            this.virta?.sulje();
            this.virta = null;
            this.toistonVaravaihtoehdot = [];
            this.resurssi = null;
            const puuttuu = err.message === "YTDLP_PUUTTUU";
            const viesti = err?.kayttajaViesti ??
                (onSoundCloud(seuraava) && voiYrittaaSoundCloudVarmistusta(err)
                    ? "SoundCloud-tulosten äänivirtojen avaaminen epäonnistui. Kokeile toista hakua tai lähdettä."
                    : null) ??
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
