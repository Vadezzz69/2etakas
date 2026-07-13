const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("aikalisa")
        .setDescription("Antaa käyttäjälle aikalisän (mykistää määräajaksi).")
        .addUserOption(option =>
            option.setName("kayttaja").setDescription("Käyttäjä").setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("minuutit")
                .setDescription("Kesto minuutteina (max 40320 = 28 vrk)")
                .setMinValue(1)
                .setMaxValue(40320)
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("syy").setDescription("Syy").setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {

        const user = interaction.options.getUser("kayttaja");
        const minutes = interaction.options.getInteger("minuutit");
        const reason = interaction.options.getString("syy") ?? "Syytä ei annettu";
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) {
            return interaction.reply({ content: "Käyttäjää ei löytynyt palvelimelta.", ephemeral: true });
        }

        if (!member.moderatable) {
            return interaction.reply({
                content: "En voi antaa tälle käyttäjälle aikalisää — tarkista roolijärjestys ja oikeuteni.",
                ephemeral: true
            });
        }

        await member.timeout(minutes * 60 * 1000, reason);

        const embed = new EmbedBuilder()
            .setColor(0xFEE75C)
            .setDescription(`🔇 **${user.tag}** sai ${minutes} minuutin aikalisän.\n**Syy:** ${reason}`);

        await interaction.reply({ embeds: [embed] });

    }
};
