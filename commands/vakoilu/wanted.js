const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { hashKoodinimi } = require("../../utils/vakoiludata");
const { RIKOKSET } = require("../../utils/komiteadata");
const { satunnainen, satunnaisVali } = require("../../utils/satunnainen");
const { VARIT } = require("../../utils/tyyli");
const { ehkaKaannaKutsujaksi } = require("../../utils/trolli");
const { tayta, WANTED_OTSIKOT, WANTED_PALKKIOT, WANTED_FOOTERIT } = require("../../utils/comedy/data/viestit");

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
            .setTitle(satunnainen(WANTED_OTSIKOT))
            .setThumbnail(kohde.displayAvatarURL())
            .setDescription(
                (kaannetty ? `${kommentti}\n\n` : "") +
                `**Nimi:** ${kohde.username}\n` +
                `**Koodinimi:** "${koodinimi}"\n` +
                `**Epäilty rikos:** ${rikos}\n\n` +
                tayta(satunnainen(WANTED_PALKKIOT), { summa: palkkio })
            )
            .setFooter({ text: satunnainen(WANTED_FOOTERIT) });

        await interaction.reply({ embeds: [embed] });

    }
};
