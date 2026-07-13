require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");

const commandHandler = require("./handlers/commandHandler");
const eventHandler = require("./handlers/eventHandler");

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// Ladataan komennot
commandHandler(client);

// Ladataan eventit
eventHandler(client);

// Kirjaudutaan Discordiin
client.login(process.env.TOKEN);