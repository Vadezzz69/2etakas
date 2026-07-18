const { palkki } = require("../tyyli");

/** Shared presentation helpers for Discord UI. */

function formatNumber(value, locale = "fi-FI") {
    return new Intl.NumberFormat(locale).format(Number(value) || 0);
}

function formatPercent(value, { decimals = 0, locale = "fi-FI" } = {}) {
    const number = Number(value);
    const safeValue = Number.isFinite(number) ? number : 0;

    return new Intl.NumberFormat(locale, {
        style: "percent",
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(safeValue > 1 ? safeValue / 100 : safeValue);
}

function formatDuration(seconds, { short = false } = {}) {
    const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remainingSeconds = totalSeconds % 60;
    const parts = [];

    if (days) parts.push(short ? `${days} pv` : `${days} päivää`);
    if (hours) parts.push(short ? `${hours} h` : `${hours} tuntia`);
    if (minutes) parts.push(short ? `${minutes} min` : `${minutes} minuuttia`);
    if (!parts.length || (!days && !hours && !minutes && remainingSeconds)) {
        parts.push(short ? `${remainingSeconds} s` : `${remainingSeconds} sekuntia`);
    }

    return parts.join(" ");
}

function formatDate(value, { locale = "fi-FI", dateStyle = "medium" } = {}) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return new Intl.DateTimeFormat(locale, { dateStyle }).format(date);
}

function mentionUser(userId) {
    return `<@${userId}>`;
}

/**
 * Renders a percentage as a fixed-width block bar, e.g. `████████░░░░ 67%`.
 * Delegates the actual bar-drawing to `utils/tyyli.js` so there is only one
 * implementation of "what a progress bar looks like" in the whole project.
 */
function formatProgressBar(percent, { length = 12 } = {}) {
    const safePercent = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
    return `\`${palkki(safePercent, length)}\` ${safePercent}%`;
}

/** Renders a leaderboard position, e.g. "#3 / 27", or a fallback if unranked. */
function formatRanking(rank, fallback = "Ei sijoitusta vielä") {
    if (!rank) return fallback;
    return `#${rank.position} / ${rank.total}`;
}

module.exports = {
    formatNumber,
    formatPercent,
    formatDuration,
    formatDate,
    mentionUser,
    formatProgressBar,
    formatRanking
};
