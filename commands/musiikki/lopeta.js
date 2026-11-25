const { SlashCommandBuilder } = require("discord.js");
const { valmisteleOhjaus } = require("../../utils/musiikki/ohjain");
const UI = require("../../utils/musiikki/muotoilu");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("lopeta")
        .setDescription("Lopettaa musiikin, tyhjentää jonon ja poistuu äänikanavalta."),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const soitin = await valmisteleOhjaus(interaction);
        if (!soitin) return;
        soitin.lopeta();
        await interaction.editReply(UI.onnistui("Musiikki pysäytetty", "Jono tyhjennettiin."));
    }
};
