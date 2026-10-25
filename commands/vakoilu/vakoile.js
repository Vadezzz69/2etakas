const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { VAKOILURAPORTIT, hashKoodinimi } = require("../../utils/vakoiludata");
const { satunnainen, satunnaisVali } = require("../../utils/satunnainen");
const { VARIT } = require("../../utils/tyyli");
const { ehkaKaannaKutsujaksi } = require("../../utils/trolli");
const { VAKOILU_OTSIKOT, VAKOILU_FOOTERIT, BOTTI_ESTOT } = require("../../utils/comedy/data/viestit");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("vakoile")
        .setDescription("Käynnistää valvontaoperaation valittua käyttäjää vastaan.")
        .addUserOption(option =>
            option.setName("kohde").setDescription("Kuka asetetaan valvontaan").setRequired(true)
        ),

    async execute(interaction) {

        const pyydetty = interaction.options.getUser("kohde");

        if (pyydetty.id === interaction.client.user.id) {
            return interaction.reply({
                content: satunnainen(BOTTI_ESTOT),
                ephemeral: true
            });
        }

        const { kohde, kaannetty, kommentti } = ehkaKaannaKutsujaksi(interaction, pyydetty);

        const raportti = satunnainen(VAKOILURAPORTIT);
        const koodinimi = hashKoodinimi(kohde.id);

        const embed = new EmbedBuilder()
            .setColor(VARIT.AKSENTTI)
            .setTitle(satunnainen(VAKOILU_OTSIKOT))
            .setThumbnail(kohde.displayAvatarURL())
            .addFields(
                { name: "Kohde", value: `${kohde} (koodinimi: "${koodinimi}")` },
                { name: "Havainto", value: raportti },
                { name: "Raportoija", value: `${interaction.user}`, inline: true },
                { name: "Luottamustaso", value: `${satunnaisVali(60, 100)}%`, inline: true }
            )
            .setFooter({ text: satunnainen(VAKOILU_FOOTERIT) })
            .setTimestamp();

        if (kaannetty) {
            embed.setDescription(kommentti);
        }

        await interaction.reply({ embeds: [embed] });

    }
};
