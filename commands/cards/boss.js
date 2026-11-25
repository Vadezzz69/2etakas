const { SlashCommandBuilder } = require("discord.js");
const { execute } = require("../../utils/community");
const UI = require("../../utils/cards/ui");

module.exports = {
    data: new SlashCommandBuilder().setName("boss").setDescription("Näyttää palvelimen päivittäisen pomotaistelun."),
    execute: i => execute(i, () => UI.bossView(i))
};
