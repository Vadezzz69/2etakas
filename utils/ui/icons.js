/**
 * Named icon registry so commands reference a concept ("messages") instead
 * of a bare emoji literal. Keeps embeds visually consistent and makes a
 * future icon change a one-line edit instead of a project-wide search.
 */
const ICONS = Object.freeze({
    messages: "💬",
    voice: "🔊",
    commands: "⚙️",
    rank: "🏆",
    risk: "⚖️",
    activity: "📈",
    badge: "🏷️",
    calendar: "📅",
    account: "🪪",
    committee: "🕵️",
    highlight: "✨",
    spacer: "\u200B"
});

module.exports = { ICONS };
