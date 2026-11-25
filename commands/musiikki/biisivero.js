const { SlashCommandBuilder } = require("discord.js");
const { execute } = require("../../utils/community");
const UI = require("../../utils/musiikki/yhteiso/social");

module.exports = {
    data: new SlashCommandBuilder().setName("biisivero").setDescription("Laskee kuuntelun kuvitteellisen veron.")
        .addUserOption(o => o.setName("kayttaja").setDescription("Palvelimen käyttäjä")),
    execute: i => execute(i, () => UI.troll(i,"biisivero"))
};
