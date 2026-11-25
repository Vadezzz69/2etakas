const { SlashCommandBuilder } = require("discord.js");
const { execute } = require("../../utils/community");
const UI = require("../../utils/cards/ui");

module.exports = {
    data: new SlashCommandBuilder().setName("turnaus").setDescription("Avaa palvelimen neljän pelaajan päiväturnaus."),
    execute: i => execute(i, () => UI.cup(i))
};
