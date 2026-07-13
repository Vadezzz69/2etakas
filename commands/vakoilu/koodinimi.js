const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { hashKoodinimi } = require("../../utils/vakoiludata");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("koodinimi")
        .setDescription("Paljastaa sinun (tai jonkun muun) virallisen vakoojan koodinimen.")
        .addUserOption(option =>
            option
                .setName("kayttaja")
                .setDescription("Kenen koodinimi paljastetaan (oletus: sinä)")
                .setRequired(false)
        ),

    async execute(interaction) {

        const user = interaction.options.getUser("kayttaja") ?? interaction.user;
        const koodinimi = hashKoodinimi(user.id);

        const embed = new EmbedBuilder()
            .setColor(0x2B2D31)
            .setTitle("🕵️ Salainen tiedosto")
            .setDescription(
                `**${user.username}** tunnetaan komiteassa koodinimellä:\n\n` +
                `## "${koodinimi}"\n\n` +
                `*Tämä tieto on luokiteltu. Sen paljastaminen ulkopuolisille on vastoin komitean sääntöjä.*`
            )
            .setThumbnail(user.displayAvatarURL());

        await interaction.reply({ embeds: [embed] });

    }
};
