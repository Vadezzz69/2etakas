const { formatDuration, formatNumber } = require("../ui");
const { buildObservations } = require("./observations");
const { buildHighlights } = require("./highlights");
const { getCommitteeOpinion } = require("./opinion");

const ACTIVITY_TITLES = {
    inactive: "Komitean tilannekuva: hiljainen pöytä",
    low: "Komitean tilannekuva: havaittu liikehdintää",
    moderate: "Komitean tilannekuva: aktiivinen osallistuja",
    high: "Komitean tilannekuva: palvelin on huomannut"
};

function buildBadges(stats, activityLevel) {
    const badges = [];

    if (activityLevel === "inactive") badges.push("Hiljainen pöytä");
    if (stats.messages.today >= 20) badges.push("Näppäimistö kuumana");
    if (stats.voice.todaySeconds >= 3600) badges.push("Äänikanavan vakio");
    if (stats.commandUsage >= 10) badges.push("Valikkovastaava");
    if (stats.fines > 0) badges.push("Sakkorekisterissä");
    if (stats.investigations.open > 0) badges.push("Asia avoinna");

    return badges;
}

function buildSummary(stats, activityLevel, risk) {
    const today = [
        `${formatNumber(stats.messages.today)} viestiä`,
        formatDuration(stats.voice.todaySeconds),
        `${formatNumber(stats.commandUsage)} komentoa`
    ].join(", ");

    const records = [
        `${formatNumber(stats.fines)} sakkoa`,
        `${formatNumber(stats.investigations.open)} avointa asiaa`
    ].join(", ");

    return `Tänään: ${today}. Kirjauksissa: ${records}. Aktiivisuustaso on ${activityLevel} ja riskitaso ${risk}.`;
}

/**
 * Forms the stable, presentation-ready profile object returned by
 * `analyzeUserStats`. Every field from the original shape (`title`, `risk`,
 * `summary`, `badges`, `activityLevel`) is still present with the same
 * meaning; everything else here is additive.
 */
function presentStats(stats, { activityLevel, activityScore, activityPercent, risk, riskScore, riskPercent }) {
    return {
        title: ACTIVITY_TITLES[activityLevel],

        // Original fields — unchanged in meaning and value.
        risk,
        summary: buildSummary(stats, activityLevel, risk),
        badges: buildBadges(stats, activityLevel),
        activityLevel,

        // New, richer fields requested for Phase 2.5.
        activityScore,
        activityPercent,
        riskLevel: risk,
        riskScore,
        riskPercent,
        committeeOpinion: getCommitteeOpinion(risk, activityLevel),
        observations: buildObservations(stats),
        highlights: buildHighlights(stats),

        // The exact stats bundle the Roast Engine needs. Passing this to
        // `analyzeRoastFromStats`/`generateRoastFromStats` lets a command
        // reuse one database round-trip for both the profile and the roast.
        roastContext: stats
    };
}

module.exports = { presentStats };
