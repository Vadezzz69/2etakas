const { SlashCommandBuilder } = require("discord.js");
const { satunnainen } = require("../../utils/satunnainen");
const { valmisteleOhjaus } = require("../../utils/musiikki/ohjain");
const { turvallinen } = require("../../utils/musiikki/muotoilu");
const { OHITETTU, EI_SOI, tayta } = require("../../utils/musiikki/viestit");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ohita")
        .setDescription("Ohittaa nykyisen kappaleen."),

    async execute(interaction) {
        const soitin = await valmisteleOhjaus(interaction);
        if (!soitin) return;

        const ohitettu = soitin.ohita();
        if (!ohitettu) {
            return interaction.reply({ content: satunnainen(EI_SOI), ephemeral: true });
        }

        await interaction.reply({
            content: tayta(satunnainen(OHITETTU), { otsikko: turvallinen(ohitettu.otsikko) }),
            allowedMentions: { parse: [] }
        });
    }
};
