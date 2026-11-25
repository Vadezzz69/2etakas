const { SlashCommandBuilder } = require("discord.js");
const { execute } = require("../../utils/community");
const UI = require("../../utils/cards/ui");

module.exports = {
    data: new SlashCommandBuilder().setName("pelipaneeli").setDescription("Luo tai päivittää Komitea Cards -pelipaneelin."),
    execute: i => execute(i, () => UI.setup(i))
};
