const { SlashCommandBuilder } = require("discord.js");
const { satunnainen } = require("../../utils/satunnainen");
const { valmisteleOhjaus } = require("../../utils/musiikki/ohjain");
const { SEKOITETTU, JONO_TYHJA, tayta } = require("../../utils/musiikki/viestit");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("sekoita")
        .setDescription("Sekoittaa jonossa olevat kappaleet satunnaiseen järjestykseen."),

    async execute(interaction) {
        const soitin = await valmisteleOhjaus(interaction);
        if (!soitin) return;

        if (soitin.jono.length < 2) {
            return interaction.reply({ content: satunnainen(JONO_TYHJA), ephemeral: true });
        }

        const maara = soitin.sekoita();
        await interaction.reply(tayta(satunnainen(SEKOITETTU), { n: maara }));
    }
};
