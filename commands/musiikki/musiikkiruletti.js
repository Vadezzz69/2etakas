const { SlashCommandBuilder } = require("discord.js");
const { execute } = require("../../utils/community");
const UI = require("../../utils/musiikki/yhteiso/social");

module.exports = {
    data: new SlashCommandBuilder().setName("musiikkiruletti").setDescription("Jonota satunnainen kappale suosikeista tai yhteislistalta."),
    execute: i => execute(i, () => UI.roulette(i))
};
