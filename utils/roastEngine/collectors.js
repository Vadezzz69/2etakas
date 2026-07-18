const { collectExtendedStats } = require("../statsEngine");

/**
 * The Roast Engine's stats bundle is now exactly the Stats Engine's
 * "extended" bundle (messages, voice, fines, investigations, command usage,
 * rankings, recent investigations, favorite command). Ranking and recent-
 * investigation queries used to be duplicated here; they now live in one
 * place (`utils/statsEngine/collectors.js`) and are simply reused.
 *
 * Kept as its own named export — rather than having every caller reach into
 * the Stats Engine directly — so the Roast Engine's public API
 * (`collectRoastStats`) stays stable for existing callers.
 */
const collectRoastStats = collectExtendedStats;

module.exports = { collectRoastStats };
