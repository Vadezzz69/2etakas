const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { satunnainen, VAKOILURAPORTIT, hashKoodinimi } = require("../../utils/vakoiludata");
const { VARIT } = require("../../utils/tyyli");
const { ehkaKaannaKutsujaksi } = require("../../utils/trolli");

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
                content: "Et voi vakoilla minua. Minä vakoilen sinua. 👁️",
                ephemeral: true
            });
        }

        const { kohde, kaannetty, kommentti } = ehkaKaannaKutsujaksi(interaction, pyydetty);

        const raportti = satunnainen(VAKOILURAPORTIT);
        const koodinimi = hashKoodinimi(kohde.id);

        const embed = new EmbedBuilder()
            .setColor(VARIT.AKSENTTI)
            .setTitle("📡 Valvontaraportti")
            .setThumbnail(kohde.displayAvatarURL())
            .addFields(
                { name: "Kohde", value: `${kohde} (koodinimi: "${koodinimi}")` },
                { name: "Havainto", value: raportti },
                { name: "Raportoija", value: `${interaction.user}`, inline: true },
                { name: "Luottamustaso", value: `${Math.floor(Math.random() * 41) + 60}%`, inline: true }
            )
            .setFooter({ text: "TÄYSIN SALAINEN — ei jaettavaksi eteenpäin" })
            .setTimestamp();

        if (kaannetty) {
            embed.setDescription(kommentti);
        }

        await interaction.reply({ embeds: [embed] });

    }
};
