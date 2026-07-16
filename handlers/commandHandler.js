const fs = require("fs");
const path = require("path");
const { Collection } = require("discord.js");

module.exports = (client) => {

    client.commands = new Collection();

    const commandsPath = path.join(process.cwd(), "commands");
    const folders = fs.readdirSync(commandsPath);

    let count = 0;

    for (const folder of folders) {

        const folderPath = path.join(commandsPath, folder);

        const commandFiles = fs
            .readdirSync(folderPath)
            .filter(file => file.endsWith(".js"));

        for (const file of commandFiles) {

            const filePath = path.join(folderPath, file);
                let command;

                    try {
                        command = require(filePath);
                            } catch (err) {
                                console.error(`❌ Virhe ladattaessa komentoa ${file}:`);
                                console.error(err);
                                continue;
}

                            if (!command?.data || !command?.execute) {
                       console.warn(`⚠️ Komennosta ${file} puuttuu "data" tai "execute" — ohitetaan.`);
                                  continue;
                }

            command.kategoria = folder;
            client.commands.set(command.data.name, command);
            count++;

        }

    }

    console.log(`📦 Ladattu ${count} komentoa.`);

};
