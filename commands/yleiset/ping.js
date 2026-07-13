const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Näyttää botin viiveen."),

    async execute(interaction, client) {

        const sent = await interaction.reply({ content: "Mitataan...", fetchReply: true });

        const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
        const wsPing = client.ws.ping;

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle("🏓 Pong!")
            .addFields(
                { name: "Botin viive", value: `${roundtrip} ms`, inline: true },
                { name: "API-viive", value: `${wsPing} ms`, inline: true }
            );

        await interaction.editReply({ content: null, embeds: [embed] });

    }
};
