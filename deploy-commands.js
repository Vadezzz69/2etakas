require("dotenv").config();

const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const commands = [];

const folders = fs.readdirSync("./commands");

for (const folder of folders) {

    const commandFiles = fs
        .readdirSync(path.join("./commands", folder))
        .filter(file => file.endsWith(".js"));

    for (const file of commandFiles) {

        const command = require(path.join(process.cwd(), "commands", folder, file));

        commands.push(command.data.toJSON());

    }

}

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {

    try {

        console.log("🔄 Rekisteröidään slash-komennot...");

        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            { body: commands }
        );

        console.log("✅ Slash-komennot rekisteröity.");

    } catch (err) {

        console.error(err);

    }

})();