const { SlashCommandBuilder } = require("discord.js");
const { execute } = require("../../utils/community");
const UI = require("../../utils/musiikki/yhteiso/library");

module.exports = {
    data: new SlashCommandBuilder().setName("wrapped").setDescription("Näyttää kuuntelutilastot ja luo halutessa PNG-kuvan.")
        .addStringOption(o => o.setName("jakso").setDescription("Tilastojakso").addChoices({ name:"Viimeiset 7 päivää",value:"viikko" },{ name:"Tämä kuukausi",value:"kuukausi" },{ name:"Tämä vuosi",value:"vuosi" },{ name:"Koko aika",value:"kaikki" })).addStringOption(o => o.setName("nakyma").setDescription("Oma tai palvelimen tilasto").addChoices({ name:"Oma",value:"oma" },{ name:"Palvelin",value:"palvelin" })).addBooleanOption(o => o.setName("png").setDescription("Luo myös PNG-kuva")),
    execute: i => execute(i, () => UI.wrapped(i,i.options.getString("jakso")??"kaikki",i.options.getString("nakyma")??"oma",i.options.getBoolean("png")??false))
};
