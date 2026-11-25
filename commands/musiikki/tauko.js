const { SlashCommandBuilder } = require("discord.js");
const { valmisteleOhjaus } = require("../../utils/musiikki/ohjain");
const UI = require("../../utils/musiikki/muotoilu");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("tauko")
        .setDescription("Pysäyttää musiikin tauolle tai jatkaa sitä."),

    async execute(interaction) {
        const soitin = await valmisteleOhjaus(interaction);
        if (!soitin) return;
        const tila = soitin.tauko();
        if (!tila) return interaction.reply({ ...UI.virhe("Tauotettavaa tai jatkettavaa kappaletta ei ole."), ephemeral: true });
        soitin.paivitaPaneeli?.();
        await interaction.reply({ ...UI.onnistui(tila === "tauolla" ? "Toisto tauolla" : "Toisto jatkuu"), ephemeral: true });
    }
};
