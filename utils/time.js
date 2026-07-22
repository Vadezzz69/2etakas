// Keskitetty ajanhallinta Helsingin aikavyöhykkeellä (Europe/Helsinki).
// Käyttää Intl-rajapintaa suoraan Date-olioiden UTC-metodien sijaan, joten
// kesä-/talviajan vaihtuminen (EET ↔ EEST) huomioidaan automaattisesti
// ilman erillistä DST-taulukkoa.

const HELSINGIN_AIKAVYOHYKE = "Europe/Helsinki";

/**
 * Päivämäärä Helsingin aikavyöhykkeellä muodossa YYYY-MM-DD.
 * "en-CA"-locale palauttaa suoraan ISO-järjestyksen (vuosi-kuukausi-päivä),
 * joten sitä ei tarvitse koota käsin.
 */
function tanaanHelsingissa(viitehetki = new Date()) {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: HELSINGIN_AIKAVYOHYKE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(viitehetki);
}

/**
 * Eilisen päivämäärä Helsingin aikavyöhykkeellä. Vähennetään 24 tuntia
 * absoluuttisesta ajasta ja luetaan sen jälkeen Helsingin kalenteripäivä —
 * tämä pysyy oikeana myös kesä-/talviajan vaihtumisyönä.
 */
function eilinenHelsingissa(viitehetki = new Date()) {
    const vuorokausiSitten = new Date(viitehetki.getTime() - 24 * 60 * 60 * 1000);
    return tanaanHelsingissa(vuorokausiSitten);
}

/**
 * N päivää sitten Helsingin aikavyöhykkeellä, muodossa YYYY-MM-DD.
 * Käytetään mm. "viikko"/"kuukausi"-aikavälisuodattimissa.
 */
function paiviaSittenHelsingissa(paivia, viitehetki = new Date()) {
    const kohde = new Date(viitehetki.getTime() - paivia * 24 * 60 * 60 * 1000);
    return tanaanHelsingissa(kohde);
}

/**
 * Muotoilee aikaleiman suomalaiseen luettavaan muotoon Helsingin ajassa.
 * Käytetään paikoissa joissa Discordin oma <t:...> ei sovellu (esim. web-
 * dashboard tai lokiviestit).
 */
function muotoileHelsinginAika(aikaleima, { dateStyle = "medium", timeStyle } = {}) {
    const date = aikaleima instanceof Date ? aikaleima : new Date(aikaleima);
    if (Number.isNaN(date.getTime())) return "—";

    return new Intl.DateTimeFormat("fi-FI", {
        timeZone: HELSINGIN_AIKAVYOHYKE,
        dateStyle,
        ...(timeStyle ? { timeStyle } : {})
    }).format(date);
}

/** Kellonaika Helsingissä muodossa HH:MM:SS — esim. dashboardin kelloon. */
function kelloHelsingissa(viitehetki = new Date()) {
    return new Intl.DateTimeFormat("fi-FI", {
        timeZone: HELSINGIN_AIKAVYOHYKE,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    }).format(viitehetki);
}

module.exports = {
    HELSINGIN_AIKAVYOHYKE,
    tanaanHelsingissa,
    eilinenHelsingissa,
    paiviaSittenHelsingissa,
    muotoileHelsinginAika,
    kelloHelsingissa
};
