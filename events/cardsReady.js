const { Events } = require("discord.js");
const { startSweep } = require("../utils/cards/battles");

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute: startSweep
};
