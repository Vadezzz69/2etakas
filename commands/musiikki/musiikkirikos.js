const { SlashCommandBuilder } = require("discord.js");
const { execute } = require("../../utils/community");
const UI = require("../../utils/musiikki/yhteiso/social");

module.exports = {
    data: new SlashCommandBuilder().setName("musiikkirikos").setDescription("Antaa leikkimielisen musiikkirikostuomion.")
        .addUserOption(o => o.setName("kayttaja").setDescription("Palvelimen käyttäjä")),
    execute: i => execute(i, () => UI.troll(i,"musiikkirikos"))
};
