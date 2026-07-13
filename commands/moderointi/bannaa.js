const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("bannaa")
        .setDescription("Bannaa käyttäjän palvelimelta.")
        .addUserOption(option =>
            option.setName("kayttaja").setDescription("Bannattava käyttäjä").setRequired(true)
        )
        .addStringOption(option =>
            option.setName("syy").setDescription("Syy bannille").setRequired(false)
        )
        .addIntegerOption(option =>
            option
                .setName("poista_viestit_paivaa")
                .setDescription("Poista käyttäjän viestit näiltä viimeisiltä päiviltä (0-7)")
                .setMinValue(0)
                .setMaxValue(7)
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {

        const user = interaction.options.getUser("kayttaja");
        const reason = interaction.options.getString("syy") ?? "Syytä ei annettu";
        const deleteDays = interaction.options.getInteger("poista_viestit_paivaa") ?? 0;
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (member && !member.bannable) {
            return interaction.reply({
                content: "En voi bannata tätä käyttäjää — tarkista roolijärjestys ja oikeuteni.",
                ephemeral: true
            });
        }

        await interaction.guild.members.ban(user.id, {
            reason,
            deleteMessageSeconds: deleteDays * 24 * 60 * 60
        });

        const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription(`🔨 **${user.tag}** bannattiin palvelimelta.\n**Syy:** ${reason}`);

        await interaction.reply({ embeds: [embed] });

    }
};
