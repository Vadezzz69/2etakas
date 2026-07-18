const { EmbedBuilder } = require("discord.js");
const { BRANDI } = require("../tyyli");
const { COLORS } = require("./colors");

const DEFAULT_FOOTER = Object.freeze({
    text: `${BRANDI.FOOTER_ICON} ${BRANDI.FOOTER_TEKSTI}`
});

function applyFooter(embed, footer) {
    if (footer === false) return;
    if (typeof footer === "string") {
        embed.setFooter({ text: footer });
        return;
    }
    embed.setFooter(footer ?? DEFAULT_FOOTER);
}

/**
 * Creates a project-standard embed. Every option is optional except those
 * required by the caller's own content.
 */
function createEmbed({
    color = COLORS.default,
    title,
    description,
    fields,
    author,
    footer,
    thumbnail,
    image,
    url,
    timestamp = true
} = {}) {
    const embed = new EmbedBuilder().setColor(color);

    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description);
    if (url) embed.setURL(url);
    if (author) embed.setAuthor(author);
    if (thumbnail) embed.setThumbnail(thumbnail);
    if (image) embed.setImage(image);
    if (Array.isArray(fields) && fields.length) embed.addFields(fields);
    applyFooter(embed, footer);
    if (timestamp) embed.setTimestamp();

    return embed;
}

function withColor(color) {
    return options => createEmbed({ ...options, color });
}

const info = withColor(COLORS.default);
const success = withColor(COLORS.success);
const warning = withColor(COLORS.warning);
const error = withColor(COLORS.accent);
const stats = withColor(COLORS.default);
const ranking = withColor(COLORS.default);
const report = withColor(COLORS.accent);

module.exports = {
    COLORS,
    DEFAULT_FOOTER,
    createEmbed,
    info,
    success,
    warning,
    error,
    stats,
    ranking,
    report
};
