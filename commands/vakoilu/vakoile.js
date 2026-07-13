const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { satunnainen, VAKOILURAPORTIT, hashKoodinimi } = require("../../utils/vakoiludata");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("vakoile")
        .setDescription("Käynnistää valvontaoperaation valittua käyttäjää vastaan.")
        .addUserOption(option =>
            option.setName("kohde").setDescription("Kuka asetetaan valvontaan").setRequired(true)
        ),

    async execute(interaction) {

        const kohde = interaction.options.getUser("kohde");

        if (kohde.id === interaction.client.user.id) {
            return interaction.reply({
                content: "Et voi vakoilla minua. Minä vakoilen sinua. 👁️",
                ephemeral: true
            });
        }

        const raportti = satunnainen(VAKOILURAPORTIT);
        const koodinimi = hashKoodinimi(kohde.id);

        const embed = new EmbedBuilder()
            .setColor(0x992D22)
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

        await interaction.reply({ embeds: [embed] });

    }
};
