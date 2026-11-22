const { SlashCommandBuilder } = require("discord.js");
const { satunnainen } = require("../../utils/satunnainen");
const { valmisteleOhjaus } = require("../../utils/musiikki/ohjain");
const { nytEmbed } = require("../../utils/musiikki/muotoilu");
const { EI_SOI } = require("../../utils/musiikki/viestit");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("nyt")
        .setDescription("Näyttää mikä kappale soi juuri nyt."),

    async execute(interaction) {
        const soitin = await valmisteleOhjaus(interaction, { vaatiiKanavan: false });
        if (!soitin) return;

        const tiedot = soitin.nytTiedot();
        if (!tiedot.kappale) {
            return interaction.reply({ content: satunnainen(EI_SOI), ephemeral: true });
        }

        await interaction.reply({ embeds: [nytEmbed(tiedot)] });
    }
};
