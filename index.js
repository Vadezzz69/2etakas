require("dotenv").config();

if (process.env.BOT_SECRET !== "Komitea2026SalainenAvain") {
    console.error("❌ Virheellinen BOT_SECRET. Bottia ei käynnistetä.");
    process.exit(1);
}



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
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ]
});

// Ladataan komennot
commandHandler(client);

// Ladataan eventit
eventHandler(client);

// Käynnistetään dashboard heti, jotta Render näkee HTTP-portin
// myös silloin, jos Discord-kirjautuminen kestää tai epäonnistuu.
kaynnistaDashboard(client, process.env.DASHBOARD_PORT || process.env.PORT || 10000);

// Kirjaudutaan Discordiin
client.login(process.env.TOKEN)
    .then(() => {
        console.log("✅ Kirjautuminen onnistui.");
        kaynnistaAjastin(client);
    })
    .catch(err => {
        console.error("❌ Kirjautuminen epäonnistui:");
        console.error(err);
    });

console.log("TOKEN löytyy:", !!process.env.TOKEN);