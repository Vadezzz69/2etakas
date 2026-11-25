const { SlashCommandBuilder } = require("discord.js");
const { execute } = require("../../utils/community");
const UI = require("../../utils/musiikki/yhteiso/library");

module.exports = {
    data: new SlashCommandBuilder().setName("soittolistat").setDescription("Selaa ja muokkaa musiikkisoittolistoja."),
    execute: i => execute(i, () => UI.listPlaylists(i))
};
