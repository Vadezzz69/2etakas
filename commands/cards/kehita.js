const { SlashCommandBuilder } = require("discord.js");
const { execute } = require("../../utils/community");
const UI = require("../../utils/cards/ui");

module.exports = {
    data: new SlashCommandBuilder().setName("kehita").setDescription("Näyttää korttisi kehityksen ja saatavilla olevat esineet."),
    execute: i => execute(i, () => UI.development(i))
};
