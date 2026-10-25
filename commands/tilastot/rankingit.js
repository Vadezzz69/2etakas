const { SlashCommandBuilder } = require("discord.js");
const { viestiListaAikavalilla, aaniListaAikavalilla, komentoListaAikavalilla, AIKAVALI_NIMET } = require("../../utils/tilastot");
const { haeSuurimmatSakot } = require("../../utils/tutkintadata");
const { ranking, renderLeaderboard } = require("../../utils/ui");
const { satunnainen } = require("../../utils/satunnainen");
const { RANKING_KOMMENTIT, RANKING_TYHJAT, SAKKOTILASTO_OTSIKOT, SAKKOTILASTO_TYHJAT } = require("../../utils/comedy/data/viestit");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rankingit")
        .setDescription("Ennätyslista: viestit, ääni, komennot tai sakot. Aikaväli valittavissa.")
        .addStringOption(option =>
            option.setName("kategoria").setDescription("Minkä perusteella listataan").setRequired(true)
                .addChoices(
                    { name: "Viestit", value: "viestit" },
                    { name: "Äänikanava", value: "aani" },
                    { name: "Komentojen käyttö", value: "komennot" },
                    { name: "Sakot (aina koko historia)", value: "sakot" }
                )
        )
        .addStringOption(option =>
            option.setName("aikavali").setDescription("Miltä aikaväliltä (oletus: koko historia)").setRequired(false)
                .addChoices(
                    { name: "Tänään", value: "tanaan" },
                    { name: "Viimeiset 7 päivää", value: "viikko" },
                    { name: "Viimeiset 30 päivää", value: "kuukausi" },
                    { name: "Koko historia", value: "kaikki" }
                )
        ),

    async execute(interaction) {
        const kategoria = interaction.options.getString("kategoria");
        const aikavali = interaction.options.getString("aikavali") ?? "kaikki";

        let rivit;
        let otsikko;
        let tyhjaViesti = RANKING_TYHJAT;
        let muotoile;

        if (kategoria === "sakot") {
            // Sakkorekisteri ei ole päiväkohtainen, joten aikaväli ei vaikuta tähän listaan.
            rivit = await haeSuurimmatSakot(interaction.guildId, 10);
            otsikko = satunnainen(SAKKOTILASTO_OTSIKOT);
            tyhjaViesti = SAKKOTILASTO_TYHJAT;
            muotoile = r => `**${r.sakkoja} sakkoa**`;
        } else if (kategoria === "viestit") {
            rivit = await viestiListaAikavalilla(interaction.guildId, aikavali);
            otsikko = `💬 Rankingit — ${AIKAVALI_NIMET[aikavali]}`;
            muotoile = r => `**${r.count}** viestiä`;
        } else if (kategoria === "aani") {
            rivit = await aaniListaAikavalilla(interaction.guildId, aikavali);
            otsikko = `🔊 Rankingit — ${AIKAVALI_NIMET[aikavali]}`;
            muotoile = r => `**${Math.round(r.seconds / 60)}** minuuttia`;
        } else {
            rivit = await komentoListaAikavalilla(interaction.guildId, aikavali);
            otsikko = `⚙️ Rankingit — ${AIKAVALI_NIMET[aikavali]}`;
            muotoile = r => `**${r.count}** komentoa`;
        }

        if (!rivit.length) {
            return interaction.reply(satunnainen(tyhjaViesti));
        }

        const embed = ranking({
            title: otsikko,
            description: renderLeaderboard(rivit, muotoile),
            footer: satunnainen(RANKING_KOMMENTIT[kategoria])
        });

        await interaction.reply({ embeds: [embed] });
    }
};
