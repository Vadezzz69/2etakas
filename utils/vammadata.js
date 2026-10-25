const { run, get, all } = require("./db");
const { satunnainen } = require("./satunnainen");

const HAUSKAT_KOMMENTIT = [
    "Ai että osaa olla kömpelö! 🤕",
    "Ehkä kannattaisi harkita kypärää seuraavalla kerralla.",
    "Tästä tulee hyvä tarina lastenlapsille.",
    "Vakuutusyhtiö alkaa tunnistaa numeron.",
    "Onneksi kipu on vain mielentila. Tai näin sanotaan.",
    "Tämä oli suorastaan taiteellinen suoritus.",
    "Legenda kasvaa jälleen.",
    "Ensiapuasema soittaa jo tervetuliaissoiton.",
    "Fysioterapeutti tienaa taas kunnon palkan.",
    "Darwin-palkinto siintää horisontissa.",
    "Tämä kirjataan komitean rohkeimpien tapausten joukkoon.",
    "Pehmuste olisi ollut hyvä idea. Se on edelleen hyvä idea.",
    "Kaatuminen oli tyylikäs, laskeutuminen vähemmän.",
    "Sairaanhoitaja nosti kulmakarvaansa. Vain toista.",
    "Painovoima voitti jälleen. Painovoima johtaa 412–0.",
    "Komitea suosittelee, että katsot seuraavalla kerralla eteesi. Tai alas. Tai ylös.",
    "Ensiapupakkaus ehti avautua ennen kuin kukaan tiesi mitä oli tapahtunut.",
    "Myötätunto on aitoa, nauru vielä aidompaa.",
    "Ruumiinosat ovat yhä paikoillaan. Ylpeys on tilanteesta riippuvainen.",
    "Hyvä tarina. Hieman kallis, mutta hyvä.",
    "Komitea lähettää parantavia ajatuksia ja rajoitetun määrän pilkkaa.",
    "Kolhu on kirjattu. Kolhun tarina odottaa illallista.",
    "Tilastoihin tulee uusi merkintä ja uusi legenda.",
    "Onneksi tämä ei ollut elokuvassa, koska se olisi ollut pidempi.",
];

const TITTELIT = [
    { min: 0, title: "Vasta-alkaja 🍼" },
    { min: 3, title: "Kömpelö kokelas 🩹" },
    { min: 5, title: "Kokenut kaatuja 🤸" },
    { min: 10, title: "Sairaalan vakioasiakas 🏥" },
    { min: 20, title: "Elävä legenda 🦴" },
    { min: 35, title: "Kuolematon 💀" },
    { min: 50, title: "Fysiikan lakeja uhmaava ilmiö 🌪️" }
];

function arvonimi(count) {
    return [...TITTELIT].reverse().find(t => count >= t.min).title;
}

function satunnainenKommentti() {
    return satunnainen(HAUSKAT_KOMMENTIT);
}

// =====================================================
// TIETOKANTA — siirretty tänne komentotiedostoista
// (loukkaa.js, vammatilastot.js), sama malli kuin utils/tutkintadata.js.
// injuries-taulun rakenteeseen ei kosketa.
// =====================================================

async function lisaaLoukkaantuminen(guildId, userId, syy, ilmoittaja) {
    await run(
        `INSERT INTO injuries (guildId, userId, reason, reportedBy, timestamp) VALUES (?, ?, ?, ?, ?)`,
        [guildId, userId, syy, ilmoittaja, Date.now()]
    );
}

async function haeLoukkaantumistenMaara(guildId, userId) {
    const row = await get(
        `SELECT COUNT(*) as count FROM injuries WHERE guildId = ? AND userId = ?`,
        [guildId, userId]
    );
    return row?.count ?? 0;
}

async function haeViimeisimmatLoukkaantumiset(guildId, userId, limit = 5) {
    return all(
        `SELECT reason, timestamp FROM injuries WHERE guildId = ? AND userId = ? ORDER BY timestamp DESC LIMIT ?`,
        [guildId, userId, limit]
    );
}

async function haeLoukkaantumisLista(guildId, limit = 10) {
    return all(
        `SELECT userId, COUNT(*) as count FROM injuries WHERE guildId = ? GROUP BY userId ORDER BY count DESC LIMIT ?`,
        [guildId, limit]
    );
}

module.exports = {
    arvonimi,
    satunnainenKommentti,
    lisaaLoukkaantuminen,
    haeLoukkaantumistenMaara,
    haeViimeisimmatLoukkaantumiset,
    haeLoukkaantumisLista
};
