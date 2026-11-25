const { SlashCommandBuilder } = require("discord.js");
const { valmisteleOhjaus } = require("../../utils/musiikki/ohjain");
const UI = require("../../utils/musiikki/muotoilu");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("nyt")
        .setDescription("Näyttää mikä kappale soi juuri nyt."),

    async execute(interaction) {
        const soitin = await valmisteleOhjaus(interaction, { vaatiiKanavan: false });
        if (soitin) await interaction.reply(UI.soitinNakyma(soitin));
    }
};
