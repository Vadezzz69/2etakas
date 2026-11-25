const { SlashCommandBuilder } = require("discord.js");
const { execute } = require("../../utils/community");
const UI = require("../../utils/cards/ui");

module.exports = {
    data: new SlashCommandBuilder().setName("pakka").setDescription("Avaa korttipakka inventaariosta."),
    execute: i => execute(i, () => UI.pack(i))
};
