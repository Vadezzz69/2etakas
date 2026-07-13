const fs = require("fs");
const path = require("path");

module.exports = (client) => {

    const eventsPath = path.join(process.cwd(), "events");

    const eventFiles = fs
        .readdirSync(eventsPath)
        .filter(file => file.endsWith(".js"));

    let count = 0;

    for (const file of eventFiles) {

        const filePath = path.join(eventsPath, file);
        const event = require(filePath);

        if (!event?.name || !event?.execute) {
            console.warn(`⚠️  Eventistä ${file} puuttuu "name" tai "execute" — ohitetaan.`);
            continue;
        }

        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }

        count++;

    }

    console.log(`📡 Ladattu ${count} eventtiä.`);

};
