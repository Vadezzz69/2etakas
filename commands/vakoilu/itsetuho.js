const { SlashCommandBuilder } = require("discord.js");

function odota(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("itsetuho")
        .setDescription("Käynnistää dramaattisen (ja täysin harmittoman) itsetuholaskennan.")
        .addStringOption(option =>
            option.setName("viesti").setDescription("Viimeiset sanasi").setRequired(false)
        ),

    async execute(interaction) {

        const viimeisetSanat = interaction.options.getString("viesti");

        await interaction.reply("🚨 **ITSETUHOMEKANISMI AKTIVOITU** 🚨");
        await odota(1200);

        for (let i = 5; i >= 1; i--) {
            await interaction.editReply(`🚨 **ITSETUHO: ${i}...** 🚨`);
            await odota(1000);
        }

        await interaction.editReply(
            `💥 **PUM!** 💥\n\n` +
            `Onneksi tämä oli vain simulaatio. Komitea ei ole (vielä) valmis menettämään tätä kanavaa.` +
            (viimeisetSanat ? `\n\n*Viimeiset sanat: "${viimeisetSanat}"*` : "")
        );

    }
};
