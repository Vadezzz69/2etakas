const { SlashCommandBuilder } = require("discord.js");
const { execute } = require("../../utils/community");
const UI = require("../../utils/cards/ui");

module.exports = {
    data: new SlashCommandBuilder().setName("tehtavat").setDescription("Näyttää päivittäiset ja viikoittaiset tehtävät sekä saavutukset."),
    execute: i => execute(i, () => UI.tasks(i))
};
