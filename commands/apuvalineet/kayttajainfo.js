const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("kayttajainfo")
        .setDescription("Näyttää tietoa käyttäjästä.")
        .addUserOption(option =>
            option
                .setName("kayttaja")
                .setDescription("Käyttäjä jonka tiedot haetaan (oletus: sinä)")
                .setRequired(false)
        ),

    async execute(interaction) {

        const user = interaction.options.getUser("kayttaja") ?? interaction.user;
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        const embed = new EmbedBuilder()
            .setColor(0xFEE75C)
            .setTitle(user.tag)
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                { name: "Liittyi Discordiin", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`, inline: true },
                { name: "Liittyi palvelimelle", value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>` : "Ei tiedossa", inline: true }
            );

        await interaction.reply({ embeds: [embed] });

    }
};
