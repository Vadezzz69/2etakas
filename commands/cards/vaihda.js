const { SlashCommandBuilder } = require("discord.js");
const { execute } = require("../../utils/community");
const UI = require("../../utils/cards/ui");

module.exports = {
    data: new SlashCommandBuilder().setName("vaihda").setDescription("Tarjoa keräilykorttia toiselle pelaajalle.")
        .addUserOption(o => o.setName("kayttaja").setDescription("Palvelimen käyttäjä").setRequired(true)).addStringOption(o => o.setName("tarjoan").setDescription("Oman korttisi tunniste").setMaxLength(12).setRequired(true)).addStringOption(o => o.setName("pyydan").setDescription("Vastapuolen kortin tunniste").setMaxLength(12).setRequired(true)),
    execute: i => execute(i, () => UI.trade(i), true)
};
