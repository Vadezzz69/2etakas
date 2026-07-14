const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { viestiLista, aaniLista, komentoLista } = require("../../utils/tilastot");
const { VARIT } = require("../../utils/tyyli");

const MITALIT = ["🥇", "🥈", "🥉"];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("Näyttää tämän päivän ennätyslistan.")
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
        ),

    async execute(interaction) {

        const kategoria = interaction.options.getString("kategoria");

        let rivit;
        let otsikko;
        let muotoile;

        if (kategoria === "viestit") {
            rivit = await viestiLista(interaction.guildId);
            otsikko = "💬 Tämän päivän viestiennätykset";
            muotoile = r => `**${r.count}** viestiä`;
        } else if (kategoria === "aani") {
            rivit = await aaniLista(interaction.guildId);
            otsikko = "🔊 Tämän päivän äänikanavaennätykset";
            muotoile = r => `**${Math.round(r.seconds / 60)}** minuuttia`;
        } else {
            rivit = await komentoLista(interaction.guildId);
            otsikko = "⚙️ Tämän päivän komentoennätykset";
            muotoile = r => `**${r.count}** komentoa`;
        }

        if (!rivit.length) {
            return interaction.reply("Tälle kategorialle ei ole vielä tänään kertynyt dataa.");
        }

        const embed = new EmbedBuilder()
            .setColor(VARIT.PERUS)
            .setTitle(otsikko)
            .setDescription(
                rivit
                    .map((r, i) => `${MITALIT[i] ?? `${i + 1}.`} <@${r.userId}> — ${muotoile(r)}`)
                    .join("\n")
            )
            .setFooter({ text: "Tilastot nollautuvat joka päivä UTC-ajassa keskiyöllä." });

        await interaction.reply({ embeds: [embed] });

    }
};
