const { SlashCommandBuilder } = require("discord.js");
const { execute } = require("../../utils/community");
const UI = require("../../utils/musiikki/yhteiso/social");

module.exports = {
    data: new SlashCommandBuilder().setName("musiikkivisa").setDescription("Aloita yhteinen musiikkivisa."),
    execute: i => execute(i, () => UI.start(i,"quiz"), true)
};
