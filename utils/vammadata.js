const { run, get, all } = require("./db");

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
    "Darwin-palkinto siintää horisontissa."
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
    return HAUSKAT_KOMMENTIT[Math.floor(Math.random() * HAUSKAT_KOMMENTIT.length)];
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
