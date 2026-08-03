const { SlashCommandBuilder } = require("discord.js");
const { suoritaFeikkiToiminto } = require("../../utils/feikkitoiminto");

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

        await suoritaFeikkiToiminto(interaction, {
            kuvaus: `🔨 **${user.tag}** bannattiin palvelimelta ikuisiksi ajoiksi.\n**Syy:** ${reason}`,
            paljastus: `😂 Ei se mitään, tämä oli täysin kuvitteellinen banni. ${user} saa jäädä.`,
            viiveMs: 3000
        });
    }
};
