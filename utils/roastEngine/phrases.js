/**
 * Small, reusable phrase builders used by the composer to turn a set of
 * scored observations into a paragraph that reads as one consistent voice
 * (a slightly deadpan bureaucratic committee), instead of a single sentence
 * with everything crammed into it.
 *
 * Keeping these as isolated functions — rather than inline strings inside
 * compose.js — is what makes the composer's tone easy to retune later
 * without touching the selection/merging logic.
 */

const OPENING = "Komitea kirjasi, että käyttäjä";

function openingPhrase() {
    return OPENING;
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
    legal: "Tämän seurauksena",
    standing: "Samalla",
    record: "Lisäksi",
    volume: "Tästä huolimatta",
    state: "Silti",
    general: "Kaiken kaikkiaan"
};

function transitionFor(category) {
    return TRANSITIONS[category] ?? TRANSITIONS.general;
}

const CLOSINGS = {
    legal: "komitea ei ole enää varma, onko kyseessä rivijäsen vai oma erillinen tutkintaosasto.",
    standing: "komitea harkitsee jo kunniataulun päivittämistä.",
    record: "arkisto-osasto pyytää tästä eteenpäin ennakkoilmoitusta.",
    volume: "komitea ei enää tiedä, käykö käyttäjä palvelimella vai omistaako hän siitä osan.",
    state: "komitea ei löytänyt tästä juuri mitään kommentoitavaa, mikä on sekin oma huomionsa.",
    general: "komitea pitää tilannetta joka tapauksessa seurannan arvoisena."
};

function closingFor(category) {
    return CLOSINGS[category] ?? CLOSINGS.general;
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
