const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("potkaise")
        .setDescription("Potkaisee käyttäjän palvelimelta.")
        .addUserOption(option =>
            option.setName("kayttaja").setDescription("Potkaistava käyttäjä").setRequired(true)
        )
        .addStringOption(option =>
            option.setName("syy").setDescription("Syy potkulle").setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {

        const user = interaction.options.getUser("kayttaja");
        const reason = interaction.options.getString("syy") ?? "Syytä ei annettu";
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) {
            return interaction.reply({ content: "Käyttäjää ei löytynyt palvelimelta.", ephemeral: true });
        }

        if (!member.kickable) {
            return interaction.reply({
                content: "En voi potkaista tätä käyttäjää — tarkista roolijärjestys ja oikeuteni.",
                ephemeral: true
            });
        }

        await member.kick(reason);

        const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription(`👢 **${user.tag}** potkaistiin palvelimelta.\n**Syy:** ${reason}`);

        await interaction.reply({ embeds: [embed] });

    }
};
