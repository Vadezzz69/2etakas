const { SlashCommandBuilder } = require("discord.js");
const { suoritaFeikkiToiminto } = require("../../utils/feikkitoiminto");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("aikalisa")
        .setDescription("Antaa käyttäjälle \"aikalisän\". (Pelkkä trolli — ei tee oikeasti mitään.)")
        .addUserOption(option =>
            option.setName("kayttaja").setDescription("Käyttäjä").setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName("minuutit").setDescription("Kesto minuutteina").setMinValue(1).setMaxValue(40320).setRequired(true)
        )
        .addStringOption(option =>
            option.setName("syy").setDescription("Syy").setRequired(false)
        ),

    async execute(interaction) {
        const user = interaction.options.getUser("kayttaja");
        const minutes = interaction.options.getInteger("minuutit");
        const reason = interaction.options.getString("syy") ?? "Syytä ei annettu";

        await suoritaFeikkiToiminto(interaction, {
            kuvaus: `🔇 **${user.tag}** sai ${minutes} minuutin aikalisän.\n**Syy:** ${reason}`,
            paljastus: `😂 Ihan huijasin — ${user} sai puhua koko ajan. Aikalisä oli täysin symbolinen.`,
            viiveMs: 2000
        });
    }
};
