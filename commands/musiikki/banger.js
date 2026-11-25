const { SlashCommandBuilder } = require("discord.js");
const { execute } = require("../../utils/community");
const UI = require("../../utils/musiikki/yhteiso/social");

module.exports = {
    data: new SlashCommandBuilder().setName("banger").setDescription("Jonottaa palvelimen kuunnelluimpia kappaleita."),
    execute: i => execute(i, () => UI.troll(i,"banger"))
};
