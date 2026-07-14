const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const {
    aktiivisinKirjoittaja,
    aktiivisinAanikanavassaElavana,
    aktiivisinKomennoissa
} = require("../../utils/tilastot");
const { RANGAISTUKSET, satunnainen, satunnaisVali } = require("../../utils/komiteadata");
const { VARIT } = require("../../utils/tyyli");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("komitea")
        .setDescription("Komitea julkistaa tämän päivän päätöksen — oikeaan aktiivisuuteen perustuen."),

    async execute(interaction) {

        await interaction.deferReply();

        const guildId = interaction.guildId;

        // Haetaan kaikki kolme kategoriaa rinnakkain.
        const [kirjoittaja, aanessa, komentaja] = await Promise.all([
            aktiivisinKirjoittaja(guildId),
            aktiivisinAanikanavassaElavana(guildId),
            aktiivisinKomennoissa(guildId)
        ]);

        const vaihtoehdot = [];

        if (kirjoittaja && kirjoittaja.count > 0) {
            vaihtoehdot.push({
                tyyppi: "viestit",
                userId: kirjoittaja.userId,
                lause: `kirjoitti tänään **${kirjoittaja.count}** viestiä`
            });
        }

        if (aanessa && aanessa.seconds > 0) {
            const minuutit = Math.round(aanessa.seconds / 60);
            vaihtoehdot.push({
                tyyppi: "aani",
                userId: aanessa.userId,
                lause: `vietti äänikanavalla tänään **${minuutit}** minuuttia`
            });
        }

        if (komentaja && komentaja.count > 0) {
            vaihtoehdot.push({
                tyyppi: "komennot",
                userId: komentaja.userId,
                lause: `käytti botin komentoja tänään **${komentaja.count}** kertaa`
            });
        }

        if (vaihtoehdot.length === 0) {
            return interaction.editReply(
                "📭 Komitea kokoontui, mutta ei löytänyt tarpeeksi tämän päivän aktiivisuutta " +
                "minkään päätöksen tekemiseen. Osallistukaa keskusteluun, niin komitea palaa asiaan."
            );
        }

        const valittu = satunnainen(vaihtoehdot);
        const rangaistus = satunnainen(RANGAISTUKSET);
        const paatosnumero = satunnaisVali(100, 999);

        const embed = new EmbedBuilder()
            .setColor(VARIT.AKSENTTI)
            .setTitle(`🕵️ KOMITEAN PÄÄTÖS #${paatosnumero}`)
            .setDescription(
                `Tutkimusten mukaan <@${valittu.userId}> ${valittu.lause}.\n\n` +
                `**Rangaistus:**\n${rangaistus}`
            )
            .setFooter({ text: "Komitean päätökset ovat lopullisia ja täysin humoristisia." })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    }
};
