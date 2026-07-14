const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { aktiivisinKirjoittaja } = require("../../utils/tilastot");
const { RIKOKSET, satunnainen } = require("../../utils/komiteadata");
const { VARIT } = require("../../utils/tyyli");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("syyllinen")
        .setDescription("Arpoo päivän syyllisen — painottaen tämän päivän aktiivisimpia."),

    async execute(interaction) {

        await interaction.deferReply();

        const kirjoittaja = await aktiivisinKirjoittaja(interaction.guildId);

        let kohdeId;
        let peruste;

        if (kirjoittaja && kirjoittaja.count > 0) {
            kohdeId = kirjoittaja.userId;
            peruste = `Epäilyt heräsivät, koska kohde oli tänään palvelimen aktiivisin kirjoittaja (${kirjoittaja.count} viestiä).`;
        } else {
            const jasenet = await interaction.guild.members.fetch();
            const ehdokkaat = jasenet.filter(m => !m.user.bot);
            const arvottu = satunnainen([...ehdokkaat.values()]);
            kohdeId = arvottu.id;
            peruste = "Ei riittävästi todisteita — komitea arpoi syyllisen puhtaasti sattumanvaraisesti.";
        }

        const rikos = satunnainen(RIKOKSET);

        const embed = new EmbedBuilder()
            .setColor(VARIT.AKSENTTI)
            .setTitle("⚖️ Päivän syyllinen on löydetty")
            .setDescription(
                `Komitea julistaa: <@${kohdeId}> on tämän päivän syyllinen.\n\n` +
                `**Epäilty rikos:** ${rikos}\n` +
                `**Peruste:** ${peruste}`
            );

        await interaction.editReply({ embeds: [embed] });

    }
};
