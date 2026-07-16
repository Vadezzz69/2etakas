const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { viestiListaAikavalilla, aaniListaAikavalilla, komentoListaAikavalilla } = require("../../utils/tilastot");
const { VARIT } = require("../../utils/tyyli");

const MITALIT = ["🥇", "🥈", "🥉"];

const AIKAVALI_NIMET = {
    tanaan: "Tänään",
    viikko: "Viimeiset 7 päivää",
    kuukausi: "Viimeiset 30 päivää",
    kaikki: "Koko historia"
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rankingit")
        .setDescription("Pitkäaikainen ennätyslista — valittavalla aikavälillä.")
        .addStringOption(option =>
            option
                .setName("kategoria")
                .setDescription("Minkä perusteella listataan")
                .setRequired(true)
                .addChoices(
                    { name: "Viestit", value: "viestit" },
                    { name: "Äänikanava", value: "aani" },
                    { name: "Komentojen käyttö", value: "komennot" }
                )
        )
        .addStringOption(option =>
            option
                .setName("aikavali")
                .setDescription("Miltä aikaväliltä (oletus: koko historia)")
                .setRequired(false)
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
        let otsikkoEmoji;
        let muotoile;

        if (kategoria === "viestit") {
            rivit = await viestiListaAikavalilla(interaction.guildId, aikavali);
            otsikkoEmoji = "💬";
            muotoile = r => `**${r.count}** viestiä`;
        } else if (kategoria === "aani") {
            rivit = await aaniListaAikavalilla(interaction.guildId, aikavali);
            otsikkoEmoji = "🔊";
            muotoile = r => `**${Math.round(r.seconds / 60)}** minuuttia`;
        } else {
            rivit = await komentoListaAikavalilla(interaction.guildId, aikavali);
            otsikkoEmoji = "⚙️";
            muotoile = r => `**${r.count}** komentoa`;
        }

        if (!rivit.length) {
            return interaction.reply("Tälle aikavälille ja kategorialle ei löytynyt yhtään dataa.");
        }

        const embed = new EmbedBuilder()
            .setColor(VARIT.PERUS)
            .setTitle(`${otsikkoEmoji} Rankingit — ${AIKAVALI_NIMET[aikavali]}`)
            .setDescription(
                rivit
                    .map((r, i) => `${MITALIT[i] ?? `${i + 1}.`} <@${r.userId}> — ${muotoile(r)}`)
                    .join("\n")
            )
            .setFooter({ text: "Data perustuu koko tallennettuun historiaan, ei vain muistiin." });

        await interaction.reply({ embeds: [embed] });

    }
};
