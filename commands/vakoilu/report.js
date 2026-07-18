const { SlashCommandBuilder } = require("discord.js");
const { report, formatDuration } = require("../../utils/ui");
const { analyzeUserStats, collectUserStats } = require("../../utils/statsEngine");
const { generateRoast } = require("../../utils/roastEngine");
const { hashKoodinimi } = require("../../utils/vakoiludata");
const { ehkaKaannaKutsujaksi } = require("../../utils/trolli");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("report")
        .setDescription("Luo palvelinaktiivisuuteen perustuvan komitearaportin.")
        .addUserOption(option =>
            option.setName("kohde").setDescription("Kenestä raportoidaan").setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const requestedUser = interaction.options.getUser("kohde");
        const { kohde: user, kaannetty, kommentti } = ehkaKaannaKutsujaksi(interaction, requestedUser);
        const [analysis, userStats, roast] = await Promise.all([
            analyzeUserStats(interaction.guildId, user.id),
            collectUserStats(interaction.guildId, user.id),
            generateRoast(interaction.guildId, user.id)
        ]);

        const embed = report({
            title: "📄 Komitean raportti",
            thumbnail: user.displayAvatarURL(),
            description: kaannetty ? kommentti : analysis.summary,
            fields: [
                { name: "Kohde", value: `${user} ("${hashKoodinimi(user.id)}")` },
                { name: "Viestejä tänään", value: `${userStats.messages.today}`, inline: true },
                { name: "Äänikanavalla", value: formatDuration(userStats.voice.todaySeconds), inline: true },
                { name: "Riskitaso", value: analysis.risk, inline: true },
                { name: "Komitean huomio", value: roast },
                { name: "Merkinnät", value: analysis.badges.join(" • ") || "Ei erityisiä merkintöjä" }
            ]
        });

        await interaction.editReply({ embeds: [embed] });
    }
};
