const { SlashCommandBuilder } = require("discord.js");
const { report, formatDuration } = require("../../utils/ui");
const { analyzeUserStats, collectUserStats } = require("../../utils/statsEngine");
const { analyzeRoast } = require("../../utils/roastEngine");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("roast")
        .setDescription("Komitea kommentoi kohteen oikeaa palvelinhistoriaa.")
        .addUserOption(option =>
            option.setName("kayttaja").setDescription("Kuka tarkastetaan").setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const user = interaction.options.getUser("kayttaja");
        const [analysis, stats, roast] = await Promise.all([
            analyzeUserStats(interaction.guildId, user.id),
            collectUserStats(interaction.guildId, user.id),
            analyzeRoast(interaction.guildId, user.id)
        ]);

        const embed = report({
            title: `🔥 Komitean huomio — ${user.username}`,
            description: roast.text,
            thumbnail: user.displayAvatarURL(),
            fields: [
                { name: "Riskitaso", value: analysis.risk, inline: true },
                { name: "Aktiivisuus", value: analysis.activityLevel, inline: true },
                { name: "Merkinnät", value: analysis.badges.join(" • ") || "Ei erityisiä merkintöjä" },
                { name: "Viestejä yhteensä", value: `${stats.messages.total}`, inline: true },
                { name: "Äänikanavalla yhteensä", value: formatDuration(stats.voice.totalSeconds), inline: true },
                { name: "Komentoja", value: `${stats.commandUsage}`, inline: true }
            ]
        });

        await interaction.editReply({ embeds: [embed] });
    }
};
