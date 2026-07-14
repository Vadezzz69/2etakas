const { Events, ActivityType } = require("discord.js");

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {

        console.log(`✅ Kirjauduttu sisään käyttäjänä ${client.user.tag}`);

        client.user.setPresence({
            activities: [{ name: "Tapaamassa äitiäsi", type: ActivityType.Custom }],
            status: "idle"
        });

    }
};
