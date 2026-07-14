const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { VARIT } = require("../../utils/tyyli");

function odota(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("aikalisa")
        .setDescription("Antaa käyttäjälle \"aikalisän\". (Pelkkä trolli — ei tee oikeasti mitään.)")
        .addUserOption(option =>
            option.setName("kayttaja").setDescription("Käyttäjä").setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("minuutit")
                .setDescription("Kesto minuutteina")
                .setMinValue(1)
                .setMaxValue(40320)
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("syy").setDescription("Syy").setRequired(false)
        ),

    async execute(interaction) {

        const user = interaction.options.getUser("kayttaja");
        const minutes = interaction.options.getInteger("minuutit");
        const reason = interaction.options.getString("syy") ?? "Syytä ei annettu";

        const embed = new EmbedBuilder()
            .setColor(VARIT.AKSENTTI)
            .setDescription(`🔇 **${user.tag}** sai ${minutes} minuutin aikalisän.\n**Syy:** ${reason}`);

        await interaction.reply({ embeds: [embed] });

        await odota(2000);

        await interaction.followUp(
            `😂 Ihan huijasin — ${user} sai puhua koko ajan. Aikalisä oli täysin symbolinen.`
        );

    }
};
