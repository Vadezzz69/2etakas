const { SlashCommandBuilder } = require("discord.js");
const { execute } = require("../../utils/community");
const UI = require("../../utils/cards/ui");

module.exports = {
    data: new SlashCommandBuilder().setName("paivapalkinto").setDescription("Nouda Komitean päiväpalkinto."),
    execute: i => execute(i, () => UI.daily(i))
};
