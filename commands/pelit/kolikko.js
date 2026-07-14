const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { VARIT } = require("../../utils/tyyli");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("kolikko")
        .setDescription("Heittää kolikkoa.")
        .addStringOption(option =>
            option
                .setName("veto")
                .setDescription("Veikkaa tulosta (valinnainen)")
                .setRequired(false)
                .addChoices(
                    { name: "Kruuna", value: "kruuna" },
                    { name: "Klaava", value: "klaava" }
                )
        ),

    async execute(interaction) {

        const veto = interaction.options.getString("veto");
        const tulos = Math.random() < 0.5 ? "kruuna" : "klaava";
        const emoji = tulos === "kruuna" ? "🟡" : "⚪";

        let kuvaus = `${emoji} Kolikko näyttää: **${tulos}**!`;

        if (veto) {
            kuvaus += veto === tulos ? "\n\n🎉 Veikkasit oikein!" : "\n\n😅 Väärä veikkaus, yritä uudelleen!";
        }

        const embed = new EmbedBuilder()
            .setColor(VARIT.HARMAA)
            .setDescription(kuvaus);

        await interaction.reply({ embeds: [embed] });

    }
};
