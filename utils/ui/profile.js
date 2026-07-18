const { createEmbed } = require("./embed");
const { COLORS } = require("./colors");
const { ICONS } = require("./icons");
const { formatProgressBar } = require("./format");

// Maps a Stats Engine risk level to the embed accent color. Kept next to the
// embed builder (a UI concern) rather than inside the Stats Engine, which
// should not need to know how risk is displayed.
const RISK_COLOR = {
    low: COLORS.default,
    medium: COLORS.warning,
    high: COLORS.accent
};

/** A blank-but-visible field, used to break an embed into visual sections. */
function spacerField() {
    return { name: ICONS.spacer, value: ICONS.spacer, inline: false };
}

/**
 * Builds the project-standard "member profile" embed from a Stats Engine
 * profile (as returned by `analyzeUserStats`), optional Discord account
 * fields, optional command-specific stat fields, and an optional Roast
 * Engine comment. Centralizes spacing, icons, colors, footer, and timestamp
 * so commands no longer assemble embeds field-by-field.
 *
 * @param {object} options
 * @param {string} options.title
 * @param {string} [options.thumbnail]
 * @param {string} [options.description] - overrides the automatic description
 * @param {object[]} [options.accountFields] - Discord-specific fields (join dates, roles, ...)
 * @param {object[]} [options.statFields] - command-specific raw numbers
 * @param {object} [options.profile] - a Stats Engine profile object
 * @param {string} [options.roastText] - pre-composed Roast Engine text
 * @param {object[]} [options.extraFields] - anything else, appended last
 */
function buildProfileEmbed({
    title,
    thumbnail,
    description,
    accountFields = [],
    statFields = [],
    profile = null,
    roastText = null,
    extraFields = []
} = {}) {
    const fields = [];

    if (accountFields.length) {
        fields.push(...accountFields, spacerField());
    }

    if (statFields.length) {
        fields.push(...statFields);
    }

    if (profile) {
        fields.push(
            spacerField(),
            {
                name: `${ICONS.activity} Aktiivisuus (${profile.activityLevel})`,
                value: formatProgressBar(profile.activityPercent),
                inline: true
            },
            {
                name: `${ICONS.risk} Riskitaso (${profile.riskLevel})`,
                value: formatProgressBar(profile.riskPercent),
                inline: true
            },
            { name: "Komitean kanta", value: profile.committeeOpinion }
        );

        if (profile.badges.length) {
            fields.push({ name: `${ICONS.badge} Merkinnät`, value: profile.badges.join(" • ") });
        }

        if (profile.highlights.length) {
            fields.push({ name: `${ICONS.highlight} Kohokohdat`, value: profile.highlights.join("\n") });
        }
    }

    if (roastText) {
        fields.push(spacerField(), { name: `${ICONS.committee} Komitean huomio`, value: roastText });
    }

    if (extraFields.length) {
        fields.push(...extraFields);
    }

    return createEmbed({
        color: profile ? (RISK_COLOR[profile.riskLevel] ?? COLORS.default) : COLORS.default,
        title,
        description,
        thumbnail,
        fields
    });
}

module.exports = { buildProfileEmbed, spacerField, RISK_COLOR };
