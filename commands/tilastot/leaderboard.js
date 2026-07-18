const { SlashCommandBuilder } = require("discord.js");
const { ranking, formatDuration } = require("../../utils/ui");
const { viestiLista, aaniListaElavana, komentoLista } = require("../../utils/tilastot");

const MEDALS = ["🥇", "🥈", "🥉"];

const CATEGORIES = {
    viestit: {
        title: "💬 Tämän päivän viestiennätykset",
        getRows: viestiLista,
        format: row => `**${row.count}** viestiä`
    },
    aani: {
        title: "🔊 Tämän päivän äänikanavaennätykset",
        getRows: aaniListaElavana,
        format: row => `**${formatDuration(row.seconds)}**`
    },
    komennot: {
        title: "⚙️ Tämän päivän komentoennätykset",
        getRows: komentoLista,
        format: row => `**${row.count}** komentoa`
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("Näyttää tämän päivän ennätyslistan.")
        .addStringOption(option => option
            .setName("kategoria")
            .setDescription("Minkä perusteella listataan")
            .setRequired(true)
            .addChoices(
                { name: "Viestit", value: "viestit" },
                { name: "Äänikanava", value: "aani" },
                { name: "Komentojen käyttö", value: "komennot" }
            )),

    async execute(interaction) {
        const category = CATEGORIES[interaction.options.getString("kategoria")];
        const rows = await category.getRows(interaction.guildId);

        if (!rows.length) {
            return interaction.reply("Tälle kategorialle ei ole vielä tänään kertynyt dataa.");
        }

        const description = rows
            .map((row, index) => `${MEDALS[index] ?? `${index + 1}.`} <@${row.userId}> — ${category.format(row)}`)
            .join("\n");

        await interaction.reply({
            embeds: [ranking({
                title: category.title,
                description,
                footer: "Tilastot nollautuvat joka päivä UTC-ajassa keskiyöllä."
            })]
        });
    }
};
