require("dotenv").config();

const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const commands = [];

const folders = fs.readdirSync("./commands");

for (const folder of folders) {

    const folderPath = path.join("./commands", folder);

    const commandFiles = fs
        .readdirSync(folderPath)
        .filter(file => file.endsWith(".js"));

    for (const file of commandFiles) {

        try {

            const command = require(path.join(process.cwd(), "commands", folder, file));

            if (!command.data || !command.execute) {
                console.warn(`⚠️ Ohitetaan ${folder}/${file}`);
                continue;
            }

            commands.push(command.data.toJSON());
            console.log(`✅ ${folder}/${file}`);

        } catch (err) {

            console.error(`❌ Virhe tiedostossa ${folder}/${file}`);
            console.error(err);

        }

    }

}

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {

    try {

        console.log(`📦 Rekisteröidään ${commands.length} komentoa...`);

        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            {
                body: commands
            }
        );

        console.log("✅ Slash-komennot rekisteröity.");

    } catch (err) {

        console.error("❌ Rekisteröinti epäonnistui:");
        console.error(err);

    }

})();