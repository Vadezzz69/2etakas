const { SlashCommandBuilder } = require("discord.js");
const { execute } = require("../../utils/community");
const UI = require("../../utils/musiikki/yhteiso/library");

module.exports = {
    data: new SlashCommandBuilder().setName("musaprofiili").setDescription("Näyttää pelaajan kuunteluprofiilin.")
        .addUserOption(o => o.setName("kayttaja").setDescription("Palvelimen käyttäjä")),
    execute: i => execute(i, () => UI.wrapped(i,"kaikki","oma",false,i.options.getUser("kayttaja")??i.user))
};
