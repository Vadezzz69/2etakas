#!/usr/bin/env node
/**
 * Musiikkimoduulin logiikkatesti: `npm run musiikkitesti`
 *
 * Ajaa soittimen (jono, ohitus, toistotilat, virheet, ajastimet) feikkiäänikirjastolla
 * ja feikkivirroilla, sekä lähteiden tulkinnan (URL-sallilista, Spotify-jäsennys,
 * yt-dlp-vastaukset) feikkivastauksilla. Ei tarvitse verkkoa, yt-dlp:tä, ffmpegiä
 * eikä @discordjs/voice-kirjastoa. EI testaa oikeaa äänen toistoa Discordissa.
 */

const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { PassThrough } = require("node:stream");

const { Soitin } = require("../utils/musiikki/soitin");
const lahteet = require("../utils/musiikki/lahteet");
const ytdlp = require("../utils/musiikki/ytdlp");

// ---------------------------------------------------------------------------
// Feikit
// ---------------------------------------------------------------------------

class FeikkiSoitin extends EventEmitter {
    constructor() { super(); this.state = { status: "idle" }; this.toistettu = []; }
    play(resurssi) { this.state = { status: "playing" }; this.toistettu.push(resurssi.metadata); this.resurssi = resurssi; }
    stop() { if (this.state.status !== "idle") { this.state = { status: "idle" }; this.emit("idle"); } return true; }
    pause() { this.state = { status: "paused" }; return true; }
    unpause() { this.state = { status: "playing" }; return true; }
    /** Simuloi että kappale soi loppuun asti. */
    loppui() { this.stop(); }
}

function feikkiAani() {
    const yhteys = new EventEmitter();
    yhteys.subscribe = () => {};
    yhteys.destroy = () => { yhteys.tuhottu = true; };

    return {
        yhteys,
        createAudioPlayer: () => new FeikkiSoitin(),
        NoSubscriberBehavior: { Pause: "pause" },
        AudioPlayerStatus: { Idle: "idle", Playing: "playing", Paused: "paused", AutoPaused: "autopaused", Buffering: "buffering" },
        StreamType: { Arbitrary: "arbitrary" },
        VoiceConnectionStatus: { Ready: "ready", Disconnected: "disconnected", Signalling: "signalling", Connecting: "connecting" },
        createAudioResource: (stream, o) => ({ stream, metadata: o.metadata, playbackDuration: 7000 }),
        joinVoiceChannel: () => yhteys,
        entersState: async () => {}
    };
}

/** luoVirta joka ilmoittaa montako virtaa on avattu/suljettu. */
function feikkiVirrat({ tavuja = 100, viive = 0, heita = null } = {}) {
    const loki = { avattu: [], suljettu: 0 };

    const luoVirta = async kappale => {
        if (viive) await new Promise(r => setTimeout(r, viive));
        const virhe = typeof heita === "function" ? heita(kappale) : heita;
        if (virhe) throw new Error(virhe);
        loki.avattu.push(kappale.otsikko);
        return { stream: new PassThrough(), tavuja: () => tavuja, virhe: () => "feikkivirhe", sulje: () => { loki.suljettu++; } };
    };

    return { luoVirta, loki };
}

const k = (otsikko, lisaa = {}) => ({ otsikko, artisti: "Testi", kesto: 100, url: `https://youtu.be/${otsikko}`, kuva: null, lahde: "YouTube", hakulahde: "youtube", pyytaja: "u1", ...lisaa });
const aika = ms => new Promise(r => setTimeout(r, ms));

const ASETUKSET = { maxJono: 5, maxLista: 10, maxKestoS: 600, poistuJononJalkeenMs: 30, poistuYksinMs: 30, oletusHakulahde: "youtube", sallitutSivut: ["youtube.com", "youtu.be", "soundcloud.com", "bandcamp.com", "open.spotify.com"] };

function luo(valinnat = {}) {
    const aani = feikkiAani();
    const feikki = feikkiVirrat(valinnat.virrat);
    const luoVirta = valinnat.luoVirta ?? feikki.luoVirta;
    const loki = feikki.loki;
    const tapahtumat = [];
    const s = new Soitin({
        guildId: "g1",
        voice: aani,
        luoVirta,
        haeSoundCloud: valinnat.haeSoundCloud ?? (async () => null),
        asetukset: { ...ASETUKSET, ...valinnat.asetukset },
        ilmoita: t => tapahtumat.push(t)
    });
    return { s, aani, loki, tapahtumat, soitin: s.soitin };
}

// ---------------------------------------------------------------------------
// Testirunko
// ---------------------------------------------------------------------------

const testit = [];
const testi = (nimi, fn) => testit.push([nimi, fn]);

// ---------------------------------------------------------------------------
// Soitin
// ---------------------------------------------------------------------------

testi("soitto alkaa ensimmäisestä ja muut jäävät jonoon", async () => {
    const { s, soitin, tapahtumat } = luo();
    const r = s.lisaa([k("a"), k("b"), k("c")]);
    await aika(5);
    assert.equal(r.soiHeti, true);
    assert.deepEqual(soitin.toistettu.map(x => x.otsikko), ["a"]);
    assert.equal(s.jono.length, 2);
    assert.equal(tapahtumat.filter(t => t.tyyppi === "soi").length, 1);
});

testi("kappaleen loppuessa siirrytään seuraavaan ja jonon lopussa ilmoitetaan", async () => {
    const { s, soitin, tapahtumat } = luo();
    s.lisaa([k("a"), k("b")]);
    await aika(5);
    soitin.loppui(); await aika(5);
    assert.deepEqual(soitin.toistettu.map(x => x.otsikko), ["a", "b"]);
    soitin.loppui(); await aika(5);
    assert.equal(s.nyt, null);
    assert.equal(tapahtumat.at(-1).tyyppi, "jono_loppui");
});

testi("ohita siirtyy seuraavaan eikä toista kappaletta toistotilassa 'kappale'", async () => {
    const { s, soitin } = luo();
    s.toisto("kappale");
    s.lisaa([k("a"), k("b")]);
    await aika(5);
    const ohitettu = s.ohita(); await aika(5);
    assert.equal(ohitettu.otsikko, "a");
    assert.deepEqual(soitin.toistettu.map(x => x.otsikko), ["a", "b"]);
});

testi("toistotila 'kappale' toistaa saman kappaleen ilman uutta ilmoitusta", async () => {
    const { s, soitin, tapahtumat } = luo();
    s.toisto("kappale");
    s.lisaa([k("a"), k("b")]);
    await aika(5);
    soitin.loppui(); await aika(5);
    soitin.loppui(); await aika(5);
    assert.deepEqual(soitin.toistettu.map(x => x.otsikko), ["a", "a", "a"]);
    assert.equal(tapahtumat.filter(t => t.tyyppi === "soi").length, 1);
});

testi("toistotila 'jono' kiertää jonon alkuun", async () => {
    const { s, soitin } = luo();
    s.toisto("jono");
    s.lisaa([k("a"), k("b")]);
    await aika(5);
    for (let i = 0; i < 3; i++) { soitin.loppui(); await aika(5); }
    assert.deepEqual(soitin.toistettu.map(x => x.otsikko), ["a", "b", "a", "b"]);
});

testi("ohitus toistotilassa 'jono' ei hukkaa ohitettua kappaletta", async () => {
    const { s, soitin } = luo();
    s.toisto("jono");
    s.lisaa([k("a"), k("b")]);
    await aika(5);
    s.ohita(); await aika(5);
    s.ohita(); await aika(5);
    assert.deepEqual(soitin.toistettu.map(x => x.otsikko), ["a", "b", "a"]);
});

testi("kappale josta ei tule ääntä raportoidaan virheenä ja siirrytään eteenpäin", async () => {
    const { s, soitin, tapahtumat } = luo({ virrat: { tavuja: 0 } });
    s.lisaa([k("a"), k("b")]);
    await aika(5);
    soitin.loppui(); await aika(5);
    const virheet = tapahtumat.filter(t => t.tyyppi === "virhe");
    assert.equal(virheet.length, 1);
    assert.equal(virheet[0].kappale.otsikko, "a");
    assert.deepEqual(soitin.toistettu.map(x => x.otsikko), ["a", "b"]);
});

testi("rikkinäistä kappaletta ei jäädä toistamaan toistotilassa 'kappale'", async () => {
    const { s, soitin, tapahtumat } = luo({ virrat: { tavuja: 0 } });
    s.toisto("kappale");
    s.lisaa([k("a")]);
    await aika(5);
    soitin.loppui(); await aika(5);
    assert.equal(s.silmukka, "pois");
    assert.equal(tapahtumat.filter(t => t.tyyppi === "virhe").length, 1);
    assert.equal(soitin.toistettu.length, 1);
});

testi("soittimen virheilmoitus ohittaa kappaleen", async () => {
    const { s, soitin, tapahtumat } = luo();
    s.lisaa([k("a"), k("b")]);
    await aika(5);
    soitin.emit("error", new Error("rikki"));
    await aika(5);
    assert.equal(tapahtumat.filter(t => t.tyyppi === "virhe").length, 1);
    assert.deepEqual(soitin.toistettu.map(x => x.otsikko), ["a", "b"]);
});

testi("luoVirta-poikkeus ohittaa kappaleen ja jatkaa", async () => {
    const { s, soitin, tapahtumat } = luo({ virrat: { heita: kap => (kap.otsikko === "a" ? "hakuvirhe" : null) } });
    s.lisaa([k("a"), k("b")]);
    await aika(10);
    assert.equal(tapahtumat.filter(t => t.tyyppi === "virhe").length, 1);
    assert.deepEqual(soitin.toistettu.map(x => x.otsikko), ["b"]);
});

testi("YouTube-äänivirheen jälkeen SoundCloud käynnistyy samassa jonopaikassa", async () => {
    const alkuperainen = ytdlp.luoYtdlpVirhe({ stderr: "Sign in to confirm you’re not a bot" });
    const soundCloud = k("Biisi SoundCloudissa", {
        artisti: "Testi",
        lahde: "SoundCloud",
        hakulahde: "soundcloud",
        url: "https://soundcloud.com/testi/biisi"
    });
    let varahakuja = 0;
    const { s, soitin, tapahtumat } = luo({
        luoVirta: async kappale => {
            if (kappale.lahde === "YouTube") throw alkuperainen;
            return { stream: new PassThrough(), tavuja: () => 100, virhe: () => "", sulje: () => {} };
        },
        haeSoundCloud: async kappale => {
            varahakuja++;
            assert.equal(kappale.otsikko, "Biisi");
            return soundCloud;
        }
    });

    s.lisaa([k("Biisi")]);
    await aika(10);

    assert.equal(varahakuja, 1);
    assert.strictEqual(s.nyt, soundCloud);
    assert.deepEqual(soitin.toistettu.map(x => x.otsikko), ["Biisi SoundCloudissa"]);
    assert.equal(s.jono.length, 0, "varakappaletta ei lisätä jonoon uudelleen");
    assert.equal(tapahtumat.filter(t => t.tyyppi === "virhe").length, 0);
    assert.equal(tapahtumat.find(t => t.tyyppi === "soi").kappale.lahde, "SoundCloud");
});

testi("kesken YouTube-äänivirran tuleva virhe käynnistää SoundCloud-varatoiston", async () => {
    const soundCloud = k("Biisi SoundCloudissa", {
        lahde: "SoundCloud",
        hakulahde: "soundcloud",
        url: "https://soundcloud.com/testi/biisi"
    });
    const { s, soitin, tapahtumat } = luo({
        luoVirta: async () => ({
            stream: new PassThrough(),
            tavuja: () => 10,
            virhe: () => "",
            sulje: () => {}
        }),
        haeSoundCloud: async () => soundCloud
    });

    s.lisaa([k("Biisi")]);
    await aika(5);
    soitin.emit("error", ytdlp.luoYtdlpVirhe({ stderr: "Sign in to confirm you’re not a bot" }));
    await aika(10);

    assert.strictEqual(s.nyt, soundCloud);
    assert.equal(soitin.resurssi.metadata.lahde, "SoundCloud");
    assert.equal(s.jono.length, 0);
    assert.equal(tapahtumat.filter(t => t.tyyppi === "virhe").length, 0);
});

testi("YouTube-äänen varahaku toimii myös peräkkäisten kappaleiden jälkeen", async () => {
    let varahakuja = 0;
    const { s, soitin, tapahtumat } = luo({
        luoVirta: async kappale => {
            if (kappale.lahde === "YouTube") {
                throw ytdlp.luoYtdlpVirhe({ stderr: "Sign in to confirm you’re not a bot" });
            }
            return { stream: new PassThrough(), tavuja: () => 100, virhe: () => "", sulje: () => {} };
        },
        haeSoundCloud: async kappale => {
            varahakuja++;
            return k(`${kappale.otsikko} SoundCloudissa`, {
                lahde: "SoundCloud",
                hakulahde: "soundcloud",
                url: `https://soundcloud.com/testi/${kappale.otsikko}`
            });
        }
    });

    for (let i = 1; i <= 3; i++) {
        s.lisaa([k(`Biisi ${i}`)]);
        await aika(10);
        assert.equal(s.nyt.lahde, "SoundCloud");
        assert.equal(s.jono.length, 0);
        soitin.loppui();
        await aika(5);
    }

    assert.equal(varahakuja, 3);
    assert.equal(soitin.toistettu.length, 3);
    assert.equal(tapahtumat.filter(t => t.tyyppi === "virhe").length, 0);
});

testi("YouTube- ja SoundCloud-äänen epäonnistuminen antaa ymmärrettävän virheen", async () => {
    const { s, tapahtumat } = luo({
        luoVirta: async kappale => {
            throw ytdlp.luoYtdlpVirhe({
                stderr: kappale.lahde === "YouTube"
                    ? "Sign in to confirm you’re not a bot"
                    : "Unable to download webpage"
            });
        },
        haeSoundCloud: async () => k("Varakappale", {
            lahde: "SoundCloud",
            hakulahde: "soundcloud",
            url: "https://soundcloud.com/testi/varakappale"
        })
    });

    s.lisaa([k("Biisi")]);
    await aika(10);

    const virhe = tapahtumat.find(t => t.tyyppi === "virhe");
    assert.match(virhe.viesti, /YouTube-äänen lataus epäonnistui.*SoundCloudista/);
    assert.equal(s.nyt, null);
    assert.equal(s.jono.length, 0);
});

testi("suoran yksityisen tai poistetun YouTube-linkin ääni ei käynnistä SoundCloud-varahakua", async () => {
    for (const stderr of ["ERROR: Private video", "ERROR: This video has been removed by the uploader"]) {
        let varahakuja = 0;
        const { s } = luo({
            luoVirta: async () => {
                throw ytdlp.luoYtdlpVirhe({ stderr });
            },
            haeSoundCloud: async () => {
                varahakuja++;
                return null;
            }
        });

        s.lisaa([k("Suora linkki", { suoraSyote: true })]);
        await aika(10);
        assert.equal(varahakuja, 0);
        s.lopeta();
    }
});

testi("ääniresurssin luontivirhe sulkee virran ja soitto jatkuu seuraavasta", async () => {
    const { s, aani, soitin, loki, tapahtumat } = luo();
    const luoResurssi = aani.createAudioResource;
    let kutsut = 0;
    aani.createAudioResource = (...args) => {
        if (kutsut++ === 0) throw new Error("ffmpeg failure");
        return luoResurssi(...args);
    };

    s.lisaa([k("a"), k("b")]);
    await aika(10);

    assert.equal(loki.suljettu, 1, "epäonnistuneen kappaleen virta suljettiin");
    assert.equal(tapahtumat.filter(t => t.tyyppi === "virhe").length, 1);
    assert.deepEqual(soitin.toistettu.map(x => x.otsikko), ["b"]);
    assert.equal(s.nyt.otsikko, "b");
});

testi("yt-dlp:n puuttuminen tyhjentää jonon eikä yritä jokaista erikseen", async () => {
    const { s, tapahtumat } = luo({ virrat: { heita: "YTDLP_PUUTTUU" } });
    s.lisaa([k("a"), k("b"), k("c")]);
    await aika(10);
    assert.equal(tapahtumat.filter(t => t.tyyppi === "virhe").length, 1);
    assert.equal(s.jono.length, 0);
    assert.equal(s.nyt, null);
});

testi("jonon enimmäiskoko rajaa lisäyksen ja täysi jono kieltäytyy", async () => {
    const { s } = luo();
    const r = s.lisaa(Array.from({ length: 9 }, (_, i) => k("t" + i)));
    assert.equal(r.lisatyt.length, 5);
    assert.equal(r.pudotettu, 4);
    // yksi soi, neljä jonossa -> tilaa vielä 1
    assert.equal(s.lisaa([k("x")]).lisatyt.length, 1);
    assert.throws(() => s.lisaa([k("y")]), /täynnä/);
});

testi("sekoitus säilyttää samat kappaleet", async () => {
    const { s } = luo({ asetukset: { maxJono: 50 } });
    s.lisaa(Array.from({ length: 21 }, (_, i) => k("t" + i)));
    const ennen = [...s.jono].map(x => x.otsikko).sort();
    s.sekoita();
    assert.deepEqual([...s.jono].map(x => x.otsikko).sort(), ennen);
});

testi("tauko pysäyttää ja jatkaa", async () => {
    const { s } = luo();
    assert.equal(s.tauko(), null);
    s.lisaa([k("a")]);
    await aika(5);
    assert.equal(s.tauko(), "tauolla");
    assert.equal(s.nytTiedot().tauolla, true);
    assert.equal(s.tauko(), "jatkuu");
});

testi("samanaikaiset yhdistämiset liittyvät kanavalle vain kerran", async () => {
    const { s, aani } = luo();
    let liittymisia = 0;
    aani.joinVoiceChannel = () => { liittymisia++; return aani.yhteys; };
    aani.entersState = async () => { await aika(10); };
    const kanava = { id: "k1", guild: { id: "g1", voiceAdapterCreator: () => {} } };
    await Promise.all([s.yhdista(kanava), s.yhdista(kanava), s.yhdista(kanava)]);
    assert.equal(liittymisia, 1);
    assert.equal(s.kanavaId, "k1");
    await s.yhdista(kanava);
    assert.equal(liittymisia, 1);
});

testi("lopeta siivoaa kaiken eikä käsittele myöhempiä tapahtumia", async () => {
    const { s, soitin, aani, loki, tapahtumat } = luo();
    s.yhteys = aani.yhteys;
    s.lisaa([k("a"), k("b")]);
    await aika(5);
    s.lopeta();
    soitin.emit("idle"); await aika(5);
    assert.equal(aani.yhteys.tuhottu, true);
    assert.equal(s.jono.length, 0);
    assert.equal(loki.suljettu >= 1, true);
    assert.deepEqual(soitin.toistettu.map(x => x.otsikko), ["a"]);
    assert.equal(tapahtumat.filter(t => t.tyyppi === "virhe").length, 0);
});

testi("ohitus kesken hitaan haun sulkee vanhentuneen virran eikä soita sitä", async () => {
    const { s, soitin, loki } = luo({ virrat: { viive: 20 } });
    s.lisaa([k("a"), k("b")]);
    await aika(2);                 // a:n virtaa vielä haetaan
    s.ohita();                     // ohitetaan ennen kuin a ehti soimaan
    await aika(80);
    assert.deepEqual(soitin.toistettu.map(x => x.otsikko), ["b"]);
    assert.equal(loki.suljettu >= 1, true);
});

testi("tyhjä jono poistuttaa soittimen ajastimella ja ilmoittaa siitä", async () => {
    const { s, soitin, tapahtumat } = luo();
    s.lisaa([k("a")]);
    await aika(5);
    soitin.loppui();
    await aika(80);
    assert.equal(s.lopetettu, true);
    assert.equal(tapahtumat.at(-1).tyyppi, "poistu");
    assert.equal(tapahtumat.at(-1).syy, "jono");
});

testi("yksin kanavalle jääminen poistuttaa ja paluu perii ajastimen", async () => {
    const a = luo();
    a.s.lisaa([k("a")]);
    await aika(5);
    a.s.kanavaMuuttui(0);
    await aika(80);
    assert.equal(a.s.lopetettu, true);
    assert.equal(a.tapahtumat.at(-1).syy, "yksin");

    const b = luo();
    b.s.lisaa([k("a")]);
    await aika(5);
    b.s.kanavaMuuttui(0);
    b.s.kanavaMuuttui(2);
    await aika(80);
    assert.equal(b.s.lopetettu, false);
    b.s.lopeta();
});

testi("kappaleen nimestä poistetaan markdown ja maininnat", () => {
    const { turvallinen } = require("../utils/musiikki/muotoilu");
    const t = turvallinen("**lihava** [linkki](https://x.fi) @everyone <@123>");
    assert.ok(!t.includes("@everyone"));
    assert.ok(!t.includes("<@123>"));
    assert.ok(!/(^|[^\\\\])\*\*/.test(t));
    assert.ok(t.includes("\\["));
});

// ---------------------------------------------------------------------------
// Lähteet
// ---------------------------------------------------------------------------

testi("URL-sallilista hyväksyy sallitut sivut ja alidomainit, hylkää muut", () => {
    const sallitut = ASETUKSET.sallitutSivut;
    assert.equal(lahteet.sallittuIsanta("www.youtube.com", sallitut), true);
    assert.equal(lahteet.sallittuIsanta("music.youtube.com", sallitut), true);
    assert.equal(lahteet.sallittuIsanta("youtu.be", sallitut), true);
    assert.equal(lahteet.sallittuIsanta("artist.bandcamp.com", sallitut), true);
    assert.equal(lahteet.sallittuIsanta("evilyoutube.com", sallitut), false);
    assert.equal(lahteet.sallittuIsanta("youtube.com.evil.fi", sallitut), false);
    assert.equal(lahteet.sallittuIsanta("localhost", sallitut), false);
    assert.equal(lahteet.sallittuIsanta("169.254.169.254", sallitut), false);
});

testi("jasennaUrl hyväksyy vain http(s) ja ohittaa tekstihaut", () => {
    assert.ok(lahteet.jasennaUrl("https://youtu.be/abc"));
    assert.equal(lahteet.jasennaUrl("file:///etc/passwd"), null);
    assert.equal(lahteet.jasennaUrl("--exec rm -rf"), null);
    assert.equal(lahteet.jasennaUrl("jokin kappale"), null);
});

testi("listalinkit tunnistetaan, yksittäiset kappaleet eivät", () => {
    const u = s => new URL(s);
    assert.equal(lahteet.onListaUrl(u("https://www.youtube.com/playlist?list=PL1")), true);
    assert.equal(lahteet.onListaUrl(u("https://www.youtube.com/watch?v=x&list=PL1")), false);
    assert.equal(lahteet.onListaUrl(u("https://soundcloud.com/a/sets/b")), true);
    assert.equal(lahteet.onListaUrl(u("https://soundcloud.com/a/track")), false);
    assert.equal(lahteet.onListaUrl(u("https://x.bandcamp.com/album/y")), true);
});

testi("Spotify-upotuksen JSON:sta poimitaan kappaleet kahdella eri rakenteella ja duplikaatit poistuvat", () => {
    const json = { props: { pageProps: { state: { data: { entity: {
        trackList: [
            { uri: "spotify:track:1", title: "Biisi A", subtitle: "Artisti\u00a0Yksi, Toinen" },
            { uri: "spotify:track:2", title: "Biisi B", subtitle: "Artisti Kaksi" },
            { uri: "spotify:track:1", title: "Biisi A", subtitle: "Artisti Yksi, Toinen" }
        ],
        muu: [{ type: "track", uri: "spotify:track:3", name: "Biisi C", artists: [{ name: "X" }, { name: "Y" }] }]
    } } } } } };
    const tulos = lahteet.keraaSpotifyKappaleet(json);
    assert.equal(tulos.length, 3);
    assert.deepEqual(tulos.map(t => t.otsikko), ["Biisi A", "Biisi B", "Biisi C"]);
    assert.equal(tulos[0].artisti, "Artisti Yksi, Toinen");
    assert.equal(tulos[2].artisti, "X, Y");
});

testi("ytdlpKappale muuntaa yt-dlp:n vastauksen ja suodatus hylkää suorat ja liian pitkät", () => {
    const kap = lahteet.ytdlpKappale({ title: "Hei", uploader: "Kanava", duration: 123.4, webpage_url: "https://www.youtube.com/watch?v=abc", extractor_key: "Youtube", thumbnails: [{ url: "https://i/a.jpg" }] }, { pyytaja: "u", hakulahde: "youtube" });
    assert.equal(kap.kesto, 123);
    assert.equal(kap.lahde, "YouTube");
    assert.equal(kap.suoraSyote, false);
    assert.equal(kap.kuva, "https://i/a.jpg");
    assert.equal(lahteet.ytdlpKappale({ title: "ilman osoitetta" }, { hakulahde: "youtube" }), null);

    const youtubeId = lahteet.ytdlpKappale({ id: "youtube-id", title: "YouTube result", extractor_key: "Youtube" }, { hakulahde: "youtube" });
    assert.equal(youtubeId.url, "https://www.youtube.com/watch?v=youtube-id");

    const soundcloud = lahteet.ytdlpKappale({
        title: "SoundCloud result",
        artists: ["SoundCloud artist"],
        permalink_url: "https://soundcloud.com/artist/track",
        extractor_key: "Soundcloud"
    }, { hakulahde: "soundcloud" });
    assert.equal(soundcloud.url, "https://soundcloud.com/artist/track");
    assert.equal(soundcloud.artisti, "SoundCloud artist");
    assert.equal(soundcloud.kesto, null);
    assert.equal(soundcloud.kuva, null);

    const suora = lahteet.ytdlpKappale({ title: "Live", webpage_url: "https://www.youtube.com/watch?v=l", is_live: true }, { hakulahde: "youtube" });
    const pitka = { ...kap, kesto: 99999 };
    const { kelvolliset, hylatty, hylkaysSyyt } = lahteet.suodata([kap, suora, pitka], ASETUKSET);
    assert.equal(kelvolliset.length, 1);
    assert.equal(hylatty, 2);
    assert.deepEqual(hylkaysSyyt, { suoraLahetys: 1, liianPitka: 1, muu: 0 });
});

testi("haeKappaleet käsittelee yhden YouTube- ja SoundCloud-kappaleen metadataolion", async () => {
    const alkuperainen = ytdlp.tiedot;
    const pyydetyt = [];
    ytdlp.tiedot = async url => {
        pyydetyt.push(url);
        return {
            title: "Yksittäinen kappale",
            webpage_url: url,
            extractor_key: url.includes("soundcloud") ? "Soundcloud" : "Youtube"
        };
    };

    try {
        const youtube = await lahteet.haeKappaleet("https://www.youtube.com/watch?v=one", { pyytaja: "u", asetukset: ASETUKSET });
        const soundcloud = await lahteet.haeKappaleet("https://soundcloud.com/artist/one", { pyytaja: "u", asetukset: ASETUKSET });
        assert.equal(youtube.kappaleet[0].otsikko, "Yksittäinen kappale");
        assert.equal(youtube.kappaleet[0].artisti, null);
        assert.equal(youtube.kappaleet[0].suoraSyote, true);
        assert.equal(soundcloud.kappaleet[0].url, "https://soundcloud.com/artist/one");
        assert.deepEqual(pyydetyt, [
            "https://www.youtube.com/watch?v=one",
            "https://soundcloud.com/artist/one"
        ]);
    } finally {
        ytdlp.tiedot = alkuperainen;
    }
});

testi("hakutulosten järjestys suosii pyytämätöntä remix-versiota alkuperäistä vähemmän", () => {
    const kappaleet = [
        { otsikko: "Song Remix", artisti: "Artist" },
        { otsikko: "Song (Official Audio)", artisti: "Artist" },
        { otsikko: "Song Cover", artisti: "Artist" }
    ];
    const tulokset = lahteet.jarjestaOsumat("Artist Song", kappaleet);
    assert.equal(tulokset[0].otsikko, "Song (Official Audio)");
    assert.equal(tulokset[1].otsikko, "Song Remix");
});

testi("haeKappaleet: tekstihaku käyttää ytsearch/scsearch ja linkit annetaan --erottimen jälkeen yt-dlp:lle", async () => {
    const alkuperainen = ytdlp.tiedot;
    const kutsut = [];
    ytdlp.tiedot = async (kohde, valinnat) => {
        kutsut.push({ kohde, valinnat });
        if (kohde.startsWith("ytsearch5:") || kohde.startsWith("scsearch5:")) {
            return { entries: [{ title: "Löytyi", webpage_url: "https://www.youtube.com/watch?v=q", duration: 60, extractor_key: "Youtube" }] };
        }
        return { entries: [{ title: "L1", webpage_url: "https://youtu.be/1", duration: 60 }, { title: "L2", webpage_url: "https://youtu.be/2", duration: 60 }] };
    };

    try {
        const a = await lahteet.haeKappaleet("  rick   astley ", { pyytaja: "u", asetukset: ASETUKSET });
        assert.equal(a.kappaleet.length, 1);
        assert.equal(kutsut[0].kohde, "ytsearch5:rick astley");
        assert.equal(kutsut.length, 1, "SoundCloudia ei haeta, kun YouTube palauttaa tuloksen");

        await lahteet.haeKappaleet("jokin", { pyytaja: "u", hakulahde: "soundcloud", asetukset: ASETUKSET });
        assert.equal(kutsut[1].kohde, "scsearch5:jokin");

        // hakusana joka näyttää valinnalta ei pääse yt-dlp:n valinnaksi
        await lahteet.haeKappaleet("--exec evil", { pyytaja: "u", asetukset: ASETUKSET });
        assert.equal(kutsut[2].kohde, "ytsearch5:--exec evil");

        const lista = await lahteet.haeKappaleet("https://www.youtube.com/playlist?list=PL1", { pyytaja: "u", asetukset: ASETUKSET });
        assert.equal(lista.kappaleet.length, 2);
        assert.equal(kutsut[3].valinnat.lista, true);

        await assert.rejects(() => lahteet.haeKappaleet("https://example.com/x", { pyytaja: "u", asetukset: ASETUKSET }), /ei ole sallittu/);
        await assert.rejects(() => lahteet.haeKappaleet("http://localhost:8080/", { pyytaja: "u", asetukset: ASETUKSET }), /ei ole sallittu/);
        await assert.rejects(() => lahteet.haeKappaleet("https://user:pw@youtube.com/x", { pyytaja: "u", asetukset: ASETUKSET }), /ei kelpaa/);
        await assert.rejects(() => lahteet.haeKappaleet("x".repeat(500), { pyytaja: "u", asetukset: ASETUKSET }), /liian pitkä/);
        await assert.rejects(() => lahteet.haeKappaleet("   ", { pyytaja: "u", asetukset: ASETUKSET }), /Anna/);
    } finally {
        ytdlp.tiedot = alkuperainen;
    }
});

testi("YouTube-haku yrittää SoundCloudia teknisen virheen tai tyhjän tuloksen jälkeen", async () => {
    const alkuperainen = ytdlp.tiedot;
    const kutsut = [];

    ytdlp.tiedot = async kohde => {
        kutsut.push(kohde);
        if (kohde.startsWith("ytsearch5:")) throw Object.assign(new Error("YTDLP_VIRHE"), { yksityiskohta: "temporary YouTube failure" });
        return { entries: [{ title: "Löytynyt kappale", webpage_url: "https://soundcloud.com/a/kappale", duration: 180, extractor_key: "Soundcloud" }] };
    };

    try {
        const tulos = await lahteet.haeKappaleet("artistin kappale", { pyytaja: "u", asetukset: ASETUKSET });
        assert.deepEqual(kutsut.map(k => k.split(":")[0]), ["ytsearch5", "scsearch5"]);
        assert.equal(kutsut[1], "scsearch5:artistin kappale");
        assert.equal(tulos.lahde, "Soundcloud");
        assert.equal(tulos.kappaleet[0].otsikko, "Löytynyt kappale");
        assert.equal(tulos.valittavat, true);
    } finally {
        ytdlp.tiedot = alkuperainen;
    }

    kutsut.length = 0;
    ytdlp.tiedot = async kohde => {
        kutsut.push(kohde);
        if (kohde.startsWith("ytsearch5:")) return { entries: [] };
        return { entries: [{ title: "Varatuloksen kappale", artists: ["SoundCloud artist"], permalink_url: "https://soundcloud.com/a/varatulos" }] };
    };

    try {
        const tulos = await lahteet.haeKappaleet("toinen kappale", { pyytaja: "u", asetukset: ASETUKSET });
        assert.deepEqual(kutsut.map(k => k.split(":")[0]), ["ytsearch5", "scsearch5"]);
        assert.equal(tulos.kappaleet[0].otsikko, "Varatuloksen kappale");
        assert.equal(tulos.kappaleet[0].artisti, "SoundCloud artist");
    } finally {
        ytdlp.tiedot = alkuperainen;
    }
});

testi("SoundCloud-varahaun lokit laskevat JSONin, muunnokset, suodatukset ja lopputuloksen turvallisesti", async () => {
    const alkuperainenTiedot = ytdlp.tiedot;
    const alkuperainenInfo = console.info;
    const lokit = [];
    const hakuteksti = "ei-saa-nakya-lokeissa";
    const soundcloudUrl = "https://soundcloud.com/private-artist/private-track";

    ytdlp.tiedot = async kohde => {
        if (kohde.startsWith("ytsearch5:")) return { entries: [] };
        assert.equal(kohde, `scsearch5:${hakuteksti}`);
        return {
            entries: [
                { title: "Kelvollinen", permalink_url: soundcloudUrl, duration: 120, extractor_key: "Soundcloud" },
                { title: "Puuttuva URL" },
                { title: "Liian pitkä", permalink_url: `${soundcloudUrl}-long`, duration: 601, extractor_key: "Soundcloud" },
                { title: "Suora lähetys", permalink_url: `${soundcloudUrl}-live`, duration: 120, is_live: true, extractor_key: "Soundcloud" }
            ]
        };
    };
    console.info = viesti => lokit.push(String(viesti));

    try {
        const tulos = await lahteet.haeKappaleet(hakuteksti, {
            pyytaja: "u",
            hakulahde: "youtube",
            asetukset: ASETUKSET
        });
        assert.equal(tulos.lahde, "Soundcloud");
        assert.equal(tulos.kappaleet.length, 1);

        const rivit = lokit.map(teksti => JSON.parse(teksti.slice("[musiikki-haku] ".length)));
        const varahaku = rivit.find(rivi => rivi.vaihe === "varahaku-alkoi");
        const soundcloudTulos = rivit.find(rivi => rivi.vaihe === "lahde-valmis" && rivi.lahde === "soundcloud");
        const lopputulos = rivit.find(rivi => rivi.vaihe === "haku-valmis");

        assert.equal(varahaku.lahde, "soundcloud");
        assert.equal(soundcloudTulos.exitCode, 0);
        assert.equal(soundcloudTulos.jsonPalautui, true);
        assert.equal(soundcloudTulos.jsonRakenne, "entries");
        assert.equal(soundcloudTulos.entriesMaara, 4);
        assert.equal(soundcloudTulos.metadataTietueita, 4);
        assert.equal(soundcloudTulos.kappaleiksiMuunnettu, 3);
        assert.equal(soundcloudTulos.muunnoksessaHylatty, 1);
        assert.equal(soundcloudTulos.suodatuksenJalkeen, 1);
        assert.equal(soundcloudTulos.suodatusHylatty, 2);
        assert.deepEqual(soundcloudTulos.hylkaysSyyt, { suoraLahetys: 1, liianPitka: 1, muu: 0 });
        assert.equal(soundcloudTulos.lopullinenTulos, "tuloksia");
        assert.equal(lopputulos.lopullinenTulos, "tuloksia");
        assert.equal(lopputulos.tuloksia, 1);

        const kaikkiLokit = lokit.join("\n");
        assert.equal(kaikkiLokit.includes(hakuteksti), false);
        assert.equal(kaikkiLokit.includes(soundcloudUrl), false);
        assert.equal(kaikkiLokit.includes("Kelvollinen"), false);
        assert.equal(kaikkiLokit.includes("Puuttuva URL"), false);
    } finally {
        ytdlp.tiedot = alkuperainenTiedot;
        console.info = alkuperainenInfo;
    }
});

testi("odottamaton ohjelmointivirhe ei peity varahaun yleiseksi virheeksi", async () => {
    const alkuperainen = ytdlp.tiedot;
    const virhe = new TypeError("unexpected data shape");
    let kutsuja = 0;
    ytdlp.tiedot = async () => {
        kutsuja++;
        throw virhe;
    };

    try {
        await assert.rejects(
            () => lahteet.haeKappaleet("artistin kappale", { pyytaja: "u", asetukset: ASETUKSET }),
            err => err === virhe
        );
        assert.equal(kutsuja, 1, "odottamatonta virhettä ei käsitellä SoundCloud-haun tavoin");
    } finally {
        ytdlp.tiedot = alkuperainen;
    }
});

testi("suora yksityinen tai poistettu linkki ei käynnistä SoundCloud-varahakua", async () => {
    const alkuperainen = ytdlp.tiedot;
    let kutsuja = 0;
    ytdlp.tiedot = async () => {
        kutsuja++;
        const virhe = new Error("YTDLP_VIRHE");
        virhe.yksityiskohta = "ERROR: Private video";
        throw virhe;
    };

    try {
        await assert.rejects(
            () => lahteet.haeKappaleet("https://www.youtube.com/watch?v=private", { pyytaja: "u", asetukset: ASETUKSET }),
            /yksityinen/
        );
        assert.equal(kutsuja, 1);
    } finally {
        ytdlp.tiedot = alkuperainen;
    }

    ytdlp.tiedot = async () => {
        kutsuja++;
        const virhe = new Error("YTDLP_VIRHE");
        virhe.yksityiskohta = "ERROR: Video unavailable";
        throw virhe;
    };

    try {
        await assert.rejects(
            () => lahteet.haeKappaleet("https://www.youtube.com/watch?v=deleted", { pyytaja: "u", asetukset: ASETUKSET }),
            /ei ole saatavilla/
        );
        assert.equal(kutsuja, 2);

        ytdlp.tiedot = async () => {
            kutsuja++;
            const virhe = new Error("YTDLP_VIRHE");
            virhe.yksityiskohta = "ERROR: This video has been removed by the uploader";
            throw virhe;
        };
        await assert.rejects(
            () => lahteet.haeKappaleet("https://www.youtube.com/watch?v=removed", { pyytaja: "u", asetukset: ASETUKSET }),
            /poistettu/
        );
        assert.equal(kutsuja, 3);
    } finally {
        ytdlp.tiedot = alkuperainen;
    }
});

testi("suoran linkin tarkoitukselliset pääsyrajoitukset estävät SoundCloud-korvauksen", () => {
    const rajoitetut = [
        "ERROR: This video is private",
        "ERROR: This video has been removed by the uploader",
        "ERROR: Video unavailable",
        "ERROR: This video is geo-restricted",
        "ERROR: This video is age-restricted",
        "ERROR: HTTP Error 403: Forbidden"
    ];
    for (const stderr of rajoitetut) {
        assert.equal(
            lahteet.onTarkoituksellaSaavuttamaton(ytdlp.luoYtdlpVirhe({ stderr })),
            true,
            `${stderr} estää varahaun`
        );
    }

    for (const stderr of [
        "Sign in to confirm you’re not a bot",
        "ERROR: HTTP Error 429: Too Many Requests",
        "ERROR: Connection reset by peer"
    ]) {
        assert.equal(
            lahteet.onTarkoituksellaSaavuttamaton(ytdlp.luoYtdlpVirhe({ stderr })),
            false,
            `${stderr} sallii teknisen varahaun`
        );
    }
});

testi("suoran YouTube-linkin metatietojen kirjautumisvirhe varmistetaan SoundCloud-haulla", async () => {
    const alkuperainen = ytdlp.tiedot;
    const kutsut = [];
    ytdlp.tiedot = async kohde => {
        kutsut.push(kohde);
        if (kohde.startsWith("https://")) {
            throw Object.assign(new Error("YTDLP_VIRHE"), {
                stderr: "Sign in to confirm you’re not a bot"
            });
        }
        return {
            entries: [{
                title: "Löytynyt SoundCloudista",
                permalink_url: "https://soundcloud.com/testi/loytynyt",
                extractor_key: "Soundcloud"
            }]
        };
    };

    try {
        const syote = "https://www.youtube.com/watch?v=video123&artist=Testi&title=Kappale";
        const tulos = await lahteet.haeKappaleet(syote, {
            pyytaja: "u",
            asetukset: ASETUKSET
        });
        assert.deepEqual(kutsut, [syote, "scsearch5:Testi Kappale"]);
        assert.equal(tulos.lahde, "Soundcloud");
        assert.equal(tulos.kappaleet[0].otsikko, "Löytynyt SoundCloudista");
        assert.equal(tulos.kappaleet[0].suoraSyote, false);
        assert.equal(tulos.valittavat, true);
    } finally {
        ytdlp.tiedot = alkuperainen;
    }
});

testi("suora YouTube-linkki ilman kappaleen nimeä ei hae SoundCloudia videon tunnisteella", async () => {
    const alkuperainen = ytdlp.tiedot;
    const kutsut = [];
    ytdlp.tiedot = async kohde => {
        kutsut.push(kohde);
        throw Object.assign(new Error("YTDLP_VIRHE"), {
            stderr: "Sign in to confirm you’re not a bot"
        });
    };

    try {
        await assert.rejects(
            () => lahteet.haeKappaleet("https://www.youtube.com/watch?v=video123", {
                pyytaja: "u",
                asetukset: ASETUKSET
            }),
            /SoundCloud-varahaku tarvitsee kappaleen nimen/
        );
        assert.deepEqual(kutsut, ["https://www.youtube.com/watch?v=video123"]);
        assert.equal(kutsut.some(kohde => kohde.startsWith("scsearch5:")), false);
    } finally {
        ytdlp.tiedot = alkuperainen;
    }
});

testi("suoran YouTube-linkin tyhjä SoundCloud-tulos ilmoittaa, ettei kappaletta löytynyt", async () => {
    const alkuperainen = ytdlp.tiedot;
    const kutsut = [];
    ytdlp.tiedot = async kohde => {
        kutsut.push(kohde);
        if (kohde.startsWith("https://")) {
            throw Object.assign(new Error("YTDLP_VIRHE"), {
                stderr: "Sign in to confirm you’re not a bot"
            });
        }
        return { entries: [] };
    };

    try {
        await assert.rejects(
            () => lahteet.haeKappaleet("https://www.youtube.com/watch?v=id&artist=Artist&title=Song", {
                pyytaja: "u",
                asetukset: ASETUKSET
            }),
            /eikä vastaavaa kappaletta löytynyt SoundCloudista/
        );
        assert.deepEqual(kutsut, [
            "https://www.youtube.com/watch?v=id&artist=Artist&title=Song",
            "scsearch5:Artist Song"
        ]);
    } finally {
        ytdlp.tiedot = alkuperainen;
    }
});

testi("haeKappaleet: Spotify-linkki muuttuu hakukappaleiksi, joille ei ole suoraa osoitetta", async () => {
    const alkuperainen = global.fetch;
    const html = `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ a: { trackList: [{ uri: "spotify:track:1", title: "Eka", subtitle: "Esittäjä" }, { uri: "spotify:track:2", title: "Toka", subtitle: "Toinen" }] } })}</script></html>`;
    global.fetch = async () => ({ ok: true, text: async () => html, json: async () => ({}) });

    try {
        const r = await lahteet.haeKappaleet("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=x", { pyytaja: "u", hakulahde: "soundcloud", asetukset: ASETUKSET });
        assert.equal(r.lahde, "Spotify");
        assert.equal(r.kappaleet.length, 2);
        assert.equal(r.kappaleet[0].url, null);
        assert.equal(lahteet.hakulause(r.kappaleet[0]), "scsearch1:Esittäjä Eka");

        await assert.rejects(() => lahteet.haeKappaleet("https://open.spotify.com/artist/abcdefghij1234", { pyytaja: "u", asetukset: ASETUKSET }), /kappale, albumi tai soittolista/);

        global.fetch = async () => { throw new Error("verkko"); };
        await assert.rejects(() => lahteet.haeKappaleet("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC", { pyytaja: "u", asetukset: ASETUKSET }), /Kirjoita kappaleen nimi/);
    } finally {
        global.fetch = alkuperainen;
    }
});

testi("yt-dlp-virheet muutetaan käyttäjäystävällisiksi viesteiksi", async () => {
    const alkuperainen = ytdlp.tiedot;
    let kutsuja = 0;
    const kokeileHakusanaa = async err => {
        kutsuja = 0;
        ytdlp.tiedot = async () => { kutsuja++; throw err; };
        try { await lahteet.haeKappaleet("jotain", { pyytaja: "u", asetukset: ASETUKSET }); } catch (e) { return e; }
    };

    try {
        const puuttuu = await kokeileHakusanaa(new Error("YTDLP_PUUTTUU"));
        assert.ok(puuttuu instanceof lahteet.MusiikkiVirhe);
        assert.match(puuttuu.message, /yt-dlp/);
        assert.equal(kutsuja, 1, "puuttuvaa yt-dlp-ohjelmaa ei etsitä kahdesti eri lähteille");

        const tekninen = Object.assign(new Error("YTDLP_VIRHE"), { yksityiskohta: "temporary network error" });
        assert.match((await kokeileHakusanaa(tekninen)).message, /YouTube- ja SoundCloud-haku epäonnistuivat/);
        assert.equal(kutsuja, 2);

        assert.match((await kokeileHakusanaa(new Error("YTDLP_AIKAKATKAISU"))).message, /YouTube- ja SoundCloud-haku epäonnistuivat/);
        assert.equal(kutsuja, 2);

        kutsuja = 0;
        ytdlp.tiedot = async () => { kutsuja++; return { entries: [] }; };
        await assert.rejects(
            () => lahteet.haeKappaleet("ei-osumaa", { pyytaja: "u", asetukset: ASETUKSET }),
            /ei löytynyt YouTubesta eikä SoundCloudista/
        );
        assert.equal(kutsuja, 2);

        ytdlp.tiedot = async () => {
            throw Object.assign(new Error("YTDLP_VIRHE"), { yksityiskohta: "ERROR: This video is unavailable" });
        };
        await assert.rejects(
            () => lahteet.haeKappaleet("https://www.youtube.com/watch?v=unavailable", { pyytaja: "u", asetukset: ASETUKSET }),
            /ei ole saatavilla/
        );

        ytdlp.tiedot = async () => {
            throw Object.assign(new Error("YTDLP_VIRHE"), { yksityiskohta: "ERROR: Private video" });
        };
        await assert.rejects(
            () => lahteet.haeKappaleet("https://www.youtube.com/watch?v=private", { pyytaja: "u", asetukset: ASETUKSET }),
            /yksityinen/
        );

        const tunnistetutVirheet = [
            ["ERROR: Requested format is not available", /soittokelpoista ääntä/],
            ["ERROR: Video is not available in your country", /tällä alueella/],
            ["ERROR: HTTP Error 403: Forbidden", /esti pyynnön/],
            ["ERROR: Unable to download webpage: timed out", /Yhteys musiikin lähteeseen/]
        ];
        for (const [yksityiskohta, odotus] of tunnistetutVirheet) {
            ytdlp.tiedot = async () => {
                throw Object.assign(new Error("YTDLP_VIRHE"), { yksityiskohta });
            };
            await assert.rejects(
                () => lahteet.haeKappaleet("https://soundcloud.com/artist/track", { pyytaja: "u", asetukset: ASETUKSET }),
                odotus
            );
        }
    } finally {
        ytdlp.tiedot = alkuperainen;
    }
});

testi("SoundCloudin yt-dlp-virheet luokitellaan ilman stderr-raakatekstiä", () => {
    const tapaukset = [
        ["ERROR: yt-dlp: unrecognized arguments: --bad-option", "luokittelematon", "yt-dlp palautti luokittelemattoman virhetekstin", "komentorivi-argumentti"],
        ["ERROR: No supported JavaScript runtime found; EJS challenge solving failed", "luokittelematon", "yt-dlp palautti luokittelemattoman virhetekstin", "javascript-runtime-ejs"],
        ["ERROR: Unsupported URL: ytsearch5:sample query", "luokittelematon", "yt-dlp palautti luokittelemattoman virhetekstin", "hakuextractor"],
        ["ERROR: Cookies are invalid or expired", "luokittelematon", "yt-dlp palautti luokittelemattoman virhetekstin", "evaste-kirjautuminen"],
        ["ERROR: HTTP Error 500: Internal Server Error", "luokittelematon", "yt-dlp palautti luokittelemattoman virhetekstin", "verkko-http"],
        ["ERROR: Sign in to confirm your account", "kirjautuminen", "lähde edellyttää kirjautumista", "evaste-kirjautuminen"],
        ["ERROR: HTTP Error 403: Forbidden", "kayttooikeusrajoitus", "lähde esti sisällön käytön", "verkko-http"],
        ["ERROR: This track is private", "yksityinen", "sisältö on yksityinen", "tuntematon"],
        ["ERROR: This track has been removed", "poistettu", "sisältö on poistettu", "tuntematon"],
        ["ERROR: HTTP Error 429: Too Many Requests", "rate-limit", "lähde rajoitti pyyntöjen määrää", "verkko-http"],
        ["ERROR: Connection reset by peer", "verkko", "yhteys lähteeseen epäonnistui", "verkko-http"],
        ["ERROR: [soundcloud] track-id-987 https://soundcloud.com/artist/track?token=secret", "luokittelematon", "yt-dlp palautti luokittelemattoman virhetekstin", "tuntematon"]
    ];

    for (const [stderr, luokka, kuvaus, tyyppi] of tapaukset) {
        const diagnostiikka = ytdlp.stderrDiagnostiikka(stderr);
        assert.deepEqual(diagnostiikka, { stderrLuokka: luokka, stderrKuvaus: kuvaus, diagnostiikkaTyyppi: tyyppi });
        const tuloste = JSON.stringify(diagnostiikka);
        assert.equal(tuloste.includes(stderr), false, "raaka stderr ei päädy luokittelun tulokseen");
        assert.equal(tuloste.includes("track-id-987"), false);
        assert.equal(tuloste.includes("secret"), false);
    }
});

testi("suoran linkin yt-dlp-virhe ilman kappaleen nimeä ilmoitetaan turvallisesti", async () => {
    const alkuperainenTiedot = ytdlp.tiedot;
    const alkuperainenInfo = console.info;
    const lokit = [];
    let kutsuja = 0;
    const syy = new Error("source request rejected token=cause-secret");
    const virhe = ytdlp.luoYtdlpVirhe({
        vaihe: "metadata-process-exit",
        exitCode: 2,
        stderr: 'ERROR: source failure https://user:pass@youtube.com/watch?v=secret-id&token=url-secret token=inline-secret --cookies "C:\\private\\cookies.txt" YTDLP_PROXY=proxy-secret',
        cause: syy,
        syy: syy.message
    });

    ytdlp.tiedot = async () => {
        kutsuja++;
        throw virhe;
    };
    console.info = viesti => lokit.push(String(viesti));

    try {
        assert.equal(virhe.cause, syy, "yt-dlp-virhe säilyttää alkuperäisen syyn");
        await assert.rejects(
            () => lahteet.haeKappaleet("https://www.youtube.com/watch?v=video-id", { pyytaja: "u", asetukset: ASETUKSET }),
            err => {
                assert.match(err.message, /SoundCloud-varahaku tarvitsee kappaleen nimen/);
                return true;
            }
        );
        assert.equal(kutsuja, 1, "SoundCloudia ei haeta ilman kappaleen nimeä");

        const virherivi = lokit.find(teksti => teksti.includes('"vaihe":"linkki-virhe"'));
        assert.ok(virherivi, "suoran linkin diagnostinen virherivi löytyi");
        const rivi = JSON.parse(virherivi.slice("[musiikki-haku] ".length));
        assert.equal(rivi.syote, "linkki");
        assert.equal(rivi.hakutapa, "suora-linkki");
        assert.equal(rivi.lahde, "YouTube");
        assert.equal(rivi.vaihe, "linkki-virhe");
        assert.equal(rivi.virheenVaihe, "metadata-process-exit");
        assert.equal(rivi.virheluokka, "yt-dlp-virhe");
        assert.equal(rivi.exitCode, 2);
        assert.equal(rivi.stderrLuokka, "luokittelematon");
        assert.equal(rivi.stderrKuvaus, "yt-dlp palautti luokittelemattoman virhetekstin");
        assert.equal(rivi.diagnostiikkaTyyppi, "tuntematon");
        assert.ok(Number.isFinite(rivi.kestoMs) && rivi.kestoMs >= 0);
        assert.equal("stderr" in rivi, false, "raaka stderr ei päädy lokiin");
        for (const salaisuus of ["user:pass", "secret-id", "url-secret", "inline-secret", "cookies.txt", "proxy-secret", "cause-secret"]) {
            assert.equal(JSON.stringify(rivi).includes(salaisuus), false, `loki ei saa sisältää arvoa ${salaisuus}`);
        }
    } finally {
        ytdlp.tiedot = alkuperainenTiedot;
        console.info = alkuperainenInfo;
    }
});

testi("tekstihaku lokittaa YouTube- ja SoundCloud-virheet erikseen ja jatkaa seuraavaan hakuun", async () => {
    const alkuperainenTiedot = ytdlp.tiedot;
    const alkuperainenInfo = console.info;
    const lokit = [];
    const youtubeSyy = new Error("YouTube vaatii kirjautumisen");
    const soundcloudSyy = new Error("SoundCloud esti pyynnön");
    const youtubeVirhe = ytdlp.luoYtdlpVirhe({
        vaihe: "metadata-process-exit",
        exitCode: 17,
        stderr: "ERROR: [youtube] dQw4w9WgXcQ: Sign in to confirm you're not a bot https://youtube.com/watch?v=dQw4w9WgXcQ&token=video-secret",
        cause: youtubeSyy
    });
    const soundcloudVirhe = ytdlp.luoYtdlpVirhe({
        vaihe: "metadata-process-exit",
        exitCode: 23,
        stderr: "ERROR: [soundcloud] artist-track-987: HTTP Error 403: Forbidden cookie=track-secret",
        cause: soundcloudSyy
    });
    const pyydetyt = [];

    ytdlp.tiedot = async haku => {
        pyydetyt.push(haku);
        if (haku.startsWith("ytsearch5:ensimmainen")) throw youtubeVirhe;
        if (haku.startsWith("scsearch5:ensimmainen")) throw soundcloudVirhe;
        return {
            entries: [{
                title: "Löytynyt seuraavalla haulla",
                webpage_url: "https://www.youtube.com/watch?v=ok",
                extractor_key: "Youtube",
                duration: 120
            }]
        };
    };
    console.info = viesti => lokit.push(String(viesti));

    try {
        assert.equal(youtubeVirhe.cause, youtubeSyy);
        assert.equal(soundcloudVirhe.cause, soundcloudSyy);
        await assert.rejects(
            () => lahteet.haeKappaleet("ensimmainen kappale", { pyytaja: "u", asetukset: ASETUKSET }),
            /YouTube- ja SoundCloud-haku epäonnistuivat/
        );

        const virherivit = lokit
            .filter(teksti => teksti.includes('"vaihe":"lahde-virhe"'))
            .map(teksti => JSON.parse(teksti.slice("[musiikki-haku] ".length)));
        assert.equal(virherivit.length, 2);
        assert.equal(virherivit[0].hakuId, virherivit[1].hakuId);
        assert.ok(virherivit.every(rivi => rivi.hakutapa === "hakusana"));
        assert.deepEqual(virherivit.map(rivi => rivi.lahde), ["YouTube", "SoundCloud"]);
        assert.deepEqual(virherivit.map(rivi => rivi.exitCode), [17, 23]);
        assert.deepEqual(virherivit.map(rivi => rivi.stderrLuokka), ["kirjautuminen", "kayttooikeusrajoitus"]);
        assert.deepEqual(virherivit.map(rivi => rivi.diagnostiikkaTyyppi), ["evaste-kirjautuminen", "verkko-http"]);
        assert.ok(virherivit.every(rivi => Number.isFinite(rivi.kestoMs) && rivi.kestoMs >= 0));
        assert.ok(virherivit.every(rivi => rivi.virheenVaihe === "metadata-process-exit"));
        assert.ok(virherivit.every(rivi => !("stderr" in rivi)));

        const tulos = await lahteet.haeKappaleet("toinen erillinen haku", { pyytaja: "u", asetukset: ASETUKSET });
        assert.equal(tulos.kappaleet[0].otsikko, "Löytynyt seuraavalla haulla");
        assert.equal(pyydetyt.length, 3);
        assert.deepEqual(pyydetyt.map(haku => haku.split(":")[0]), ["ytsearch5", "scsearch5", "ytsearch5"]);

        const kaikkiLokit = lokit.join("\n");
        for (const salaisuus of ["ensimmainen kappale", "dQw4w9WgXcQ", "video-secret", "artist-track-987", "track-secret"]) {
            assert.equal(kaikkiLokit.includes(salaisuus), false, `lokissa ei saa näkyä arvoa ${salaisuus}`);
        }
    } finally {
        ytdlp.tiedot = alkuperainenTiedot;
        console.info = alkuperainenInfo;
    }
});

// ---------------------------------------------------------------------------
// Komennot koko ketjun läpi (vaatii discord.js:n)
// ---------------------------------------------------------------------------

let discordSaatavilla = true;
try { require.resolve("discord.js"); } catch { discordSaatavilla = false; }

function komentoTesti(nimi, fn) {
    if (!discordSaatavilla) return;
    testi(`komennot: ${nimi}`, fn);
}

/** Rakentaa feikkiympäristön: äänikirjasto, yt-dlp ja interaktiot. */
function komentoYmparisto() {
    const config = require("../utils/musiikki/config");
    const soitinModuuli = require("../utils/musiikki/soitin");
    const aani = feikkiAani();
    config.asetaAaniKirjastoTestia(aani);

    const alkuperaiset = { tiedot: ytdlp.tiedot, virta: ytdlp.virta };
    ytdlp.tiedot = async kohde => ({ entries: [{ title: `Haku: ${kohde}`, webpage_url: "https://www.youtube.com/watch?v=" + encodeURIComponent(kohde.slice(0, 8)), duration: 200, extractor_key: "Youtube" }] });
    ytdlp.virta = async () => ({ stream: new PassThrough(), tavuja: () => 100, virhe: () => "", sulje: () => {} });

    const lahetetyt = [];
    const tekstikanava = { send: async viesti => { lahetetyt.push(viesti); } };
    const kanava = (id) => ({ id, guild: null, toString: () => `<#${id}>`, permissionsFor: () => ({ has: () => true }), members: new Map() });
    const vc1 = kanava("vc1");
    const vc2 = kanava("vc2");
    const guild = { id: "g1", members: { me: { id: "bot" } }, channels: { cache: new Map([["vc1", vc1], ["vc2", vc2]]) }, voiceAdapterCreator: () => {} };
    vc1.guild = guild; vc2.guild = guild;

    const interaktio = ({ kanavaId = "vc1", valinnat = {} } = {}) => {
        const vastaukset = [];
        const i = {
            guildId: "g1", guild, channel: tekstikanava, user: { id: "u1" },
            member: { voice: { channelId: kanavaId, channel: kanavaId === "vc1" ? vc1 : kanavaId === "vc2" ? vc2 : null } },
            options: { getString: n => valinnat[n] ?? null },
            deferred: false, replied: false, deferCalls: 0, vastaukset,
            inGuild: () => true,
            reply: async v => { i.replied = true; vastaukset.push({ tyyppi: "reply", v }); },
            deferReply: async () => { i.deferred = true; i.deferCalls++; },
            editReply: async v => { vastaukset.push({ tyyppi: "editReply", v }); },
            fetchReply: async () => ({
                createMessageComponentCollector: asetukset => {
                    const kerain = new EventEmitter();
                    setImmediate(() => {
                        const viimeisin = vastaukset.filter(v => v.tyyppi === "editReply").at(-1)?.v;
                        const komponentti = viimeisin?.components?.[0]?.components?.[0];
                        const valinta = {
                            customId: komponentti?.data?.custom_id,
                            values: [String(valinnat.valinta ?? 0)],
                            user: { id: "u1" },
                            deferUpdate: async () => {}
                        };
                        if (asetukset.filter(valinta)) {
                            kerain.emit("collect", valinta);
                            kerain.emit("end", new Map([[valinta.customId, valinta]]), "limit");
                        }
                    });
                    return kerain;
                }
            })
        };
        if (kanavaId === null) i.member.voice = { channelId: null, channel: null };
        return i;
    };

    const komento = nimi => require(`../commands/musiikki/${nimi}.js`);
    const siivoa = () => {
        ytdlp.tiedot = alkuperaiset.tiedot;
        ytdlp.virta = alkuperaiset.virta;
        soitinModuuli.haeSoitin("g1")?.lopeta();
        config.asetaAaniKirjastoTestia(null);
    };

    return { aani, lahetetyt, interaktio, komento, siivoa, soitinModuuli };
}

const teksti = v => (typeof v === "string" ? v : v?.content ?? "");

komentoTesti("/soita kuittaa interactionin ennen hakua", async () => {
    const y = komentoYmparisto();
    const alkuperainenInfo = console.info;
    let kuittausTehty = false;
    let lokiEnnenKuittausta = false;
    try {
        const i = y.interaktio({ valinnat: { haku: "testi" } });
        const jarjestys = [];
        const alkuperainenTiedot = ytdlp.tiedot;
        const alkuperainenDefer = i.deferReply;
        console.info = (...args) => {
            if (!kuittausTehty && String(args[0]).startsWith("[interaction-timing]")) lokiEnnenKuittausta = true;
        };
        i.deferReply = async (...args) => {
            jarjestys.push("kuittaus");
            const vastaus = await alkuperainenDefer(...args);
            kuittausTehty = true;
            return vastaus;
        };
        ytdlp.tiedot = async (...args) => {
            jarjestys.push("haku");
            assert.equal(i.deferred, true, "interaction pitää kuitata ennen hakua");
            assert.equal(i.deferCalls, 1, "interaction kuitataan vain kerran");
            return alkuperainenTiedot(...args);
        };

        await y.komento("soita").execute(i);
        assert.deepEqual(jarjestys, ["kuittaus", "haku"]);
        assert.equal(lokiEnnenKuittausta, false, "ajoituslokien tulostus ei saa viivästyttää kuittausta");
    } finally {
        console.info = alkuperainenInfo;
        y.siivoa();
    }
});

komentoTesti("/soita defer-virheen loki ei sisällä raakaa virhettä", async () => {
    const y = komentoYmparisto();
    const vanhaDiagnostiikka = process.env.SOITA_REST_DIAGNOSTIIKKA;
    const alkuperainenInfo = console.info;
    const alkuperainenWarn = console.warn;
    const lokit = [];

    process.env.SOITA_REST_DIAGNOSTIIKKA = "used";
    console.info = (...args) => lokit.push(args);
    console.warn = (...args) => lokit.push(args);
    try {
        const i = y.interaktio();
        i.deferReply = async () => {
            throw Object.assign(new Error("sensitive-error-message"), {
                status: 404,
                code: 10062,
                rawError: { message: "sensitive-response-body" },
                url: "https://discord.test/interactions/id/sensitive-token/callback",
                requestBody: { json: { token: "sensitive-request-body" } }
            });
        };

        await assert.rejects(y.komento("soita").execute(i), err => err.code === 10062);
        await new Promise(resolve => setImmediate(resolve));

        const lokiteksti = JSON.stringify(lokit);
        for (const salaisuus of [
            "sensitive-error-message",
            "sensitive-response-body",
            "sensitive-token",
            "sensitive-request-body"
        ]) {
            assert.equal(lokiteksti.includes(salaisuus), false, `${salaisuus} ei päädy lokiin`);
        }
        const deferVirheLoki = lokit.find(args => String(args[0]).startsWith("[deferReply-error] "));
        assert.ok(deferVirheLoki, "deferReply-virhe kirjataan");
        assert.deepEqual(JSON.parse(String(deferVirheLoki[0]).slice("[deferReply-error] ".length)), {
            stage: "await",
            httpStatus: 404,
            discordCode: 10062
        });
    } finally {
        console.info = alkuperainenInfo;
        console.warn = alkuperainenWarn;
        if (vanhaDiagnostiikka === undefined) delete process.env.SOITA_REST_DIAGNOSTIIKKA;
        else process.env.SOITA_REST_DIAGNOSTIIKKA = vanhaDiagnostiikka;
        y.siivoa();
    }
});

komentoTesti("vanhentunut interaction ei käynnistä uutta virhevastausta", async () => {
    const tapahtuma = require("../events/interactionCreate");
    const virheet = [];
    const varoitukset = [];
    const alkuperainenVirhe = console.error;
    const alkuperainenVaroitus = console.warn;
    let vastausyrityksia = 0;
    const i = {
        id: "expired-soita",
        commandName: "soita",
        deferred: false,
        replied: false,
        isChatInputCommand: () => true,
        deferReply: async () => {
            throw Object.assign(new Error("Unknown interaction"), {
                code: 10062,
                url: "https://discord.test/interactions/id/interaction-token-secret/callback"
            });
        },
        reply: async () => { vastausyrityksia++; },
        editReply: async () => { vastausyrityksia++; },
        followUp: async () => { vastausyrityksia++; }
    };

    console.error = (...args) => virheet.push(args);
    console.warn = (...args) => varoitukset.push(args);
    try {
        await tapahtuma.execute(i, { commands: new Map([["soita", { execute: async interaction => interaction.deferReply() }]]) });
        assert.equal(vastausyrityksia, 0);
        assert.equal(virheet.length, 1, "alkuperäinen interaction-virhe kirjataan");
        assert.equal(JSON.stringify(virheet).includes("interaction-token-secret"), false, "interaction-token ei päädy lokiin");
        assert.equal(varoitukset.length, 1, "uudelleenyrityksen ohitus kirjataan");
    } finally {
        console.error = alkuperainenVirhe;
        console.warn = alkuperainenVaroitus;
    }
});

komentoTesti("virhevastaus kirjaa vanhentuneen interactionin ilman toista yritystä", async () => {
    const tapahtuma = require("../events/interactionCreate");
    const virheet = [];
    const varoitukset = [];
    const alkuperainenVirhe = console.error;
    const alkuperainenVaroitus = console.warn;
    let vastausyrityksia = 0;
    const i = {
        id: "expired-unknown-command",
        commandName: "poistettu",
        deferred: false,
        replied: false,
        isChatInputCommand: () => true,
        reply: async () => {
            vastausyrityksia++;
            throw Object.assign(new Error("Unknown interaction"), { code: 10062 });
        }
    };

    console.error = (...args) => virheet.push(args);
    console.warn = (...args) => varoitukset.push(args);
    try {
        await tapahtuma.execute(i, { commands: new Map() });
        assert.equal(vastausyrityksia, 1, "vanhentuneeseen interactioniin tehdään vain yksi yritys");
        assert.equal(virheet.length, 0, "tunnettu vanhentumistilanne ei näy yleisenä virheenä");
        assert.equal(varoitukset.length, 2, "tuntematon komento ja vanhentunut interaction kirjataan");
        assert.match(String(varoitukset.at(-1)[0]), /vanheni/);
    } finally {
        console.error = alkuperainenVirhe;
        console.warn = alkuperainenVaroitus;
    }
});

komentoTesti("/soita ilman äänikanavaa kieltäytyy yksityisesti", async () => {
    const y = komentoYmparisto();
    try {
        const i = y.interaktio({ kanavaId: null, valinnat: { haku: "testi" } });
        await y.komento("soita").execute(i);
        assert.equal(i.deferred, true);
        const vastaus = i.vastaukset.find(v => v.tyyppi === "editReply").v;
        assert.equal(vastaus.ephemeral, undefined);
        assert.match(teksti(vastaus), /äänikanava|Liity|kanava/i);
        assert.equal(y.soitinModuuli.haeSoitin("g1"), null);
    } finally { y.siivoa(); }
});

komentoTesti("/soita hakee kappaleen, liittyy kanavalle, aloittaa soiton ja ilmoittaa kanavalle", async () => {
    const y = komentoYmparisto();
    try {
        const i = y.interaktio({ valinnat: { haku: "rick astley" } });
        await y.komento("soita").execute(i);
        assert.equal(i.deferred, true);
        const vastaus = i.vastaukset.find(v => v.tyyppi === "editReply").v;
        assert.ok(vastaus.embeds?.length === 1, "vastauksen pitäisi olla embed");

        const soitin = y.soitinModuuli.haeSoitin("g1");
        assert.ok(soitin);
        assert.equal(soitin.kanavaId, "vc1");
        assert.equal(soitin.nyt.otsikko, "Haku: ytsearch5:rick astley");
        await aika(5);
        assert.equal(y.lahetetyt.length >= 1, true, "Nyt soi -ilmoituksen pitäisi mennä tekstikanavalle");
        assert.deepEqual(y.lahetetyt[0].allowedMentions, { parse: [] });
    } finally { y.siivoa(); }
});

komentoTesti("/soita näyttää hakutulokset ja soittaa käyttäjän valitseman version", async () => {
    const y = komentoYmparisto();
    try {
        ytdlp.tiedot = async () => ({
            entries: [
                { title: "Song Remix", artist: "Artist", webpage_url: "https://www.youtube.com/watch?v=remix", duration: 180 },
                { title: "Song (Official Audio)", artist: "Artist", webpage_url: "https://www.youtube.com/watch?v=original", duration: 200 },
                { title: "Song Cover", artist: "Artist", webpage_url: "https://www.youtube.com/watch?v=cover", duration: 190 }
            ]
        });

        const i = y.interaktio({ valinnat: { haku: "Artist Song", valinta: 1 } });
        await y.komento("soita").execute(i);
        const hakutulosviesti = i.vastaukset.find(v => v.tyyppi === "editReply" && v.v.components?.length)?.v;
        const vaihtoehdot = hakutulosviesti.components[0].components[0].toJSON().options;
        assert.equal(vaihtoehdot.length, 3);
        assert.match(vaihtoehdot[0].label, /Official Audio/);
        assert.equal(y.soitinModuuli.haeSoitin("g1").nyt.otsikko, "Song Remix");
    } finally { y.siivoa(); }
});

komentoTesti("toisella kanavalla oleva käyttäjä ei voi ohjata eikä kaapata soittoa", async () => {
    const y = komentoYmparisto();
    try {
        await y.komento("soita").execute(y.interaktio({ valinnat: { haku: "yksi" } }));

        const toinen = y.interaktio({ kanavaId: "vc2", valinnat: { haku: "kaksi" } });
        await y.komento("soita").execute(toinen);
        const vastaus = toinen.vastaukset.find(v => v.tyyppi === "editReply").v;
        assert.equal(vastaus.ephemeral, undefined);
        assert.match(teksti(vastaus), /vc1/);

        const ohita = y.interaktio({ kanavaId: "vc2" });
        await y.komento("ohita").execute(ohita);
        assert.equal(ohita.vastaukset[0].v.ephemeral, true);
        assert.equal(y.soitinModuuli.haeSoitin("g1").nyt.otsikko, "Haku: ytsearch5:yksi");

        // katselu onnistuu ilman samaa kanavaa
        const jono = y.interaktio({ kanavaId: "vc2" });
        await y.komento("jono").execute(jono);
        assert.ok(jono.vastaukset[0].v.embeds);
    } finally { y.siivoa(); }
});

komentoTesti("/soita haku toimii uudelleen lopetuksen jälkeen useita kertoja", async () => {
    const y = komentoYmparisto();
    try {
        for (let kierros = 0; kierros < 3; kierros++) {
            const i = y.interaktio({ valinnat: { haku: `kappale ${kierros}` } });
            await y.komento("soita").execute(i);
            const soitin = y.soitinModuuli.haeSoitin("g1");
            assert.ok(soitin, `soitin syntyi kierroksella ${kierros + 1}`);
            assert.match(soitin.nyt.otsikko, new RegExp(`kappale ${kierros}`));
            await aika(5);

            await y.komento("lopeta").execute(y.interaktio());
            assert.equal(y.soitinModuuli.haeSoitin("g1"), null, `soitin poistui kierroksella ${kierros + 1}`);
        }
    } finally { y.siivoa(); }
});

komentoTesti("/soita toimii uudelleen epäonnistuneen äänivirran jälkeen", async () => {
    const y = komentoYmparisto();
    try {
        let virtaKutsut = 0;
        ytdlp.virta = async () => {
            if (virtaKutsut++ === 1) throw Object.assign(new Error("spawn ENOENT"), { code: "ENOENT" });
            return { stream: new PassThrough(), tavuja: () => 100, virhe: () => "", sulje: () => {} };
        };

        await y.komento("soita").execute(y.interaktio({ valinnat: { haku: "onnistuva" } }));
        await aika(10);
        const soitin = y.soitinModuuli.haeSoitin("g1");
        assert.ok(soitin);
        assert.equal(soitin.nyt.otsikko, "Haku: ytsearch5:onnistuva");

        soitin.soitin.loppui();
        await aika(10);
        assert.equal(soitin.nyt, null, "onnistunut kappale päättyi normaalisti");

        await y.komento("soita").execute(y.interaktio({ valinnat: { haku: "epäonnistuva" } }));
        await aika(10);
        assert.equal(soitin.nyt, null, "epäonnistunut toinen virta siivosi kappaleen");

        await y.komento("soita").execute(y.interaktio({ valinnat: { haku: "seuraava" } }));
        await aika(10);
        assert.equal(soitin.nyt.otsikko, "Haku: ytsearch5:seuraava");
        assert.equal(virtaKutsut, 3);
    } finally { y.siivoa(); }
});

komentoTesti("jono, nyt, tauko, toisto, sekoita, ohita ja lopeta toimivat ketjuna", async () => {
    const y = komentoYmparisto();
    try {
        for (const haku of ["eka", "toka", "kolmas"]) await y.komento("soita").execute(y.interaktio({ valinnat: { haku } }));
        const soitin = y.soitinModuuli.haeSoitin("g1");
        assert.equal(soitin.jono.length, 2);

        const nyt = y.interaktio(); await y.komento("nyt").execute(nyt);
        assert.ok(nyt.vastaukset[0].v.embeds);

        const tauko = y.interaktio(); await y.komento("tauko").execute(tauko);
        assert.equal(soitin.nytTiedot().tauolla, true);
        await y.komento("tauko").execute(y.interaktio());
        assert.equal(soitin.nytTiedot().tauolla, false);

        await y.komento("toisto").execute(y.interaktio({ valinnat: { tila: "jono" } }));
        assert.equal(soitin.silmukka, "jono");

        const sekoita = y.interaktio(); await y.komento("sekoita").execute(sekoita);
        assert.equal(soitin.jono.length, 2);

        const ohita = y.interaktio(); await y.komento("ohita").execute(ohita);
        assert.match(teksti(ohita.vastaukset[0].v), /eka/);
        await aika(5);
        assert.equal(soitin.nyt.otsikko === "Haku: ytsearch5:eka", false);

        const lopeta = y.interaktio(); await y.komento("lopeta").execute(lopeta);
        assert.equal(y.soitinModuuli.haeSoitin("g1"), null);
        assert.equal(y.aani.yhteys.tuhottu, true);

        const tyhja = y.interaktio(); await y.komento("jono").execute(tyhja);
        assert.equal(tyhja.vastaukset[0].v.ephemeral, true);
    } finally { y.siivoa(); }
});

komentoTesti("/soita ilmoittaa yt-dlp:n puuttumisesta eikä jätä soitinta roikkumaan", async () => {
    const y = komentoYmparisto();
    try {
        ytdlp.tiedot = async () => { throw new Error("YTDLP_PUUTTUU"); };
        const i = y.interaktio({ valinnat: { haku: "testi" } });
        await y.komento("soita").execute(i);
        assert.match(teksti(i.vastaukset.find(v => v.tyyppi === "editReply").v), /yt-dlp/);
        assert.equal(y.soitinModuuli.haeSoitin("g1"), null);
    } finally { y.siivoa(); }
});

komentoTesti("kanavalle liittymisen epäonnistuminen siivoaa tyhjän soittimen", async () => {
    const y = komentoYmparisto();
    try {
        y.aani.entersState = async () => { throw new Error("aikakatkaisu"); };
        const i = y.interaktio({ valinnat: { haku: "testi" } });
        await y.komento("soita").execute(i);
        assert.match(teksti(i.vastaukset.find(v => v.tyyppi === "editReply").v), /liittyminen/i);
        assert.equal(y.soitinModuuli.haeSoitin("g1"), null);
    } finally { y.siivoa(); }
});

komentoTesti("äänitapahtumat: botin katkaisu siivoaa soittimen, yksinjäänti käynnistää ajastimen", async () => {
    const y = komentoYmparisto();
    try {
        await y.komento("soita").execute(y.interaktio({ valinnat: { haku: "testi" } }));
        const soitin = y.soitinModuuli.haeSoitin("g1");
        const tapahtuma = require("../events/musiikkiAaniTapahtuma.js");
        const guild = { id: "g1", channels: { cache: new Map([["vc1", { members: new Map() }]]) } };
        const client = { user: { id: "bot" } };

        // viimeinen ihminen lähtee -> ajastin
        await tapahtuma.execute({ id: "u1", guild }, { id: "u1", guild, channelId: null }, client);
        assert.ok(soitin.ajastinYksin);

        // botti itse katkaistaan -> soitin pois
        await tapahtuma.execute({ id: "bot", guild, channelId: "vc1" }, { id: "bot", guild, channelId: null }, client);
        assert.equal(y.soitinModuuli.haeSoitin("g1"), null);

        // tapahtuma palvelimella jossa ei soi mitään ei tee mitään
        await tapahtuma.execute({ id: "u1", guild }, { id: "u1", guild, channelId: null }, client);
    } finally { y.siivoa(); }
});

// ---------------------------------------------------------------------------
// Ajo
// ---------------------------------------------------------------------------

(async () => {
    let virheita = 0;

    for (const [nimi, fn] of testit) {
        try {
            await fn();
            console.log(`✅ ${nimi}`);
        } catch (err) {
            virheita++;
            console.log(`❌ ${nimi}\n   ${String(err.stack ?? err).split("\n").slice(0, 4).join("\n   ")}`);
        }
    }

    if (!discordSaatavilla) console.log("\n(Komentotestit ohitettiin: discord.js ei ole asennettu.)");
    console.log(`\n${testit.length - virheita}/${testit.length} testiä läpi.`);
    process.exit(virheita ? 1 : 0);
})();
