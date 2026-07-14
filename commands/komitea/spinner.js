const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { satunnainen } = require("../../utils/komiteadata");
const { VARIT } = require("../../utils/tyyli");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("spinner")
        .setDescription("Pyörittää ruletin ja valitsee satunnaisen jäsenen palvelimelta."),

    async execute(interaction) {

        await interaction.deferReply();

        const jasenet = await interaction.guild.members.fetch();
        const ehdokkaat = [...jasenet.filter(m => !m.user.bot).values()];

        if (ehdokkaat.length === 0) {
            return interaction.editReply("Palvelimelta ei löytynyt yhtään ei-bottia. Outoa.");
        }

        const valittu = satunnainen(ehdokkaat);

        const embed = new EmbedBuilder()
            .setColor(VARIT.PERUS)
            .setTitle("🎡 Spinner pyörähti pysähdyksiin...")
            .setDescription(`Kohtalo valitsi: **${valittu.displayName}**! 🎉`)
            .setThumbnail(valittu.displayAvatarURL());

        await interaction.editReply({ embeds: [embed] });

    }
};
