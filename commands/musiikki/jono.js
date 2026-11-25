const { SlashCommandBuilder } = require("discord.js");
const { haeSoitin } = require("../../utils/musiikki/soitin");
const UI = require("../../utils/musiikki/muotoilu");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("jono")
        .setDescription("Näyttää musiikkijonon."),

    async execute(interaction) {
        if (!interaction.inGuild()) return interaction.reply({ ...UI.virhe("Musiikki toimii vain palvelimilla."), ephemeral: true });
        await interaction.reply(UI.jonoNakyma(haeSoitin(interaction.guildId)));
    }
};
