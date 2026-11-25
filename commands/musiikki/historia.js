const { SlashCommandBuilder } = require("discord.js");
const { execute } = require("../../utils/community");
const UI = require("../../utils/musiikki/yhteiso/library");

module.exports = {
    data: new SlashCommandBuilder().setName("historia").setDescription("Selaa henkilökohtaista kuunteluhistoriaasi."),
    execute: i => execute(i, () => UI.listTracks(i,"hist"))
};
