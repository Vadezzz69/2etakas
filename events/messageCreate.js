const { Events } = require("discord.js");
const { kirjaaViesti } = require("../utils/tilastot");

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {

        if (message.author.bot || !message.guild) return;

        try {
            await kirjaaViesti(message.guild.id, message.author.id);
        } catch (err) {
            console.error("❌ Viestitilaston kirjaus epäonnistui:", err);
        }

    }
};
