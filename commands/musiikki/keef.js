const { SlashCommandBuilder } = require("discord.js");
const { execute } = require("../../utils/community");
const UI = require("../../utils/musiikki/yhteiso/social");

module.exports = {
    data: new SlashCommandBuilder().setName("keef").setDescription("Jonottaa satunnaisen Chief Keef -kappaleen."),
    execute: i => execute(i, () => UI.troll(i,"keef"))
};
