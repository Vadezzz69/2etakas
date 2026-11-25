const { SlashCommandBuilder } = require("discord.js");
const { execute } = require("../../utils/community");
const UI = require("../../utils/cards/ui");

module.exports = {
    data: new SlashCommandBuilder().setName("peliprofiili").setDescription("Näyttää pelaajan tason ja taistelutilastot.")
        .addUserOption(o => o.setName("kayttaja").setDescription("Palvelimen käyttäjä")),
    execute: i => execute(i, () => UI.player(i))
};
