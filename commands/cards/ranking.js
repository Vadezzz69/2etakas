const { SlashCommandBuilder } = require("discord.js");
const { execute } = require("../../utils/community");
const UI = require("../../utils/cards/ui");

module.exports = {
    data: new SlashCommandBuilder().setName("ranking").setDescription("Näyttää Komitea Cardsin sijoitukset.")
        .addStringOption(o => o.setName("jakso").setDescription("Tilastojakso").addChoices({ name:"Viikko",value:"viikko" },{ name:"Kuukausi",value:"kuukausi" },{ name:"Nykyinen kausi",value:"kausi" },{ name:"Koko aika",value:"kaikki" })),
    execute: i => execute(i, () => UI.ranking(i))
};
