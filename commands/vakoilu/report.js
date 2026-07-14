const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { kayttajanViestitTanaan, kayttajanAaniTanaanElavana } = require("../../utils/tilastot");
const { hashKoodinimi } = require("../../utils/vakoiludata");
const { VARIT } = require("../../utils/tyyli");
const { ehkaKaannaKutsujaksi } = require("../../utils/trolli");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("report")
        .setDescription("Luo virallisen vakoiluraportin oikeaan tämän päivän aktiivisuuteen perustuen.")
        .addUserOption(option =>
            option.setName("kohde").setDescription("Kenestä raportoidaan").setRequired(true)
        ),

    async execute(interaction) {

        await interaction.deferReply();

        const pyydetty = interaction.options.getUser("kohde");
        const { kohde, kaannetty, kommentti } = ehkaKaannaKutsujaksi(interaction, pyydetty);

        const [viestit, aaniSekunnit] = await Promise.all([
            kayttajanViestitTanaan(interaction.guildId, kohde.id),
            kayttajanAaniTanaanElavana(interaction.guildId, kohde.id)
        ]);

        const aaniMinuutit = Math.round(aaniSekunnit / 60);
        const koodinimi = hashKoodinimi(kohde.id);

        let arvio;
        if (viestit === 0 && aaniMinuutit === 0) {
            arvio = "Kohde on onnistunut pysymään täysin tutkan alla tänään. Epäilyttävän ammattimaista.";
        } else if (viestit > 50) {
            arvio = "Kohteen viestimäärä viittaa joko erittäin tärkeään operaatioon tai vakavaan keskittymisongelmaan.";
        } else if (aaniMinuutit > 60) {
            arvio = "Kohde on viettänyt epäilyttävän paljon aikaa äänikanavalla. Mahdollinen salainen kokous?";
        } else {
            arvio = "Kohteen toiminta vaikuttaa toistaiseksi tavanomaiselta. Tarkkailua jatketaan.";
        }

        const embed = new EmbedBuilder()
            .setColor(VARIT.PERUS)
            .setTitle("📄 Virallinen vakoiluraportti")
            .setThumbnail(kohde.displayAvatarURL())
            .addFields(
                { name: "Kohde", value: `${kohde} ("${koodinimi}")` },
                { name: "Viestejä tänään", value: `${viestit}`, inline: true },
                { name: "Aikaa äänikanavalla", value: `${aaniMinuutit} min`, inline: true },
                { name: "Komitean arvio", value: arvio }
            )
            .setFooter({ text: "Data on kerätty todellisesta palvelinaktiivisuudesta." })
            .setTimestamp();

        if (kaannetty) {
            embed.setDescription(kommentti);
        }

        await interaction.editReply({ embeds: [embed] });

    }
};
