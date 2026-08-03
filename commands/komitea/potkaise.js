const { SlashCommandBuilder } = require("discord.js");
const { suoritaFeikkiToiminto } = require("../../utils/feikkitoiminto");

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

        await suoritaFeikkiToiminto(interaction, {
            kuvaus: `👢 **${user.tag}** potkaistiin palvelimelta.\n**Syy:** ${reason}`,
            paljastus: `😂 Rauhoitu, ihan vitsi. ${user} on yhä täällä — komitea vain halusi pelotella hieman.`,
            viiveMs: 2500
        });
    }
};
