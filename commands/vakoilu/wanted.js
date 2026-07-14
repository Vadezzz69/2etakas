const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { hashKoodinimi } = require("../../utils/vakoiludata");
const { RIKOKSET, satunnainen, satunnaisVali } = require("../../utils/komiteadata");
const { VARIT } = require("../../utils/tyyli");
const { ehkaKaannaKutsujaksi } = require("../../utils/trolli");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("wanted")
        .setDescription("Julkaisee virallisen etsintäkuulutuksen.")
        .addUserOption(option =>
            option.setName("kohde").setDescription("Etsintäkuulutettava henkilö").setRequired(true)
        ),

    async execute(interaction) {

        const pyydetty = interaction.options.getUser("kohde");
        const { kohde, kaannetty, kommentti } = ehkaKaannaKutsujaksi(interaction, pyydetty);

        const koodinimi = hashKoodinimi(kohde.id);
        const rikos = satunnainen(RIKOKSET);
        const palkkio = satunnaisVali(50, 5000);

        const embed = new EmbedBuilder()
            .setColor(VARIT.PERUS)
            .setTitle("🚨 ETSINTÄKUULUTUS 🚨")
            .setThumbnail(kohde.displayAvatarURL())
            .setDescription(
                (kaannetty ? `${kommentti}\n\n` : "") +
                `**Nimi:** ${kohde.username}\n` +
                `**Koodinimi:** "${koodinimi}"\n` +
                `**Epäilty rikos:** ${rikos}\n\n` +
                `💰 **Palkkio:** ${palkkio} komitea-kolikkoa (elävänä tai — mieluummin — kahvikupposen kanssa)`
            )
            .setFooter({ text: "Vihjeet vastaanotetaan mielellään yksityisviestillä komitealle." });

        await interaction.reply({ embeds: [embed] });

    }
};
