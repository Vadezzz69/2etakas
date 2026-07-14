const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { get, all } = require("../../utils/db");
const { arvonimi } = require("../../utils/vammadata");
const { VARIT } = require("../../utils/tyyli");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("vammatilastot")
        .setDescription("Näyttää loukkaantumistilastot — yksittäiselle käyttäjälle tai koko palvelimelle.")
        .addUserOption(option =>
            option
                .setName("kayttaja")
                .setDescription("Näytä tietyn käyttäjän tilastot (jätä tyhjäksi = ennätyslista)")
                .setRequired(false)
        ),

    async execute(interaction) {

        const target = interaction.options.getUser("kayttaja");

        if (target) {

            const row = await get(
                `SELECT COUNT(*) as count FROM injuries WHERE guildId = ? AND userId = ?`,
                [interaction.guildId, target.id]
            );

            const count = row?.count ?? 0;

            if (count === 0) {
                return interaction.reply(`${target.username} ei ole loukkaantunut kertaakaan. Vielä. 🍀`);
            }

            const recent = await all(
                `SELECT reason, timestamp FROM injuries WHERE guildId = ? AND userId = ? ORDER BY timestamp DESC LIMIT 5`,
                [interaction.guildId, target.id]
            );

            const embed = new EmbedBuilder()
                .setColor(VARIT.AKSENTTI)
                .setTitle(`🩹 ${target.username}n loukkaantumistilastot`)
                .setThumbnail(target.displayAvatarURL())
                .addFields(
                    { name: "Loukkaantumisia yhteensä", value: `${count}`, inline: true },
                    { name: "Arvonimi", value: arvonimi(count), inline: true },
                    {
                        name: "Viimeisimmät tapaukset",
                        value: recent
                            .map(r => `• ${r.reason} — <t:${Math.floor(r.timestamp / 1000)}:R>`)
                            .join("\n")
                    }
                );

            return interaction.reply({ embeds: [embed] });

        }

        const rows = await all(
            `SELECT userId, COUNT(*) as count FROM injuries WHERE guildId = ? GROUP BY userId ORDER BY count DESC LIMIT 10`,
            [interaction.guildId]
        );

        if (!rows.length) {
            return interaction.reply("Ei loukkaantumisia kirjattuna vielä. Kaikki turvassa! 🛡️");
        }

        const mitalit = ["🥇", "🥈", "🥉"];

        const embed = new EmbedBuilder()
            .setColor(VARIT.AKSENTTI)
            .setTitle("🏆 Palvelimen loukkaantumisten ennätyslista")
            .setDescription(
                rows
                    .map((r, i) => `${mitalit[i] ?? `${i + 1}.`} <@${r.userId}> — **${r.count}** loukkaantumista`)
                    .join("\n")
            );

        await interaction.reply({ embeds: [embed] });

    }
};
