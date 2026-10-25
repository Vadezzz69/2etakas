/**
 * Small, reusable phrase builders used by the composer to turn a set of
 * scored observations into a paragraph that reads as one consistent voice
 * (a slightly deadpan bureaucratic committee), instead of a single sentence
 * with everything crammed into it.
 *
 * Keeping these as isolated functions — rather than inline strings inside
 * compose.js — is what makes the composer's tone easy to retune later
 * without touching the selection/merging logic.
 *
 * Which observations are chosen stays fully statistic-driven and
 * deterministic (see compose.js). Only the *wording* of the opening,
 * transition and closing is drawn from several variants, so the same member
 * does not get the identical paragraph every time.
 */

const { satunnainen } = require("../satunnainen");

const OPENINGS = [
    "Komitea kirjasi, että käyttäjä",
    "Komitean pöytäkirjan mukaan käyttäjä",
    "Arkistoon merkittiin, että käyttäjä",
    "Havaintojen perusteella käyttäjä",
    "Komitea panee merkille, että käyttäjä",
    "Pöytäkirjaan kirjattiin, että käyttäjä",
    "Komitean kahvihuoneessa todettiin, että käyttäjä"
];

function openingPhrase() {
    return satunnainen(OPENINGS);
}

// Priority order in which categories are considered "dominant" when more
// than one is present among the selected observations. Legal matters
// (fines, investigations) outrank everything else because the Committee
// cares about them the most; a raw activity dump ("volume") is the least
// remarkable on its own.
const CATEGORY_PRIORITY = ["legal", "standing", "record", "volume", "state", "general"];

function dominantCategory(observations) {
    const present = new Set(observations.map(observation => observation.category ?? "general"));
    return CATEGORY_PRIORITY.find(category => present.has(category)) ?? "general";
}

const TRANSITIONS = {
    legal: ["Tämän seurauksena", "Tämän johdosta", "Siksi"],
    standing: ["Samalla", "Siinä sivussa", "Samaan aikaan"],
    record: ["Lisäksi", "Sen lisäksi", "Päälle päätteeksi"],
    volume: ["Tästä huolimatta", "Silti", "Kaikesta huolimatta"],
    state: ["Silti", "Siitä huolimatta", "Toisaalta"],
    general: ["Kaiken kaikkiaan", "Yhteenvetona", "Lopuksi"]
};

function transitionFor(category) {
    return satunnainen(TRANSITIONS[category] ?? TRANSITIONS.general);
}

const CLOSINGS = {
    legal: [
        "komitea ei ole enää varma, onko kyseessä rivijäsen vai oma erillinen tutkintaosasto.",
        "komitea harkitsee jo kohteelle oman toimiston perustamista.",
        "arkistonhoitaja on pyytänyt lisää hyllytilaa.",
        "asianajajan numero on ehkä syytä pitää lähellä."
    ],
    standing: [
        "komitea harkitsee jo kunniataulun päivittämistä.",
        "tilastot nyökkäävät hyväksyvästi, mikä on harvinaista.",
        "komitea on valmis kirjoittamaan kunniamaininnan, jos joku muistaa kynän."
    ],
    record: [
        "arkisto-osasto pyytää tästä eteenpäin ennakkoilmoitusta.",
        "tilasto on kirjattu pysyvästi, ja se on jo hieman häpeällinen.",
        "muistiinpano päätyy kansioon, jonka päällä lukee \"tämä taas\"."
    ],
    volume: [
        "komitea ei enää tiedä, käykö käyttäjä palvelimella vai omistaako hän siitä osan.",
        "komitea pohtii, pitäisikö kiintiöt ottaa käyttöön.",
        "tilastoja luetaan ääneen komitean kokouksissa hiljaisella kunnioituksella."
    ],
    state: [
        "komitea ei löytänyt tästä juuri mitään kommentoitavaa, mikä on sekin oma huomionsa.",
        "tilanne on rauhallinen, mikä on tavallaan huolestuttavinta.",
        "komitea jatkaa kahvin juontia ja seurantaa."
    ],
    general: [
        "komitea pitää tilannetta joka tapauksessa seurannan arvoisena.",
        "komitea ei halua sanoa enempää, mutta sanoo silti.",
        "tämä on kirjattu ja kirjaus on lopullinen, ellei joku kysy."
    ]
};

function closingFor(category) {
    return satunnainen(CLOSINGS[category] ?? CLOSINGS.general);
}

module.exports = {
    openingPhrase,
    dominantCategory,
    transitionFor,
    closingFor,
    CATEGORY_PRIORITY,
    TRANSITIONS,
    CLOSINGS
};
