const { collectRoastStats } = require("./collectors");
const templates = require("./templates");
const { selectObservations, composeRoast } = require("./compose");

/**
 * Pure, synchronous core: turns an already-collected stats bundle into a
 * roast. No database access happens here, which is what lets a caller who
 * already has a Stats Engine profile (via `profile.roastContext`) generate a
 * roast without a second round-trip to the database.
 */
function analyzeRoastFromStats(stats) {
    const observations = selectObservations(stats, templates);

    return {
        text: composeRoast(observations),
        observations: observations.map(({ id }) => id)
    };
}

function generateRoastFromStats(stats) {
    return analyzeRoastFromStats(stats).text;
}

/**
 * Returns a deterministic, statistic-based Committee comment for one member.
 * It never uses random selection: every selected template has a data-driven
 * score and ties use the template id for stable ordering.
 *
 * Unchanged from earlier versions: still collects its own stats and still
 * returns `{ text, observations }`. Prefer `analyzeRoastFromStats` when you
 * already have a Stats Engine profile to avoid re-querying the database.
 */
async function analyzeRoast(guildId, userId) {
    if (!guildId || !userId) {
        throw new TypeError("analyzeRoast requires guildId and userId.");
    }

    const stats = await collectRoastStats(guildId, userId);
    return analyzeRoastFromStats(stats);
}

async function generateRoast(guildId, userId) {
    const roast = await analyzeRoast(guildId, userId);
    return roast.text;
}

module.exports = {
    generateRoast,
    analyzeRoast,
    collectRoastStats,
    analyzeRoastFromStats,
    generateRoastFromStats
};
