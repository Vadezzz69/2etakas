const { collectUserStats, collectExtendedStats } = require("./collectors");
const { getActivityLevel, getActivityScore, getActivityPercent } = require("./activity");
const { getRisk, getRiskScore, getRiskPercent } = require("./risk");
const { presentStats } = require("./presenter");

/**
 * Analyzes a member's existing server data without creating or modifying it.
 *
 * @returns {Promise<{
 *   title: string,
 *   risk: "low" | "medium" | "high",
 *   riskLevel: "low" | "medium" | "high",
 *   riskScore: number,
 *   riskPercent: number,
 *   summary: string,
 *   badges: string[],
 *   activityLevel: "inactive" | "low" | "moderate" | "high",
 *   activityScore: number,
 *   activityPercent: number,
 *   committeeOpinion: string,
 *   observations: string[],
 *   highlights: string[],
 *   roastContext: object
 * }>}
 */
async function analyzeUserStats(guildId, userId) {
    if (!guildId || !userId) {
        throw new TypeError("analyzeUserStats requires guildId and userId.");
    }

    const stats = await collectExtendedStats(guildId, userId);

    const activityLevel = getActivityLevel(stats);
    const activityScore = getActivityScore(stats);
    const activityPercent = getActivityPercent(stats);

    const risk = getRisk(stats);
    const riskScore = getRiskScore(stats);
    const riskPercent = getRiskPercent(stats);

    return presentStats(stats, { activityLevel, activityScore, activityPercent, risk, riskScore, riskPercent });
}

module.exports = {
    analyzeUserStats,
    collectUserStats,
    collectExtendedStats,
    getActivityLevel,
    getActivityScore,
    getActivityPercent,
    getRisk,
    getRiskScore,
    getRiskPercent
};
