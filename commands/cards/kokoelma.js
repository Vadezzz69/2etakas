const { SlashCommandBuilder } = require("discord.js");
const { execute } = require("../../utils/community");
const UI = require("../../utils/cards/ui");

module.exports = {
    data: new SlashCommandBuilder().setName("kokoelma").setDescription("Selaa ja suodata keräilykorttejasi."),
    execute: i => execute(i, () => UI.cards(i))
};
