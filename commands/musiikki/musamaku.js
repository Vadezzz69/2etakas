const { SlashCommandBuilder } = require("discord.js");
const { execute } = require("../../utils/community");
const UI = require("../../utils/musiikki/yhteiso/social");

module.exports = {
    data: new SlashCommandBuilder().setName("musamaku").setDescription("Vertaile kahden käyttäjän musiikkimakua.")
        .addUserOption(o => o.setName("kayttaja").setDescription("Palvelimen käyttäjä").setRequired(true)),
    execute: i => execute(i, () => UI.taste(i))
};
