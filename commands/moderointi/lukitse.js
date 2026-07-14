const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { VARIT } = require("../../utils/tyyli");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("lukitse")
        .setDescription("Lukitsee nykyisen kanavan — @everyone ei voi enää lähettää viestejä.")
        .addStringOption(option =>
            option.setName("syy").setDescription("Syy lukitukselle").setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {

        const syy = interaction.options.getString("syy") ?? "Syytä ei annettu";

        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            SendMessages: false
        });

        const embed = new EmbedBuilder()
            .setColor(VARIT.VAROITUS)
            .setDescription(`🔒 Kanava lukittu.\n**Syy:** ${syy}`);

        await interaction.reply({ embeds: [embed] });

    }
};
