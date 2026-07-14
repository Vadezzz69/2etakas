const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { kayttajanViestitTanaan, kayttajanAaniTanaanElavana } = require("../../utils/tilastot");
const { get } = require("../../utils/db");
const { VARIT } = require("../../utils/tyyli");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("aktiivisuus")
        .setDescription("Näyttää käyttäjän tämän päivän aktiivisuuden.")
        .addUserOption(option =>
            option.setName("kayttaja").setDescription("Kenen aktiivisuus näytetään (oletus: sinä)").setRequired(false)
        ),

    async execute(interaction) {

        const kayttaja = interaction.options.getUser("kayttaja") ?? interaction.user;

        const [viestit, aaniSekunnit, komennotRivi] = await Promise.all([
            kayttajanViestitTanaan(interaction.guildId, kayttaja.id),
            kayttajanAaniTanaanElavana(interaction.guildId, kayttaja.id),
            get(
                `SELECT COUNT(*) as count FROM command_usage
                 WHERE guildId = ? AND userId = ? AND timestamp >= ?`,
                [interaction.guildId, kayttaja.id, new Date().setUTCHours(0, 0, 0, 0)]
            )
        ]);

        const embed = new EmbedBuilder()
            .setColor(VARIT.PERUS)
            .setTitle(`📊 ${kayttaja.username}n aktiivisuus tänään`)
            .setThumbnail(kayttaja.displayAvatarURL())
            .addFields(
                { name: "Viestejä", value: `${viestit}`, inline: true },
                { name: "Aikaa äänikanavalla", value: `${Math.round(aaniSekunnit / 60)} min`, inline: true },
                { name: "Komentoja käytetty", value: `${komennotRivi?.count ?? 0}`, inline: true }
            );

        await interaction.reply({ embeds: [embed] });

    }
};
