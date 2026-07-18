const { get, all } = require("../db");
const {
    kayttajanViestitTanaan,
    kayttajanViestitYhteensa,
    kayttajanAaniTanaanElavana,
    kayttajanAaniYhteensaElavana,
    kayttajanKomentojaYhteensa,
    kayttajanSuosikkiKomento
} = require("../tilastot");
const { haeSakkojenMaara } = require("../tutkintadata");

const RECENT_INVESTIGATION_DAYS = 30;

async function collectInvestigations(guildId, userId) {
    const row = await get(
        `SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open
         FROM investigations
         WHERE guildId = ? AND userId = ?`,
        [guildId, userId]
    );

    return {
        total: row?.total ?? 0,
        open: row?.open ?? 0
    };
}

/**
 * Counts investigations opened against this member in the last
 * RECENT_INVESTIGATION_DAYS days. Moved here (from the Roast Engine) so both
 * engines share one implementation instead of running the same query twice.
 */
async function collectRecentInvestigations(guildId, userId) {
    const since = Date.now() - RECENT_INVESTIGATION_DAYS * 24 * 60 * 60 * 1000;
    const row = await get(
        `SELECT COUNT(*) AS count
         FROM investigations
         WHERE guildId = ? AND userId = ? AND openedAt >= ?`,
        [guildId, userId, since]
    );

    return row?.count ?? 0;
}

/**
 * Computes this member's position in the message and voice leaderboards.
 * Also moved here from the Roast Engine for the same reason: one canonical
 * ranking query, reused by every consumer (Roast Engine, Stats Engine,
 * and — via the shared profile's `roastContext` — commands themselves).
 */
async function collectRankings(guildId, userId) {
    const [messageRows, voiceRows] = await Promise.all([
        all(
            `SELECT userId, SUM(count) AS total
             FROM message_stats WHERE guildId = ?
             GROUP BY userId ORDER BY total DESC`,
            [guildId]
        ),
        all(
            `SELECT userId, SUM(seconds) AS total
             FROM voice_stats WHERE guildId = ?
             GROUP BY userId ORDER BY total DESC`,
            [guildId]
        )
    ]);

    const findRank = rows => {
        const index = rows.findIndex(row => row.userId === userId);
        return index === -1 ? null : { position: index + 1, total: rows.length };
    };

    return {
        messages: findRank(messageRows),
        voice: findRank(voiceRows)
    };
}

/**
 * Collects raw statistics only. It deliberately contains no UI copy or
 * scoring rules, making it reusable by commands, scheduled reports and APIs.
 */
async function collectUserStats(guildId, userId) {
    const [
        messagesToday,
        messagesTotal,
        voiceTodaySeconds,
        voiceTotalSeconds,
        commandUsage,
        fines,
        investigations
    ] = await Promise.all([
        kayttajanViestitTanaan(guildId, userId),
        kayttajanViestitYhteensa(guildId, userId),
        kayttajanAaniTanaanElavana(guildId, userId),
        kayttajanAaniYhteensaElavana(guildId, userId),
        kayttajanKomentojaYhteensa(guildId, userId),
        haeSakkojenMaara(guildId, userId),
        collectInvestigations(guildId, userId)
    ]);

    return {
        messages: { today: messagesToday, total: messagesTotal },
        voice: { todaySeconds: voiceTodaySeconds, totalSeconds: voiceTotalSeconds },
        fines,
        investigations,
        commandUsage
    };
}

/**
 * The "rich" stats bundle: everything `collectUserStats` returns, plus the
 * cross-member queries (rankings, recent investigations, favorite command)
 * that used to be collected separately — and, for rankings/recent
 * investigations specifically, *duplicated* — by the Roast Engine.
 *
 * This is also what the Stats Engine profile exposes as `roastContext`, so a
 * command that already called `analyzeUserStats` can feed the same bundle
 * straight into the Roast Engine without a second round-trip to the database.
 */
async function collectExtendedStats(guildId, userId) {
    const [stats, recentInvestigations, rankings, favoriteCommand] = await Promise.all([
        collectUserStats(guildId, userId),
        collectRecentInvestigations(guildId, userId),
        collectRankings(guildId, userId),
        kayttajanSuosikkiKomento(guildId, userId)
    ]);

    return { ...stats, recentInvestigations, rankings, favoriteCommand: favoriteCommand ?? null };
}

module.exports = { collectUserStats, collectExtendedStats, collectRankings, collectRecentInvestigations };
