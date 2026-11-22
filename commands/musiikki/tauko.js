const { SlashCommandBuilder } = require("discord.js");
const { satunnainen } = require("../../utils/satunnainen");
const { valmisteleOhjaus } = require("../../utils/musiikki/ohjain");
const { TAUOLLA, JATKUU, EI_SOI } = require("../../utils/musiikki/viestit");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("tauko")
        .setDescription("Pysäyttää musiikin tauolle tai jatkaa sitä."),

    async execute(interaction) {
        const soitin = await valmisteleOhjaus(interaction);
        if (!soitin) return;

        const tila = soitin.tauko();
        if (!tila) {
            return interaction.reply({ content: satunnainen(EI_SOI), ephemeral: true });
        }

        await interaction.reply(satunnainen(tila === "tauolla" ? TAUOLLA : JATKUU));
    }
};
