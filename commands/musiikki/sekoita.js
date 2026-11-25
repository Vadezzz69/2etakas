const { SlashCommandBuilder } = require("discord.js");
const { valmisteleOhjaus } = require("../../utils/musiikki/ohjain");
const UI = require("../../utils/musiikki/muotoilu");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("sekoita")
        .setDescription("Sekoittaa jonossa olevat kappaleet satunnaiseen järjestykseen."),

    async execute(interaction) {
        const soitin = await valmisteleOhjaus(interaction);
        if (!soitin) return;
        if (soitin.jono.length < 2) {
            return interaction.reply({ ...UI.virhe("Sekoittamiseen tarvitaan vähintään kaksi kappaletta jonossa."), ephemeral: true });
        }
        const maara = soitin.sekoita();
        soitin.paivitaPaneeli?.();
        await interaction.reply({ ...UI.onnistui("Jono sekoitettu", `${maara} kappaletta.`), ephemeral: true });
    }
};
