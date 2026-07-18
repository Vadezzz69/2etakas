const { formatNumber, formatDuration } = require("../ui");

const MAX_OBSERVATIONS = 4;

/**
 * Neutral, factual observations — the Stats Engine's own equivalent of the
 * Roast Engine's scored templates, but phrased as plain reporting instead of
 * commentary. Kept separate from the Roast Engine on purpose: Stats Engine
 * must stay dependency-free of Roast Engine (Roast Engine already depends on
 * Stats Engine, and a reverse dependency would create a cycle).
 *
 * Each rule has a `weight(stats)` used only for ranking; higher-weight facts
 * are considered more worth reporting and are listed first.
 */
const RULES = [
    {
        id: "messages-today",
        weight: stats => stats.messages.today,
        text: stats => `Kirjoitti tänään ${formatNumber(stats.messages.today)} viestiä.`
    },
    {
        id: "voice-today",
        weight: stats => stats.voice.todaySeconds / 60,
        text: stats => `Vietti tänään ${formatDuration(stats.voice.todaySeconds)} äänikanavalla.`
    },
    {
        id: "messages-total",
        weight: stats => stats.messages.total / 10,
        text: stats => `Viestejä kertynyt yhteensä ${formatNumber(stats.messages.total)}.`
    },
    {
        id: "voice-total",
        weight: stats => stats.voice.totalSeconds / 600,
        text: stats => `Äänikanava-aikaa yhteensä ${formatDuration(stats.voice.totalSeconds)}.`
    },
    {
        id: "fines",
        weight: stats => stats.fines * 50,
        text: stats => `Sakkorekisterissä ${formatNumber(stats.fines)} merkintää.`
    },
    {
        id: "investigations-open",
        weight: stats => stats.investigations.open * 80,
        text: stats => `${formatNumber(stats.investigations.open)} avointa tutkintaa käynnissä.`
    },
    {
        id: "commands",
        weight: stats => stats.commandUsage,
        text: stats => `Käyttänyt komentoja ${formatNumber(stats.commandUsage)} kertaa.`
    }
];

function buildObservations(stats) {
    return RULES
        .map(rule => ({ id: rule.id, weight: rule.weight(stats), text: rule.text(stats) }))
        .filter(rule => rule.weight > 0)
        .sort((left, right) => right.weight - left.weight || left.id.localeCompare(right.id))
        .slice(0, MAX_OBSERVATIONS)
        .map(rule => rule.text);
}

module.exports = { buildObservations };
