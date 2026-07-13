const { Events, ActivityType } = require("discord.js");

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {

        console.log(`✅ Kirjauduttu sisään käyttäjänä ${client.user.tag}`);

        client.user.setPresence({
            activities: [{ name: "palvelinta", type: ActivityType.Watching }],
            status: "online"
        });

    }
};
