const { SlashCommandBuilder } = require("discord.js");
const { execute } = require("../../utils/community");
const UI = require("../../utils/musiikki/yhteiso/library");

module.exports = {
    data: new SlashCommandBuilder().setName("musiikkipaneeli").setDescription("Luo musiikkipaneeli tai muuta palvelimen musiikkiasetuksia.")
        .addStringOption(o => o.setName("asetus").setDescription("Muutettava asetus. Tyhjä luo paneelin.").addChoices({ name:"DJ-rooli",value:"dj" },{ name:"Reilu jono",value:"fair" },{ name:"Autoplay",value:"autoplay" })).addRoleOption(o => o.setName("rooli").setDescription("DJ-rooli. Tyhjä poistaa DJ-tilan.")).addBooleanOption(o => o.setName("kaytossa").setDescription("Ota reilu jono tai autoplay käyttöön")),
    execute: i => execute(i, () => UI.configure(i))
};
