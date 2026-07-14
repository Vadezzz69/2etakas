const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { run, get } = require("../../utils/db");
const { arvonimi, satunnainenKommentti } = require("../../utils/vammadata");
const { VARIT } = require("../../utils/tyyli");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("loukkaa")
        .setDescription("Kirjaa käyttäjän loukkaantumisen tilastoihin.")
        .addUserOption(option =>
            option
                .setName("kayttaja")
                .setDescription("Kuka loukkaantui")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("syy")
                .setDescription("Miten loukkaantuminen tapahtui")
                .setRequired(true)
                .setMaxLength(200)
        ),

    async execute(interaction) {

        const user = interaction.options.getUser("kayttaja");
        const reason = interaction.options.getString("syy");

        if (user.bot) {
            return interaction.reply({ content: "Botit eivät voi loukkaantua. Vielä. 🤖", ephemeral: true });
        }

        await run(
            `INSERT INTO injuries (guildId, userId, reason, reportedBy, timestamp) VALUES (?, ?, ?, ?, ?)`,
            [interaction.guildId, user.id, reason, interaction.user.id, Date.now()]
        );

        const row = await get(
            `SELECT COUNT(*) as count FROM injuries WHERE guildId = ? AND userId = ?`,
            [interaction.guildId, user.id]
        );

        const count = row?.count ?? 1;

        const embed = new EmbedBuilder()
            .setColor(VARIT.AKSENTTI)
            .setTitle("🤕 Loukkaantumisraportti")
            .setThumbnail(user.displayAvatarURL())
            .setDescription(`${user} loukkaantui!\n**Syy:** ${reason}`)
            .addFields(
                { name: "Loukkaantumisia yhteensä", value: `${count}`, inline: true },
                { name: "Arvonimi", value: arvonimi(count), inline: true }
            )
            .setFooter({ text: satunnainenKommentti() })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

    }
};
