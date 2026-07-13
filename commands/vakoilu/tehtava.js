const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { satunnainen, TEHTAVAT, hashKoodinimi } = require("../../utils/vakoiludata");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("tehtava")
        .setDescription("Arpoo sinulle salaisen komiteatehtävän."),

    async execute(interaction) {

        const tehtava = satunnainen(TEHTAVAT);
        const koodinimi = hashKoodinimi(interaction.user.id);

        const embed = new EmbedBuilder()
            .setColor(0xB59410)
            .setTitle("📋 Uusi tehtävä vastaanotettu")
            .setDescription(
                `Agentti **${koodinimi}**, komitea on hyväksynyt sinulle seuraavan operaation:`
            )
            .addFields(
                { name: "Operaation nimi", value: tehtava.nimi },
                { name: "Vaikeustaso", value: tehtava.vaikeus, inline: true },
                { name: "Palkkio onnistumisesta", value: tehtava.palkkio, inline: true }
            )
            .setFooter({ text: "Tämä viesti tuhoutuu itsestään... teoriassa." });

        await interaction.reply({ embeds: [embed] });

    }
};
