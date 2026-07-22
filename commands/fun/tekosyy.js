const { SlashCommandBuilder } = require("discord.js");
const { info } = require("../../utils/ui");
const { generoiTekosyy } = require("../../utils/comedy");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("tekosyy")
        .setDescription("Generoi käyttökelpoisen (?) tekosyyn."),

    async execute(interaction) {

        const embed = info({
            title: "🎭 Virallinen tekosyy",
            description: generoiTekosyy()
        });

        await interaction.reply({ embeds: [embed] });

    }
};
