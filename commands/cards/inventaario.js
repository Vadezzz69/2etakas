const { SlashCommandBuilder } = require("discord.js");
const { execute } = require("../../utils/community");
const UI = require("../../utils/cards/ui");

module.exports = {
    data: new SlashCommandBuilder().setName("inventaario").setDescription("Näyttää esineesi ja varusteesi."),
    execute: i => execute(i, () => UI.inventory(i))
};
