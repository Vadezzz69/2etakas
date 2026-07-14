const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { satunnainen, SALAISUUDET } = require("../../utils/vakoiludata");
const { VARIT } = require("../../utils/tyyli");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("salaisuus")
        .setDescription("Paljastaa yhden komitean tiukasti vartioiduista salaisuuksista."),

    async execute(interaction) {

        const salaisuus = satunnainen(SALAISUUDET);

        const embed = new EmbedBuilder()
            .setColor(VARIT.PERUS)
            .setTitle("🔓 LUOKITELTU — Taso Omega")
            .setDescription(`||${salaisuus}||`)
            .setFooter({ text: "Klikkaa paljastaaksesi. Unohda heti lukemisen jälkeen." });

        await interaction.reply({ embeds: [embed] });

    }
};
