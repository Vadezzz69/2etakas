/**
 * Musiikkimoduulin asetukset ja kirjastojen lataus.
 *
 * Kaikki asetukset ovat valinnaisia ympäristömuuttujia (ks. .env.example).
 * Ääni- ja soittokirjastot ladataan vasta kun musiikkia oikeasti käytetään,
 * joten botti käynnistyy ja kaikki muut komennot toimivat vaikka musiikin
 * riippuvuuksia ei olisi vielä asennettu.
 */

function luku(nimi, oletus, min, max) {
    const arvo = Number(process.env[nimi]);
    if (!Number.isFinite(arvo) || process.env[nimi] === "") return oletus;
    return Math.min(max, Math.max(min, Math.floor(arvo)));
}

// Sivustot joiden linkkejä /soita hyväksyy käyttäjän antamana. Rajaus estää
// sen, ettei kuka tahansa voi ohjata palvelinta hakemaan mielivaltaisia
// osoitteita (mm. hostin sisäverkon osoitteet). Lisää omia sivustoja
// MUSIIKKI_SALLITUT_SIVUT-muuttujalla (pilkuilla erotettuna).
const OLETUS_SALLITUT_SIVUT = [
    "youtube.com",
    "youtu.be",
    "soundcloud.com",
    "bandcamp.com",
    "mixcloud.com",
    "vimeo.com",
    "open.spotify.com"
];

function sallitutSivut() {
    const lisat = (process.env.MUSIIKKI_SALLITUT_SIVUT ?? "")
        .split(",")
        .map(s => s.trim().toLowerCase())
        .filter(s => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(s));
    return [...new Set([...OLETUS_SALLITUT_SIVUT, ...lisat])];
}

const HAKULAHTEET = ["youtube", "soundcloud"];

function asetukset() {
    const haku = (process.env.MUSIIKKI_HAKULAHDE ?? "youtube").toLowerCase();

    return {
        maxJono: luku("MUSIIKKI_MAX_JONO", 100, 1, 500),
        maxLista: luku("MUSIIKKI_MAX_LISTA", 100, 1, 200),
        maxKestoS: luku("MUSIIKKI_MAX_KESTO_MIN", 120, 1, 1440) * 60,
        poistuJononJalkeenMs: luku("MUSIIKKI_POISTU_JONON_JALKEEN_S", 180, 10, 3600) * 1000,
        poistuYksinMs: luku("MUSIIKKI_POISTU_YKSIN_S", 60, 5, 3600) * 1000,
        oletusHakulahde: HAKULAHTEET.includes(haku) ? haku : "youtube",
        sallitutSivut: sallitutSivut()
    };
}

// ---------------------------------------------------------------------------
// @discordjs/voice -kirjaston laiska lataus
// ---------------------------------------------------------------------------

let kirjastoTila = null;

/**
 * @returns {{ ok: true, voice: object } | { ok: false, syy: string }}
 */
function lataaAaniKirjasto() {
    if (kirjastoTila) return kirjastoTila;

    // @discordjs/voice vaatii Node.js 22.12 tai uudemman.
    const [major, minor] = process.versions.node.split(".").map(Number);
    if (major < 22 || (major === 22 && minor < 12)) {
        return (kirjastoTila = {
            ok: false,
            syy: `Musiikki vaatii Node.js 22.12 tai uudemman (palvelimella on ${process.version}).`
        });
    }

    try {
        return (kirjastoTila = { ok: true, voice: require("@discordjs/voice") });
    } catch (err) {
        if (err.code !== "MODULE_NOT_FOUND") {
            console.error("❌ @discordjs/voice -kirjaston lataus epäonnistui:", err);
        }
        return (kirjastoTila = {
            ok: false,
            syy: "Musiikkimoduulin kirjastoja ei ole asennettu (@discordjs/voice)."
        });
    }
}

/** Vain testejä varten: korvaa äänikirjaston feikillä. */
function asetaAaniKirjastoTestia(voice) {
    kirjastoTila = voice ? { ok: true, voice } : null;
}

module.exports = {
    asetukset,
    sallitutSivut,
    lataaAaniKirjasto,
    asetaAaniKirjastoTestia,
    HAKULAHTEET
};
