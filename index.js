require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");

const commandHandler = require("./handlers/commandHandler");
const eventHandler = require("./handlers/eventHandler");
const { kaynnistaAjastin } = require("./utils/ajastin");
const { kaynnistaDashboard } = require("./dashboard/server");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers
    ]
});

// Ladataan komennot
commandHandler(client);

// Ladataan eventit
eventHandler(client);

// Kirjaudutaan Discordiin
client.login(process.env.TOKEN)
    .then(() => {
        console.log("✅ Kirjautuminen onnistui.");
        kaynnistaAjastin(client);
        kaynnistaDashboard(client, process.env.DASHBOARD_PORT || 3000);
    })
    .catch(err => {
        console.error("❌ Kirjautuminen epäonnistui:");
        console.error(err);
    });

console.log("TOKEN löytyy:", !!process.env.TOKEN);