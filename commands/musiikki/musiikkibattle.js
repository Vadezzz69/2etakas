const { SlashCommandBuilder } = require("discord.js");
const { execute } = require("../../utils/community");
const UI = require("../../utils/musiikki/yhteiso/social");

module.exports = {
    data: new SlashCommandBuilder().setName("musiikkibattle").setDescription("Avaa musiikkibattle ja äänestys palvelimelle."),
    execute: i => execute(i, () => UI.start(i,"battle"), true)
};
