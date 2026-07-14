const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { run, get } = require("../../utils/db");
const { VARIT } = require("../../utils/tyyli");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("varoita")
        .setDescription("Antaa käyttäjälle virallisen varoituksen.")
        .addUserOption(option =>
            option.setName("kayttaja").setDescription("Varoitettava käyttäjä").setRequired(true)
        )
        .addStringOption(option =>
            option.setName("syy").setDescription("Varoituksen syy").setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {

        const kayttaja = interaction.options.getUser("kayttaja");
        const syy = interaction.options.getString("syy");

        await run(
            `INSERT INTO warnings (guildId, userId, reason, moderatorId, timestamp) VALUES (?, ?, ?, ?, ?)`,
            [interaction.guildId, kayttaja.id, syy, interaction.user.id, Date.now()]
        );

        const row = await get(
            `SELECT COUNT(*) as count FROM warnings WHERE guildId = ? AND userId = ?`,
            [interaction.guildId, kayttaja.id]
        );

        const embed = new EmbedBuilder()
            .setColor(VARIT.VAROITUS)
            .setTitle("⚠️ Varoitus annettu")
            .setDescription(
                `${kayttaja} sai varoituksen.\n\n` +
                `**Syy:** ${syy}\n` +
                `**Varoituksia yhteensä:** ${row?.count ?? 1}`
            )
            .setFooter({ text: `Antoi: ${interaction.user.tag}` });

        await interaction.reply({ embeds: [embed] });

    }
};
