const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { VARIT } = require("../../utils/tyyli");

function odota(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("potkaise")
        .setDescription("\"Potkaisee\" käyttäjän palvelimelta. (Pelkkä trolli — ei tee oikeasti mitään.)")
        .addUserOption(option =>
            option.setName("kayttaja").setDescription("Potkaistava käyttäjä").setRequired(true)
        )
        .addStringOption(option =>
            option.setName("syy").setDescription("Syy potkulle").setRequired(false)
        ),

    async execute(interaction) {

        const user = interaction.options.getUser("kayttaja");
        const reason = interaction.options.getString("syy") ?? "Syytä ei annettu";

        const embed = new EmbedBuilder()
            .setColor(VARIT.AKSENTTI)
            .setDescription(`👢 **${user.tag}** potkaistiin palvelimelta.\n**Syy:** ${reason}`);

        await interaction.reply({ embeds: [embed] });

        await odota(2500);

        await interaction.followUp(
            `😂 Rauhoitu, ihan vitsi. ${user} on yhä täällä — komitea vain halusi pelotella hieman.`
        );

    }
};
