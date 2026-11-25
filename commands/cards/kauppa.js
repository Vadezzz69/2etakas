const { SlashCommandBuilder } = require("discord.js");
const { execute } = require("../../utils/community");
const UI = require("../../utils/cards/ui");

module.exports = {
    data: new SlashCommandBuilder().setName("kauppa").setDescription("Näyttää Komitean virtuaalikaupan."),
    execute: i => execute(i, () => UI.shop())
};
