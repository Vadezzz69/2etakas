const { SlashCommandBuilder } = require("discord.js");
const { valmisteleOhjaus } = require("../../utils/musiikki/ohjain");
const UI = require("../../utils/musiikki/muotoilu");

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
        await interaction.deferReply({ ephemeral: true });
        const soitin = await valmisteleOhjaus(interaction);
        if (!soitin) return;
        const tila = soitin.toisto(interaction.options.getString("tila"));
        soitin.paivitaPaneeli?.();
        await interaction.editReply(UI.onnistui("Toistotila vaihdettu", UI.TOISTOTILAN_NIMET[tila]));
    }
};
