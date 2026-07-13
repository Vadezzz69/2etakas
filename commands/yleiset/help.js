const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Listaa kaikki komennot."),

    async execute(interaction, client) {

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle("📖 Komennot")
            .setDescription(
                client.commands
                    .map(cmd => `**/${cmd.data.name}** — ${cmd.data.description}`)
                    .join("\n")
            );

        await interaction.reply({ embeds: [embed] });

    }
};
