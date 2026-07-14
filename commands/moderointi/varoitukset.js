const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { all } = require("../../utils/db");
const { VARIT } = require("../../utils/tyyli");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("varoitukset")
        .setDescription("Näyttää käyttäjän varoitushistorian.")
        .addUserOption(option =>
            option.setName("kayttaja").setDescription("Kenen varoitukset näytetään").setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {

        const kayttaja = interaction.options.getUser("kayttaja");

        const rivit = await all(
            `SELECT reason, moderatorId, timestamp FROM warnings WHERE guildId = ? AND userId = ? ORDER BY timestamp DESC LIMIT 10`,
            [interaction.guildId, kayttaja.id]
        );

        if (!rivit.length) {
            return interaction.reply(`${kayttaja.username} ei ole saanut yhtään varoitusta. Puhdas pöytä. ✅`);
        }

        const embed = new EmbedBuilder()
            .setColor(VARIT.VAROITUS)
            .setTitle(`⚠️ ${kayttaja.username}n varoitukset (${rivit.length} viimeisintä)`)
            .setThumbnail(kayttaja.displayAvatarURL())
            .setDescription(
                rivit
                    .map((r, i) =>
                        `**${i + 1}.** ${r.reason}\n` +
                        `↳ <@${r.moderatorId}> — <t:${Math.floor(r.timestamp / 1000)}:R>`
                    )
                    .join("\n\n")
            );

        await interaction.reply({ embeds: [embed] });

    }
};
