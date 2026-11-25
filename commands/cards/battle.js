const { SlashCommandBuilder } = require("discord.js");
const { execute } = require("../../utils/community");
const UI = require("../../utils/cards/ui");

module.exports = {
    data: new SlashCommandBuilder().setName("battle").setDescription("Haasta toinen pelaaja vuoropohjaiseen taisteluun.")
        .addUserOption(o => o.setName("kayttaja").setDescription("Palvelimen käyttäjä").setRequired(true)),
    execute: i => execute(i, () => UI.challenge(i), true)
};
