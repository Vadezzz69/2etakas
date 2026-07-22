const { SlashCommandBuilder } = require("discord.js");
const { info } = require("../../utils/ui");
const { generoiTiedote } = require("../../utils/comedy");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("tiedote")
        .setDescription("Komitean satunnainen (ja täysin merkityksetön) tiedote."),

    async execute(interaction) {

        const embed = info({
            title: "📢 Komitean tiedote",
            description: generoiTiedote()
        });

        await interaction.reply({ embeds: [embed] });

    }
};
