/**
 * Palvelinkohtainen musiikkisoitin: jono, toistotilat ja äänikanavayhteys.
 *
 * Yksi Soitin-olio per palvelin. Äänikirjasto (@discordjs/voice) ja äänen
 * hakutapa annetaan sisään, joten logiikan voi testata ilman Discordia ja
 * ulkoisia ohjelmia (ks. scripts/musiikkitesti.js).
 */

const { asetukset: lueAsetukset, lataaAaniKirjasto } = require("./config");
const { MusiikkiVirhe, hakulause, onSoundCloud } = require("./lahteet");
const ytdlp = require("./ytdlp");
const { createHash, randomUUID } = require("node:crypto");

const soittimet = new Map(); // guildId -> Soitin
const TOISTOTILAT = ["pois", "kappale", "jono"];
// Discordin äänikehys kestää 20 ms. Siedetään noin 3 s tilapäistä katkosta.
const SAALLITUT_PUUTTUVAT_KEHYKSET = 150;

async function oletusLuoVirta(kappale, { signal }) {
    return ytdlp.virta(kappale.url ?? hakulause(kappale), { signal, soundCloud: onSoundCloud(kappale) });
}

function toistovirheenKayttajaViesti(err, kappale) {
    if (err?.kayttajaViesti) return err.kayttajaViesti;
    if (err?.message === "YTDLP_PUUTTUU") return "yt-dlp puuttuu palvelimelta";

    const luokka = err?.message === "YTDLP_AIKAKATKAISU" ? "aikakatkaisu" : ytdlpVirheluokka(err);
    if (luokka === "kirjautuminen") {
        return "Kappaleen toisto vaatii kirjautumisen tai palvelu vaatii vahvistuksen (bot-esto).";
    }
    if (luokka === "rate-limit") {
        return "Palvelu rajoittaa pyyntöjen määrää väliaikaisesti. Kokeile hetken kuluttua uudelleen.";
    }
    if (luokka === "drm-suojattu") {
        return "Kappale on DRM-suojattu eikä sitä voi toistaa.";
    }
    if (luokka === "ikarajoitus") {
        return "Kappale on ikärajoitettu eikä sitä voi toistaa ilman kirjautumista.";
    }
    if (luokka === "alue-estetty") {
        return "Kappale ei ole saatavilla tällä maantieteellisellä alueella.";
    }
    if (luokka === "yksityinen") {
        return "Kappale tai video on yksityinen.";
    }
    if (luokka === "poistettu") {
        return "Kappale tai video on poistettu.";
    }
    if (luokka === "kayttooikeusrajoitus") {
        return "Kappaleen toisto estettiin käyttöoikeuksien vuoksi.";
    }
    if (luokka === "formaatti") {
        return onSoundCloud(kappale)
            ? "SoundCloud ei tarjonnut kappaleelle täyspitkää toistokelpoista äänimuotoa."
            : "Kappaleelle ei löytynyt sopivaa äänimuotoa.";
    }
    if (luokka === "aikakatkaisu") {
        return "Yhteys palveluun aikakatkaistiin äänen latauksen aikana.";
    }
    if (luokka === "verkko") {
        return "Yhteys äänilähteeseen epäonnistui verkkovirheen vuoksi.";
    }
    if (luokka === "ei-saatavilla") {
        return "Kappale ei ole saatavilla lähteestä.";
    }

    return "Äänen lataaminen epäonnistui. Kokeile toista kappaletta tai hakutulosta.";
}

function ytdlpVirheluokka(err) {
    if (typeof err?.stderrLuokka === "string") return err.stderrLuokka;
    return ytdlp.stderrDiagnostiikka(err?.stderr ?? err?.yksityiskohta ?? err?.message).stderrLuokka;
}

function kappaleenTunniste(kappale) {
    if (!kappale?.url) return null;
    return createHash("sha256").update(String(kappale.url)).digest("hex").slice(0, 16);
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
        haeSoundCloud = null,
        asetukset = lueAsetukset(),
        ilmoita = () => {}
    }) {
        this.guildId = guildId;
        this.nakymaId = randomUUID();
        this.voimakkuus = 100;
        this.soiNykyista = false;
        this.ilmoitaSoivasta = false;
        this.voice = voice;
        this.luoVirta = luoVirta;
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
        this.peruutus = null;
        this.sarja = 0;
        this.lopetettu = false;
        this.ajastinTyhja = null;
        this.ajastinYksin = null;

        this.soitin = voice.createAudioPlayer({
            behaviors: {
                noSubscriber: voice.NoSubscriberBehavior.Pause,
                maxMissedFrames: SAALLITUT_PUUTTUVAT_KEHYKSET
            }
        });

        this.soitin.on(voice.AudioPlayerStatus.Playing, (_, tila) => {
            if (!tila?.resource || tila.resource !== this.resurssi) return;
            if (!this.soiNykyista) this.musiikkiToistoAlkoi?.(this.nyt);
            this.soiNykyista = true;
            if (this.ilmoitaSoivasta) {
                this.ilmoitaSoivasta = false;
                this.ilmoita({ tyyppi: "soi", kappale: this.nyt });
            } else {
                this.ilmoita({ tyyppi: "tila" });
            }
        });
        this.soitin.on(voice.AudioPlayerStatus.Idle, vanha => this.#kappaleValmis(vanha?.resource));
        this.soitin.on("error", err => this.#kappaleValmis(err.resource, err));
    }

    // -----------------------------------------------------------------------
    // Yhteys
    // -----------------------------------------------------------------------

    /** Liittyy kanavalle. Samanaikaiset kutsut jakavat saman yhdistämisen. */
    yhdista(kanava) {
        clearTimeout(this.ajastinTyhja);
        if (this.lopetettu) throw new MusiikkiVirhe("Soitin on jo suljettu. Yritä lisätä kappale uudelleen.");
        if (this.yhteys && this.kanavaId === kanava.id) return Promise.resolve();

        if ((this.yhdistaa && this.yhdistaaKanavalle !== kanava.id) ||
            (this.kanavaId && this.kanavaId !== kanava.id && (this.nyt || this.jono.length))) {
            throw new MusiikkiVirhe("Soitin on käytössä toisella äänikanavalla.");
        }

        if (!this.yhdistaa) {
            this.yhdistaaKanavalle = kanava.id;
            this.yhdistaa = this.#yhdista(kanava).finally(() => { this.yhdistaa = null; });
        }

        return this.yhdistaa;
    }

    async #yhdista(kanava) {
        const v = this.voice;
        const vanhaYhteys = this.yhteys;
        this.yhteys = null;
        this.kanavaId = null;
        vanhaYhteys?.destroy();

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
            if (this.lopetettu || this.yhteys !== yhteys) return;
            try {
                await Promise.race([
                    v.entersState(yhteys, v.VoiceConnectionStatus.Signalling, 5_000),
                    v.entersState(yhteys, v.VoiceConnectionStatus.Connecting, 5_000)
                ]);
            } catch {
                if (this.yhteys === yhteys) this.lopeta();
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
        this.#suljeToisto();

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

    asetaVoimakkuus(arvo) {
        this.voimakkuus = arvo;
        this.resurssi?.volume?.setVolume(arvo / 100);
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
        this.#suljeToisto();
        try { this.yhteys?.destroy(); } catch { /* jo tuhottu */ }

        if (soittimet.get(this.guildId) === this) soittimet.delete(this.guildId);
        this.ilmoita({ tyyppi: "suljettu" });
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

    #suljeToisto() {
        this.musiikkiToistoLoppui?.();
        this.soiNykyista = false;
        this.ilmoitaSoivasta = false;
        this.sarja++;
        this.resurssi = null;
        this.peruutus?.abort();
        this.peruutus = null;
        this.virta?.sulje();
        this.virta = null;
        try { this.soitin.stop(true); } catch { /* soitin on jo pysähtynyt */ }
    }

    #kappaleValmis(resurssi, virhe = null) {
        if (!resurssi || resurssi !== this.resurssi || this.lopetettu) return;

        const odotettuMs = this.nyt.kesto * 1000;
        // Resurssin aika mittaa dekoodattua ääntä, myös tilaajattoman tauon yli.
        const soitettuMs = resurssi.playbackDuration;
        const liianLyhyt = Number.isFinite(soitettuMs) && odotettuMs > 0 &&
            odotettuMs - soitettuMs > Math.max(3000, odotettuMs * 0.10);
        const tyhja = this.virta?.tavuja() === 0;
        if (!virhe && (liianLyhyt || tyhja)) {
            virhe = Object.assign(new Error("Äänivirta päättyi ennenaikaisesti."), {
                kayttajaViesti: tyhja ? "Lähteestä ei saatu ääntä." : "Äänivirta katkesi ennen kappaleen loppua."
            });
        }
        this.#viimeistele(virhe, soitettuMs, odotettuMs);
        this.#seuraava().catch(err => console.error("❌ Seuraavan kappaleen aloitus epäonnistui:", err?.name));
    }

    #viimeistele(virhe, soitettuMs = 0, odotettuMs = this.nyt?.kesto * 1000) {
        const kappale = this.nyt;
        const stderr = virhe?.stderr || (virhe && this.virta?.virhe?.());
        const toistovirhe = stderr && !virhe.kayttajaViesti && !virhe.stderr
            ? { message: virhe.message, stderr }
            : virhe;
        this.#suljeToisto();
        if (!virhe) return;

        const listaEstetty = kappale.soittolistaId && soitettuMs === 0 &&
            /\bnot a bot\b/i.test(stderr ?? virhe.message);
        let ohitettuListalta = 0;
        if (listaEstetty) {
            const jonossa = this.jono.length;
            this.jono = this.jono.filter(k => k.soittolistaId !== kappale.soittolistaId);
            ohitettuListalta = 1 + jonossa - this.jono.length;
        }

        console.warn("[musiikki-toisto] " + JSON.stringify({
            vaihe: "aanivirta-epäonnistui",
            lahde: kappale.lahde,
            kappaleTunniste: kappaleenTunniste(kappale),
            virheluokka: ytdlpVirheluokka(toistovirhe),
            odotettuMs: odotettuMs || null,
            soitettuMs,
            syy: virhe.kayttajaViesti ?? virhe.vaihe ?? null,
            ...(listaEstetty ? { ohitettuListalta } : {})
        }));
        if (this.silmukka === "kappale") this.silmukka = "pois";
        this.nyt = null;
        const viesti = listaEstetty
            ? `YouTube vaatii palvelimelta bottivarmistuksen. Listalta jäi soittamatta ${ohitettuListalta} kappaletta.`
            : toistovirheenKayttajaViesti(toistovirhe, kappale);
        this.ilmoita({ tyyppi: "virhe", kappale, viesti, listaEstetty });
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
            const edellinen = this.nyt?.pyytaja;
            const vuoro = this.musiikkiAsetukset?.fair && edellinen
                ? this.jono.findIndex(k => k.pyytaja !== edellinen) : -1;
            seuraava = this.jono.splice(Math.max(0,vuoro),1)[0];
        }

        if (!seuraava) {
            const soiOli = Boolean(this.nyt);
            this.nyt = null;
            this.resurssi = null;
            if (soiOli) {
                this.ilmoita({ tyyppi: "jono_loppui" });
                void this.musiikkiAuto?.();
            }
            this.#aloitaTyhjaAjastin();
            return;
        }

        this.nyt = seuraava;
        const peruutus = new AbortController();
        this.peruutus = peruutus;

        try {
            const virta = await this.luoVirta(seuraava, { signal: peruutus.signal });
            if (sarja !== this.sarja || this.lopetettu) {
                virta.sulje();
                return;
            }

            this.virta = virta;
            if (virta.stream.errored) throw virta.stream.errored;
            const v = this.voice;
            const resurssi = v.createAudioResource(virta.stream, {
                inputType: v.StreamType.Arbitrary,
                inlineVolume: true,
                metadata: seuraava
            });
            this.resurssi = resurssi;
            resurssi.volume?.setVolume(this.voimakkuus / 100);
            virta.stream.once("error", err => this.#kappaleValmis(resurssi, err));
            this.ilmoitaSoivasta = !toistetaan;
            this.soitin.play(resurssi);
        } catch (err) {
            if (sarja !== this.sarja || this.lopetettu) return;

            this.#viimeistele(err);
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
