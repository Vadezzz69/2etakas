const { SlashCommandBuilder } = require("discord.js");
const { valmisteleOhjaus } = require("../../utils/musiikki/ohjain");
const { jonoEmbed } = require("../../utils/musiikki/muotoilu");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("jono")
        .setDescription("Näyttää musiikkijonon."),

    async execute(interaction) {
        const soitin = await valmisteleOhjaus(interaction, { vaatiiKanavan: false });
        if (!soitin) return;

        await interaction.reply({ embeds: [jonoEmbed(soitin)] });
    }
};
