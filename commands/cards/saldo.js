const { SlashCommandBuilder } = require("discord.js");
const { execute } = require("../../utils/community");
const UI = require("../../utils/cards/ui");

module.exports = {
    data: new SlashCommandBuilder().setName("saldo").setDescription("Näyttää Komiteakolikot ja viimeiset valuuttatapahtumat."),
    execute: i => execute(i, () => UI.wallet(i))
};
