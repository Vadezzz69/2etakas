const { SlashCommandBuilder } = require("discord.js");
const { execute } = require("../../utils/community");
const UI = require("../../utils/musiikki/yhteiso/library");

module.exports = {
    data: new SlashCommandBuilder().setName("suosikit").setDescription("Avaa henkilökohtaiset musiikkisuosikkisi."),
    execute: i => execute(i, () => UI.listTracks(i,"fav"))
};
