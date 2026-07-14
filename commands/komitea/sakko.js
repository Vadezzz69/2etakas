const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { SAKKO_YKSIKOT, satunnainen, satunnaisVali } = require("../../utils/komiteadata");
const { VARIT } = require("../../utils/tyyli");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("sakko")
        .setDescription("Antaa käyttäjälle kuvitteellisen sakon.")
        .addUserOption(option =>
            option.setName("kayttaja").setDescription("Sakotettava käyttäjä").setRequired(true)
        )
        .addStringOption(option =>
            option.setName("syy").setDescription("Sakon syy").setRequired(false)
        ),

    async execute(interaction) {

        const kayttaja = interaction.options.getUser("kayttaja");
        const syy = interaction.options.getString("syy") ?? "yleinen epäilyttävä käytös";
        const summa = satunnaisVali(5, 500);
        const yksikko = satunnainen(SAKKO_YKSIKOT);

        const embed = new EmbedBuilder()
            .setColor(VARIT.AKSENTTI)
            .setTitle("💸 Sakkolappu")
            .setDescription(
                `${kayttaja} on määrätty maksamaan sakkoa.\n\n` +
                `**Summa:** ${summa} ${yksikko}\n` +
                `**Syy:** ${syy}`
            )
            .setFooter({ text: "Maksu erääntyy heti. Maksutapoja ei valitettavasti ole." });

        await interaction.reply({ embeds: [embed] });

    }
};
