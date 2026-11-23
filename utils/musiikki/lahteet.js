/**
 * Muuttaa käyttäjän syötteen (hakusana tai linkki) soittolistaksi.
 *
 * - tekstihaku       -> YouTube (ytsearch); tyhjä tai teknisesti epäonnistunut haku varmistetaan SoundCloudista
 * - YouTube/SoundCloud/Bandcamp/... -linkki -> yt-dlp lukee tiedot
 * - Spotify-linkki   -> luetaan vain kappaleiden NIMET; ääni haetaan haulla
 *                       YouTubesta/SoundCloudista (Spotifyn omaa ääntä ei voi soittaa)
 */

const { randomUUID } = require("node:crypto");
const ytdlp = require("./ytdlp");

class MusiikkiVirhe extends Error {
    /** Virhe jonka viesti saa näyttää käyttäjälle sellaisenaan. */
    constructor(viesti) {
        super(viesti);
        this.name = "MusiikkiVirhe";
    }
}

const HAKU_MAX_PITUUS = 200;
const HAKU_TULOSTEN_MAARA = 5;
const SPOTIFY_RE = /\/(?:intl-[a-z-]+\/)?(track|album|playlist)\/([A-Za-z0-9]{10,32})/;
const VERSIO_TERMIT = ["cover", "remix", "live", "lyrics", "lyric", "karaoke", "instrumental", "sped up", "slowed", "nightcore", "8d"];
const YTDLP_HAKUVIRHEET = new Set(["YTDLP_PUUTTUU", "YTDLP_AIKAKATKAISU", "YTDLP_VIRHE"]);
const PROSESSIN_HAKUVIRHEET = new Set(["ENOENT", "EACCES", "EPERM", "ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "EPIPE"]);

function lokitaHaku(hakuId, vaihe, tiedot = {}) {
    console.info(`[musiikki-haku] ${JSON.stringify({ hakuId, vaihe, ...tiedot })}`);
}

function hakuteksti(teksti) {
    return String(teksti)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function osumaPisteet(kysely, kappale) {
    const siistiKysely = hakuteksti(kysely);
    const otsikko = hakuteksti(kappale.otsikko);
    const artisti = hakuteksti(kappale.artisti ?? "");
    const kaikkiSanat = new Set(`${otsikko} ${artisti}`.split(/\s+/).filter(Boolean));
    const kyselynSanat = siistiKysely.split(/\s+/).filter(Boolean);
    const osumat = kyselynSanat.filter(sana => kaikkiSanat.has(sana)).length;
    let pisteet = kyselynSanat.length ? (osumat / kyselynSanat.length) * 10 : 0;

    if (otsikko === siistiKysely) pisteet += 4;
    if (otsikko.includes(siistiKysely) && siistiKysely) pisteet += 2;
    if (/\boriginal\b/.test(otsikko)) pisteet += 1;
    if (/\bofficial (audio|video)\b|\btopic\b/.test(otsikko)) pisteet += 0.5;

    for (const termi of VERSIO_TERMIT) {
        const osumatermi = hakuteksti(termi);
        const otsikossa = ` ${otsikko} `.includes(` ${osumatermi} `);
        const pyydetty = ` ${siistiKysely} `.includes(` ${osumatermi} `);
        if (otsikossa && !pyydetty) pisteet -= 2;
    }

    return pisteet;
}

function jarjestaOsumat(kysely, kappaleet) {
    return kappaleet
        .map((kappale, indeksi) => ({ kappale, indeksi, pisteet: osumaPisteet(kysely, kappale) }))
        .sort((a, b) => b.pisteet - a.pisteet || a.indeksi - b.indeksi)
        .map(osuma => osuma.kappale);
}

function virheenLuokka(err) {
    if (err?.message === "YTDLP_PUUTTUU") return "yt-dlp-puuttuu";
    if (err?.message === "YTDLP_AIKAKATKAISU") return "aikakatkaisu";
    if (err?.message === "YTDLP_VIRHE") return "yt-dlp-virhe";
    if (PROSESSIN_HAKUVIRHEET.has(err?.code)) return `prosessi-${err.code.toLowerCase()}`;
    return "odottamaton-virhe";
}

function lahteenNimi(url) {
    const host = url.hostname.toLowerCase();
    if (host === "soundcloud.com" || host.endsWith(".soundcloud.com")) return "SoundCloud";
    if (host === "youtu.be" || host === "youtube.com" || host.endsWith(".youtube.com")) return "YouTube";
    return "muu";
}

function youtubeHakuavain(url, alkuperainenSyote) {
    if (url.hostname.toLowerCase() === "youtu.be") {
        const id = url.pathname.split("/").filter(Boolean)[0];
        if (id) return id;
    }

    const id = url.searchParams.get("v") ??
        url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/i)?.[1];
    return id || alkuperainenSyote.slice(0, HAKU_MAX_PITUUS);
}

function ytdlpDiagnostiikka(err) {
    const sallitutVaiheet = new Set([
        "metadata-timeout",
        "metadata-spawn",
        "metadata-process-exit",
        "metadata-output-limit",
        "metadata-json-parse"
    ]);
    const vaihe = sallitutVaiheet.has(err?.vaihe) ? err.vaihe : "metadata-unknown";

    return {
        virheenVaihe: vaihe,
        virheluokka: virheenLuokka(err),
        exitCode: Number.isInteger(err?.exitCode) ? err.exitCode : null,
        ...ytdlp.stderrDiagnostiikka(err?.stderr ?? err?.yksityiskohta)
    };
}

function onTunnettuHakuvirhe(err) {
    return YTDLP_HAKUVIRHEET.has(err?.message) || PROSESSIN_HAKUVIRHEET.has(err?.code);
}

function ytDlpEiKaynnisty(err) {
    return err?.message === "YTDLP_PUUTTUU" || ["ENOENT", "EACCES", "EPERM"].includes(err?.code);
}

async function haeTekstiLahteesta(teksti, { pyytaja, lahde, asetukset, hakuId }) {
    const alku = Date.now();
    const etuliite = lahde === "soundcloud" ? "scsearch" : "ytsearch";
    const tapahtuma = `${etuliite}${HAKU_TULOSTEN_MAARA}:${teksti.replace(/\s+/g, " ")}`;
    let jsonPalautui = false;
    let jsonRakenne = null;
    let entriesMaara = null;
    let metadataTietueita = 0;
    let kappaleiksiMuunnettu = 0;
    let muunnoksessaHylatty = 0;
    let suodatustulos = null;
    let exitCode = null;

    lokitaHaku(hakuId, "lahde-alkoi", { lahde });

    try {
        const data = await ytdlp.tiedot(tapahtuma, { lista: true, max: HAKU_TULOSTEN_MAARA });
        jsonPalautui = true;
        exitCode = 0;
        jsonRakenne = Array.isArray(data?.entries) ? "entries" : "yksittainen-tietue";
        entriesMaara = Array.isArray(data?.entries) ? data.entries.length : 0;
        const tietueetListassa = tietueet(data);
        metadataTietueita = tietueetListassa.length;
        const kaikki = tietueetListassa
            .map(e => ytdlpKappale(e, { pyytaja, hakulahde: lahde }))
            .filter(Boolean);
        kappaleiksiMuunnettu = kaikki.length;
        muunnoksessaHylatty = metadataTietueita - kappaleiksiMuunnettu;
        suodatustulos = suodata(kaikki, asetukset);
        const { kelvolliset, hylatty, hylkaysSyyt } = suodatustulos;
        const kappaleet = jarjestaOsumat(teksti, kelvolliset).slice(0, HAKU_TULOSTEN_MAARA);

        lokitaHaku(hakuId, "lahde-valmis", {
            lahde,
            exitCode,
            jsonPalautui,
            jsonRakenne,
            entriesMaara,
            metadataTietueita,
            kappaleiksiMuunnettu,
            muunnoksessaHylatty,
            suodatuksenJalkeen: kelvolliset.length,
            hylatty,
            suodatusHylatty: hylatty,
            hylkaysSyyt,
            tuloksia: kelvolliset.length,
            palautettujaTuloksia: kappaleet.length,
            lopullinenTulos: kappaleet.length ? "tuloksia" : "ei-tuloksia",
            kestoMs: Date.now() - alku
        });

        return { kappaleet, hylatty };
    } catch (err) {
        lokitaHaku(hakuId, "lahde-virhe", {
            syote: "hakusana",
            hakutapa: "hakusana",
            lahde: lahde === "soundcloud" ? "SoundCloud" : "YouTube",
            ...ytdlpDiagnostiikka(err),
            exitCode: exitCode ?? (Number.isInteger(err?.exitCode) ? err.exitCode : null),
            jsonPalautui,
            jsonRakenne,
            entriesMaara,
            metadataTietueita,
            kappaleiksiMuunnettu,
            muunnoksessaHylatty,
            suodatusHylatty: suodatustulos?.hylatty ?? 0,
            hylkaysSyyt: suodatustulos?.hylkaysSyyt ?? null,
            lopullinenTulos: "virhe",
            kestoMs: Date.now() - alku
        });
        throw err;
    }
}

function hakuVirhe(epaonnistumiset, lahteet) {
    if (epaonnistumiset.every(t => t.virhe === "yt-dlp-puuttuu")) {
        return new MusiikkiVirhe("Musiikin hakupalvelu ei ole käytettävissä: yt-dlp puuttuu palvelimelta.");
    }

    const nimet = lahteet.map(lahde => lahde === "soundcloud" ? "SoundCloud" : "YouTube");

    if (epaonnistumiset.every(t => t.tulos === "ei-tuloksia")) {
        if (epaonnistumiset.some(t => t.hylatty > 0)) {
            return new MusiikkiVirhe("Hakutulokset olivat suoria lähetyksiä tai liian pitkiä. Kokeile toista hakusanaa.");
        }
        return new MusiikkiVirhe(nimet.length === 2
            ? "Kappaletta ei löytynyt YouTubesta eikä SoundCloudista. Kokeile tarkempaa hakusanaa."
            : `Kappaletta ei löytynyt ${lahteet[0] === "soundcloud" ? "SoundCloudista" : "YouTubesta"}. Kokeile tarkempaa hakusanaa.`);
    }

    return new MusiikkiVirhe(nimet.length === 2
        ? "YouTube- ja SoundCloud-haku epäonnistuivat tällä kertaa. Yritä myöhemmin uudelleen tai kokeile toista hakusanaa."
        : `${nimet[0]}-haku epäonnistui tällä kertaa. Yritä myöhemmin uudelleen.`);
}

// ---------------------------------------------------------------------------
// Syötteen tulkinta
// ---------------------------------------------------------------------------

/** Palauttaa URL-olion jos syöte on http(s)-linkki, muuten null. */
function jasennaUrl(syote) {
    if (!/^https?:\/\//i.test(syote.trim())) return null;
    try {
        return new URL(syote.trim());
    } catch {
        return null;
    }
}

function sallittuIsanta(host, sallitut) {
    const h = host.toLowerCase();
    return sallitut.some(s => h === s || h.endsWith(`.${s}`));
}

/** Onko linkki kokonainen soittolista/albumi (ei yksittäinen kappale)? */
function onListaUrl(url) {
    const host = url.hostname.toLowerCase();
    const polku = url.pathname.toLowerCase();

    if (host.endsWith("youtube.com")) return polku === "/playlist";
    if (host.endsWith("soundcloud.com")) return polku.includes("/sets/");
    if (host.endsWith("bandcamp.com")) return polku.startsWith("/album/");
    return false;
}

// ---------------------------------------------------------------------------
// Kappale-olion muodostus
// ---------------------------------------------------------------------------

function siivoa(teksti, max = 150) {
    return String(teksti ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function tietueet(data) {
    if (Array.isArray(data?.entries)) return data.entries.filter(Boolean);
    return data && typeof data === "object" ? [data] : [];
}

/**
 * @typedef {object} Kappale
 * @property {string} otsikko
 * @property {string|null} artisti
 * @property {number|null} kesto       sekunteina
 * @property {string|null} url         suora sivu (null = haetaan hakusanalla)
 * @property {string|null} kuva
 * @property {string} lahde            näytettävä lähde (YouTube, SoundCloud, Spotify...)
 * @property {string} hakulahde        mihin haetaan jos url puuttuu (youtube | soundcloud)
 * @property {string|null} pyytaja     käyttäjän id
 * @property {boolean} suoraSyote      käyttäjä antoi lähdelinkin suoraan
 */

function ytdlpKappale(e, { pyytaja, hakulahde, suoraSyote = false }) {
    const url = [e.webpage_url, e.permalink_url, e.url]
        .find(u => typeof u === "string" && /^https?:\/\//.test(u))
        ?? (/youtube/i.test(String(e.ie_key ?? e.extractor_key ?? "")) && e.id
            ? `https://www.youtube.com/watch?v=${e.id}`
            : null);

    if (!url) return null;

    const kuvat = Array.isArray(e.thumbnails) ? e.thumbnails : [];
    const kuva = e.thumbnail ?? kuvat.at(-1)?.url ?? null;
    const lahde = siivoa(e.extractor_key ?? e.ie_key ?? "", 30).replace(/Youtube/i, "YouTube") || "Verkko";
    const otsikko = [e.track, e.title].find(arvo => typeof arvo === "string" && arvo.trim()) ?? "Tuntematon kappale";
    const artisti = [
        e.artist,
        ...(Array.isArray(e.artists) ? e.artists : []),
        e.uploader,
        e.channel
    ].find(arvo => typeof arvo === "string" && arvo.trim());

    return {
        otsikko: siivoa(otsikko),
        artisti: siivoa(artisti ?? "", 80) || null,
        kesto: Number.isFinite(e.duration) ? Math.round(e.duration) : null,
        url,
        kuva: typeof kuva === "string" ? kuva : null,
        lahde,
        hakulahde,
        pyytaja: pyytaja ?? null,
        suoraSyote,
        suora: Boolean(e.is_live || e.live_status === "is_live")
    };
}

/** Poistaa liian pitkät ja suorat lähetykset (ne soisivat loputtomiin). */
function suodata(kappaleet, asetukset) {
    let hylatty = 0;
    const hylkaysSyyt = { suoraLahetys: 0, liianPitka: 0, muu: 0 };

    const kelvolliset = kappaleet.filter(k => {
        const kelpaa = !k.suora && (k.kesto === null || k.kesto <= asetukset.maxKestoS);
        if (!kelpaa) {
            hylatty++;
            if (k.suora) hylkaysSyyt.suoraLahetys++;
            else if (typeof k.kesto === "number" && k.kesto > asetukset.maxKestoS) hylkaysSyyt.liianPitka++;
            else hylkaysSyyt.muu++;
        }
        return kelpaa;
    });

    return { kelvolliset, hylatty, hylkaysSyyt };
}

// ---------------------------------------------------------------------------
// Spotify (vain metatiedot)
// ---------------------------------------------------------------------------

/**
 * Kokoaa Spotifyn upotussivun JSON:sta kappaleiden nimet ja esittäjät.
 * Rakenne muuttuu aika ajoin, joten haku on tahallaan väljä: etsitään
 * kaikki oliot jotka näyttävät kappaleilta.
 */
function keraaSpotifyKappaleet(juuri) {
    const tulos = [];
    const nahty = new Set();
    const pino = [juuri];
    let kayty = 0;

    const lisaa = (otsikko, artisti, id) => {
        const t = siivoa(otsikko);
        const a = siivoa(artisti, 100);
        if (!t) return;
        const avain = id ?? `${a}|${t}`.toLowerCase();
        if (nahty.has(avain)) return;
        nahty.add(avain);
        tulos.push({ otsikko: t, artisti: a || null });
    };

    while (pino.length && kayty++ < 50_000) {
        const o = pino.pop();
        if (!o || typeof o !== "object") continue;

        if (Array.isArray(o)) {
            for (let i = o.length - 1; i >= 0; i--) pino.push(o[i]);
            continue;
        }

        const uri = typeof o.uri === "string" ? o.uri : "";

        if (uri.startsWith("spotify:track:") && typeof o.title === "string") {
            lisaa(o.title, typeof o.subtitle === "string" ? o.subtitle : "", uri);
        } else if ((o.type === "track" || uri.startsWith("spotify:track:")) && typeof o.name === "string" && Array.isArray(o.artists)) {
            lisaa(o.name, o.artists.map(a => a?.name).filter(Boolean).join(", "), uri || null);
        }

        // Käänteinen järjestys, jotta pinosta otetaan kentät alkuperäisessä
        // järjestyksessä (soittolistan kappalejärjestys säilyy).
        const arvot = Object.values(o);
        for (let i = arvot.length - 1; i >= 0; i--) {
            if (arvot[i] && typeof arvot[i] === "object") pino.push(arvot[i]);
        }
    }

    return tulos;
}

async function haeSpotifyKappaleet(url, max) {
    const osuma = url.pathname.match(SPOTIFY_RE);

    if (!osuma) {
        throw new MusiikkiVirhe("Spotify-linkin pitää olla kappale, albumi tai soittolista.");
    }

    const [, tyyppi, id] = osuma;
    const otsikot = { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36", "accept-language": "en-US,en;q=0.9" };

    try {
        const res = await fetch(`https://open.spotify.com/embed/${tyyppi}/${id}`, { headers: otsikot, signal: AbortSignal.timeout(15_000) });
        const html = await res.text();
        const json = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)?.[1];

        if (json) {
            const kappaleet = keraaSpotifyKappaleet(JSON.parse(json));
            if (kappaleet.length) return kappaleet.slice(0, max);
        }
    } catch {
        // kokeillaan varakeinoa
    }

    // Varakeino: oEmbed antaa kappaleelle ainakin nimen.
    if (tyyppi === "track") {
        try {
            const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url.origin + url.pathname)}`, { headers: otsikot, signal: AbortSignal.timeout(15_000) });
            const data = await res.json();
            if (data?.title) return [{ otsikko: siivoa(data.title), artisti: null }];
        } catch {
            // ei onnistunut
        }
    }

    throw new MusiikkiVirhe("Spotify-linkin tietoja ei saatu luettua. Kirjoita kappaleen nimi hakuun, niin komitea etsii sen.");
}

// ---------------------------------------------------------------------------
// Päärajapinta
// ---------------------------------------------------------------------------

/**
 * @param {string} syote
 * @param {{ pyytaja: string, hakulahde?: string, asetukset: object }} valinnat
 * @returns {Promise<{ kappaleet: Kappale[], hylatty: number, lahde: string }>}
 */
async function haeKappaleet(syote, { pyytaja, hakulahde, asetukset }) {
    const teksti = String(syote ?? "").trim();
    if (!teksti) throw new MusiikkiVirhe("Anna kappaleen nimi tai linkki.");

    const haku = hakulahde ?? asetukset.oletusHakulahde;
    const url = jasennaUrl(teksti);

    // --- Linkki ---
    if (url) {
        const hakuId = randomUUID();
        lokitaHaku(hakuId, "haku-alkoi", { syote: "linkki" });

        if (url.username || url.password) throw new MusiikkiVirhe("Linkki ei kelpaa.");
        if (!sallittuIsanta(url.hostname, asetukset.sallitutSivut)) {
            throw new MusiikkiVirhe(
                `Sivustoa ${url.hostname} ei ole sallittu. Tuetut: ${asetukset.sallitutSivut.join(", ")}.`
            );
        }

        // Spotify: vain nimet, ääni haetaan muualta
        if (url.hostname.toLowerCase().endsWith("spotify.com")) {
            const nimet = await haeSpotifyKappaleet(url, asetukset.maxLista);

            const kappaleet = nimet.map(n => ({
                otsikko: n.otsikko,
                artisti: n.artisti,
                kesto: null,
                url: null,
                kuva: null,
                lahde: "Spotify",
                hakulahde: haku,
                pyytaja,
                suoraSyote: false,
                suora: false
            }));

            return { kappaleet, hylatty: 0, lahde: "Spotify" };
        }

        const lista = onListaUrl(url);
        let data;
        const alku = Date.now();
        try {
            data = await ytdlp.tiedot(url.href, { lista, max: asetukset.maxLista });
        } catch (err) {
            const lahde = lahteenNimi(url);
            const stderrLuokka = ytdlp.stderrDiagnostiikka(err?.stderr ?? err?.yksityiskohta).stderrLuokka;
            lokitaHaku(hakuId, "linkki-virhe", {
                syote: "linkki",
                hakutapa: "suora-linkki",
                lahde,
                ...ytdlpDiagnostiikka(err),
                kestoMs: Date.now() - alku
            });

            if (
                lahde === "YouTube" &&
                !["yksityinen", "poistettu", "ei-saatavilla"].includes(stderrLuokka) &&
                onTunnettuHakuvirhe(err) &&
                !ytDlpEiKaynnisty(err)
            ) {
                lokitaHaku(hakuId, "varahaku-alkoi", {
                    lahde: "soundcloud",
                    syy: stderrLuokka
                });

                try {
                    const varahaku = await haeTekstiLahteesta(
                        youtubeHakuavain(url, teksti),
                        { pyytaja, lahde: "soundcloud", asetukset, hakuId }
                    );
                    if (varahaku.kappaleet.length) {
                        lokitaHaku(hakuId, "haku-valmis", {
                            lahde: "soundcloud",
                            tuloksia: varahaku.kappaleet.length,
                            lopullinenTulos: "tuloksia"
                        });
                        return {
                            kappaleet: varahaku.kappaleet,
                            hylatty: varahaku.hylatty,
                            lahde: varahaku.kappaleet[0].lahde,
                            valittavat: true,
                            hakuId
                        };
                    }
                } catch (soundCloudVirhe) {
                    if (!onTunnettuHakuvirhe(soundCloudVirhe)) throw soundCloudVirhe;
                }

                lokitaHaku(hakuId, "varahaku-epaonnistui", {
                    lahde: "soundcloud",
                    lopullinenTulos: "ei-tuloksia"
                });
                throw new MusiikkiVirhe(
                    "YouTube-linkin tietoja ei saatu haettua, eikä vastaavaa kappaletta löytynyt SoundCloudista. Kokeile kappaleen nimeä."
                );
            }

            throw muunnettuYtdlpVirhe(err);
        }
        const kaikki = tietueet(data).map(e => ytdlpKappale(e, {
            pyytaja,
            hakulahde: haku,
            suoraSyote: true
        })).filter(Boolean);
        const { kelvolliset, hylatty } = suodata(kaikki, asetukset);
        lokitaHaku(hakuId, "linkki-valmis", { tuloksia: kelvolliset.length, hylatty });

        return { kappaleet: kelvolliset.slice(0, asetukset.maxLista), hylatty, lahde: kelvolliset[0]?.lahde ?? "Verkko" };
    }

    // --- Tekstihaku ---
    if (teksti.length > HAKU_MAX_PITUUS) {
        throw new MusiikkiVirhe(`Hakusana on liian pitkä (max ${HAKU_MAX_PITUUS} merkkiä).`);
    }

    const hakuId = randomUUID();
    const haettavatLahteet = haku === "youtube" ? ["youtube", "soundcloud"] : [haku];
    const epaonnistumiset = [];
    const haetytLahteet = [];

    lokitaHaku(hakuId, "haku-alkoi", { syote: "hakusana", ensisijainenLahde: haettavatLahteet[0] });

    for (let i = 0; i < haettavatLahteet.length; i++) {
        const lahde = haettavatLahteet[i];

        if (i > 0) {
            lokitaHaku(hakuId, "varahaku-alkoi", {
                lahde,
                syy: epaonnistumiset[epaonnistumiset.length - 1].tulos ?? epaonnistumiset[epaonnistumiset.length - 1].virhe
            });
        }

        haetytLahteet.push(lahde);
        try {
            const tulos = await haeTekstiLahteesta(teksti, { pyytaja, lahde, asetukset, hakuId });
            if (tulos.kappaleet.length) {
                lokitaHaku(hakuId, "haku-valmis", {
                    lahde,
                    tuloksia: tulos.kappaleet.length,
                    lopullinenTulos: "tuloksia"
                });
                return {
                    kappaleet: tulos.kappaleet,
                    hylatty: tulos.hylatty,
                    lahde: tulos.kappaleet[0].lahde,
                    valittavat: true,
                    hakuId
                };
            }

            epaonnistumiset.push({ tulos: "ei-tuloksia", hylatty: tulos.hylatty });
        } catch (err) {
            if (!onTunnettuHakuvirhe(err)) throw err;
            epaonnistumiset.push({ virhe: virheenLuokka(err) });
            if (i + 1 < haettavatLahteet.length && ytDlpEiKaynnisty(err)) {
                lokitaHaku(hakuId, "varahaku-ohitettiin", { lahde: haettavatLahteet[i + 1], syy: virheenLuokka(err) });
                break;
            }
        }
    }

    lokitaHaku(hakuId, "haku-epäonnistui", {
        lahteet: haetytLahteet,
        tulokset: epaonnistumiset.map(t => t.tulos ?? t.virhe),
        lopullinenTulos: epaonnistumiset.every(t => t.tulos === "ei-tuloksia") ? "ei-tuloksia" : "virhe"
    });
    throw hakuVirhe(epaonnistumiset, haetytLahteet);
}

/** Muuttaa yt-dlp:n sisäiset virheet käyttäjälle sopiviksi. */
function muunnettuYtdlpVirhe(err) {
    if (err instanceof MusiikkiVirhe) return err;
    if (err?.message === "YTDLP_PUUTTUU") {
        return new MusiikkiVirhe("yt-dlp-ohjelmaa ei löytynyt palvelimelta, joten musiikkia ei voi hakea vielä.");
    }
    if (err?.message === "YTDLP_AIKAKATKAISU") {
        return new MusiikkiVirhe("Haku kesti liian kauan. Yritä hetken päästä uudelleen.");
    }
    if (err?.message === "YTDLP_VIRHE") {
        const k = (err.yksityiskohta ?? "").toLowerCase();
        if (k.includes("sign in") || k.includes("not a bot")) {
            return new MusiikkiVirhe("YouTube esti haun palvelimelta (kirjautumisvaatimus). Ylläpito voi lisätä evästeet (YTDLP_COOKIES) tai kokeilla SoundCloud-hakua.");
        }
        if (/private (video|track)|this (video|track) is private/.test(k)) {
            return new MusiikkiVirhe("Kappale on yksityinen eikä sitä voi soittaa.");
        }
        if (/removed by the uploader|(?:video|track) has been removed|has been deleted/.test(k)) {
            return new MusiikkiVirhe("Kappale on poistettu eikä sitä voi soittaa.");
        }
        if (/geo.?restricted|not available in your (country|region)|country is blocked/.test(k)) {
            return new MusiikkiVirhe("Kappale ei ole saatavilla tällä alueella.");
        }
        if (/age.?restricted|confirm your age/.test(k)) {
            return new MusiikkiVirhe("Kappaleen ikärajoitus estää sen hakemisen.");
        }
        if (/requested format is not available|no video formats found|no formats found/.test(k)) {
            return new MusiikkiVirhe("Lähde ei tarjoa tälle kappaleelle soittokelpoista ääntä. Kokeile toista versiota.");
        }
        if (/http error 401|http error 403|forbidden|authentication required|login required/.test(k)) {
            return new MusiikkiVirhe("Musiikin lähde esti pyynnön tai vaatii kirjautumisen. Kokeile myöhemmin tai toista versiota.");
        }
        if (/timed out|timeout|temporary failure|connection reset|unable to download webpage|network is unreachable|name resolution/.test(k)) {
            return new MusiikkiVirhe("Yhteys musiikin lähteeseen epäonnistui. Yritä myöhemmin uudelleen.");
        }
        if (k.includes("unavailable") || k.includes("not available")) {
            return new MusiikkiVirhe("Kappale ei ole saatavilla. Tarkista linkki tai kokeile toista versiota.");
        }
        const virhe = new MusiikkiVirhe("Kappaleen tietoja ei saatu haettua. Tarkista linkki tai kokeile toista hakua.");
        virhe.cause = err;
        return virhe;
    }
    return err;
}

async function tiedotTai(haku) {
    try {
        return await haku();
    } catch (err) {
        throw muunnettuYtdlpVirhe(err);
    }
}

/** Hakulause sille kun kappale pitää löytää nimellä (esim. Spotifyn kappaleet). */
function hakulause(kappale) {
    const etuliite = kappale.hakulahde === "soundcloud" ? "scsearch1" : "ytsearch1";
    const nimi = [kappale.artisti, kappale.otsikko].filter(Boolean).join(" ");
    return `${etuliite}:${nimi}`;
}

module.exports = {
    MusiikkiVirhe,
    haeKappaleet,
    hakulause,
    // testejä varten
    jasennaUrl,
    sallittuIsanta,
    onListaUrl,
    keraaSpotifyKappaleet,
    ytdlpKappale,
    suodata,
    jarjestaOsumat
};
