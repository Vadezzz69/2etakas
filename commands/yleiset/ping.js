const { SlashCommandBuilder } = require("discord.js");
const { info } = require("../../utils/ui");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Näyttää botin viiveen."),

    async execute(interaction, client) {
        const reply = await interaction.reply({ content: "Mitataan...", fetchReply: true });
        const roundtrip = reply.createdTimestamp - interaction.createdTimestamp;

        await interaction.editReply({
            content: null,
            embeds: [info({
                title: "🏓 Pong!",
                fields: [
                    { name: "Botin viive", value: `${roundtrip} ms`, inline: true },
                    { name: "API-viive", value: `${client.ws.ping} ms`, inline: true }
                ]
            })]
        });
    }
};
