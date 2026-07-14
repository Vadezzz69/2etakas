const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { VARIT } = require("../../utils/tyyli");

function odota(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("bannaa")
        .setDescription("\"Bannaa\" käyttäjän palvelimelta. (Pelkkä trolli — ei tee oikeasti mitään.)")
        .addUserOption(option =>
            option.setName("kayttaja").setDescription("Bannattava käyttäjä").setRequired(true)
        )
        .addStringOption(option =>
            option.setName("syy").setDescription("Syy bannille").setRequired(false)
        ),

    async execute(interaction) {

        const user = interaction.options.getUser("kayttaja");
        const reason = interaction.options.getString("syy") ?? "Syytä ei annettu";

        const embed = new EmbedBuilder()
            .setColor(VARIT.AKSENTTI)
            .setDescription(`🔨 **${user.tag}** bannattiin palvelimelta ikuisiksi ajoiksi.\n**Syy:** ${reason}`);

        await interaction.reply({ embeds: [embed] });

        await odota(3000);

        await interaction.followUp(
            `😂 Ei se mitään, tämä oli täysin kuvitteellinen banni. ${user} saa jäädä.`
        );

    }
};
