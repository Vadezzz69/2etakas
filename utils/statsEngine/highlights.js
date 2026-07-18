const { formatNumber, formatDuration } = require("../ui");

// Thresholds a stat must cross to count as a "highlight" rather than a
// routine observation. Named so the reasoning behind each number is visible
// at a glance instead of appearing as a bare literal below.
const NOTABLE_MESSAGE_TOTAL = 1000;
const NOTABLE_VOICE_TOTAL_SECONDS = 24 * 60 * 60; // one full day, cumulative
const NOTABLE_FINE_COUNT = 5;

/**
 * Short "record"-style strings for standout numbers only — distinct from
 * `badges` (short categorical tags) and `observations` (routine facts).
 * Highlights are meant to be rare; most profiles will have zero or one.
 */
function buildHighlights(stats) {
    const highlights = [];

    if (stats.messages.total >= NOTABLE_MESSAGE_TOTAL) {
        highlights.push(`${formatNumber(stats.messages.total)} viestiä kirjoitettu kaiken kaikkiaan.`);
    }

    if (stats.voice.totalSeconds >= NOTABLE_VOICE_TOTAL_SECONDS) {
        highlights.push(`${formatDuration(stats.voice.totalSeconds)} äänikanavalla kaiken kaikkiaan.`);
    }

    if (stats.fines >= NOTABLE_FINE_COUNT) {
        highlights.push(`${formatNumber(stats.fines)} sakkoa kertynyt.`);
    }

    if (stats.rankings?.messages?.position === 1) {
        highlights.push("Ykkössijalla viestitilastossa.");
    }

    if (stats.rankings?.voice?.position === 1) {
        highlights.push("Ykkössijalla äänikanava-tilastossa.");
    }

    return highlights;
}

module.exports = { buildHighlights };
