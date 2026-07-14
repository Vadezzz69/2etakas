const { SlashCommandBuilder } = require("discord.js");
const { satunnainen, VAKOILURAPORTIT } = require("../../utils/vakoiludata");
const { ehkaKaannaKutsujaksi } = require("../../utils/trolli");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("spy")
        .setDescription("Nopea vakoiluhavainto tägätystä käyttäjästä. (Kattavampi versio: /vakoile)")
        .addUserOption(option =>
            option.setName("kohde").setDescription("Kuka vakoillaan").setRequired(true)
        ),

    async execute(interaction) {

        const pyydetty = interaction.options.getUser("kohde");
        const { kohde, kaannetty, kommentti } = ehkaKaannaKutsujaksi(interaction, pyydetty);
        const havainto = satunnainen(VAKOILURAPORTIT);

        const viesti = kaannetty
            ? `${kommentti}\n\n👁️ **Havainto kohteesta** ${kohde}:\n> ${havainto}`
            : `👁️ **Havainto kohteesta** ${kohde}:\n> ${havainto}`;

        await interaction.reply(viesti);

    }
};
