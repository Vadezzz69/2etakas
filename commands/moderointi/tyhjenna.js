const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { VARIT } = require("../../utils/tyyli");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("tyhjenna")
        .setDescription("Poistaa useita viimeisimpiä viestejä kanavalta.")
        .addIntegerOption(option =>
            option
                .setName("maara")
                .setDescription("Poistettavien viestien määrä (1-100)")
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {

        const maara = interaction.options.getInteger("maara");

        await interaction.deferReply({ ephemeral: true });

        try {

            const poistetut = await interaction.channel.bulkDelete(maara, true);

            const embed = new EmbedBuilder()
                .setColor(VARIT.ONNISTUI)
                .setDescription(`🧹 Poistettiin **${poistetut.size}** viestiä.`);

            await interaction.editReply({ embeds: [embed] });

        } catch (err) {

            // Discord ei salli yli 14 vrk vanhojen viestien joukkopoistoa.
            await interaction.editReply(
                "En pystynyt poistamaan viestejä. Discord ei salli yli 14 vuorokautta " +
                "vanhojen viestien joukkopoistoa — ne pitää poistaa käsin."
            );

        }

    }
};
