const { SlashCommandBuilder } = require("discord.js");
const { satunnainen } = require("../../utils/satunnainen");
const { valmisteleOhjaus } = require("../../utils/musiikki/ohjain");
const { LOPETETTU } = require("../../utils/musiikki/viestit");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("lopeta")
        .setDescription("Lopettaa musiikin, tyhjentää jonon ja poistuu äänikanavalta."),

    async execute(interaction) {
        await interaction.deferReply();

        const soitin = await valmisteleOhjaus(interaction);
        if (!soitin) return;

        soitin.lopeta();
        await interaction.editReply(satunnainen(LOPETETTU));
    }
};
