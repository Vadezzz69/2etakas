const { SlashCommandBuilder } = require("discord.js");
const { valmisteleOhjaus } = require("../../utils/musiikki/ohjain");
const { TOISTOTILAT } = require("../../utils/musiikki/viestit");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("toisto")
        .setDescription("Valitsee toistotilan: ei toistoa, nykyinen kappale tai koko jono.")
        .addStringOption(option =>
            option
                .setName("tila")
                .setDescription("Toistotila")
                .setRequired(true)
                .addChoices(
                    { name: "Pois", value: "pois" },
                    { name: "Nykyinen kappale", value: "kappale" },
                    { name: "Koko jono", value: "jono" }
                )
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const soitin = await valmisteleOhjaus(interaction);
        if (!soitin) return;

        const tila = soitin.toisto(interaction.options.getString("tila"));
        await interaction.editReply(TOISTOTILAT[tila]);
    }
};
