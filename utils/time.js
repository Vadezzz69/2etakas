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
 * N päivää sitten Helsingin aikavyöhykkeellä, muodossa YYYY-MM-DD.
 * Lasketaan kalenteripäivinä (ei 24 tunnin paloina), jotta tulos on oikein
 * myös kesä-/talviajan vaihtumisen lähellä, jolloin vuorokaudessa on 23 tai
 * 25 tuntia.
 */
function paiviaSittenHelsingissa(paivia, viitehetki = new Date()) {
    const [vuosi, kuukausi, paiva] = tanaanHelsingissa(viitehetki).split("-").map(Number);
    return new Date(Date.UTC(vuosi, kuukausi - 1, paiva - paivia)).toISOString().slice(0, 10);
}

/** Eilisen päivämäärä Helsingin aikavyöhykkeellä (YYYY-MM-DD). */
function eilinenHelsingissa(viitehetki = new Date()) {
    return paiviaSittenHelsingissa(1, viitehetki);
}

/**
 * Helsingin ja UTC:n välinen ero millisekunteina annetulla hetkellä
 * (+2 h talvella, +3 h kesällä). Luetaan Intl-rajapinnasta, joten kesä-/
 * talviaika huomioidaan itsestään.
 */
function helsinginOffsetMs(hetki) {
    const osat = new Intl.DateTimeFormat("en-US", {
        timeZone: HELSINGIN_AIKAVYOHYKE,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    }).formatToParts(hetki);

    const arvo = tyyppi => Number(osat.find(osa => osa.type === tyyppi).value);
    const seinakelloUtcna = Date.UTC(arvo("year"), arvo("month") - 1, arvo("day"), arvo("hour"), arvo("minute"), arvo("second"));

    return seinakelloUtcna - Math.floor(hetki.getTime() / 1000) * 1000;
}

/**
 * Helsingin keskiyö (klo 00:00) annetun kalenteripäivän (YYYY-MM-DD) alussa,
 * epoch-millisekunteina. Korvaa aiemman `new Date(`${pvm}T00:00:00.000Z`)`
 * -tempun, joka laski päivän alun UTC-keskiyöstä ja siirsi kaikki
 * komentotilastojen päivärajat 2–3 tuntia väärään kohtaan.
 */
function paivanAlkuMs(pvm) {
    const [vuosi, kuukausi, paiva] = pvm.split("-").map(Number);
    const utcKeskiyo = Date.UTC(vuosi, kuukausi - 1, paiva);

    // Kaksi kierrosta, jotta kesä-/talviajan vaihtopäivätkin osuvat oikein.
    let alku = utcKeskiyo - helsinginOffsetMs(new Date(utcKeskiyo));
    alku = utcKeskiyo - helsinginOffsetMs(new Date(alku));

    return alku;
}

/** Seuraavan kalenteripäivän (Helsingin keskiyö) alku — eli annetun päivän yläraja (poissulkeva). */
function paivanLoppuMs(pvm) {
    const [vuosi, kuukausi, paiva] = pvm.split("-").map(Number);
    const seuraava = new Date(Date.UTC(vuosi, kuukausi - 1, paiva + 1)).toISOString().slice(0, 10);
    return paivanAlkuMs(seuraava);
}

module.exports = {
    HELSINGIN_AIKAVYOHYKE,
    tanaanHelsingissa,
    eilinenHelsingissa,
    paiviaSittenHelsingissa,
    paivanAlkuMs,
    paivanLoppuMs
};
