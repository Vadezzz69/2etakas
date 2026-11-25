require("dotenv").config({ quiet: true });
console.log("📂 BOTIN TYÖHAKEMISTO:", process.cwd());
console.log("📂 BOTIN YTDLP-POLKU:", require("path").join(process.cwd(), "bin", "yt-dlp"));

const { Client, GatewayIntentBits } = require("discord.js");

const commandHandler = require("./handlers/commandHandler");
const eventHandler = require("./handlers/eventHandler");
const { kaynnistaAjastin } = require("./utils/ajastin");
const { suljeProsessit } = require("./utils/musiikki/ytdlp");
const { kaynnistaDashboard } = require("./dashboard/server");

process.once("exit", suljeProsessit);
process.once("SIGINT", () => process.exit(130));
process.once("SIGTERM", () => process.exit(143));

if (!process.env.TOKEN) {
    console.error("❌ TOKEN puuttuu ympäristömuuttujista. Bottia ei käynnistetä.");
    process.exit(1);
}

// Yksittäinen unohtunut Promise-virhe (esim. verkkokatko kesken kutsun) ei saa
// kaataa koko bottia. Virhe kirjataan lokiin ja botti jatkaa.
process.on("unhandledRejection", (syy) => {
    console.error("❌ Käsittelemätön Promise-virhe:", syy);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ],
    // Botti saa pingata vain yksittäisiä käyttäjiä. Näin esim. `!add !x = @everyone`
    // tai komennon vapaatekstikenttä ei voi käyttää bottia massapingaukseen.
    allowedMentions: { parse: ["users"] }
});

client.on("error", (err) => console.error("❌ Discord-clientin virhe:", err));

// Ladataan komennot
commandHandler(client);

// Ladataan eventit
eventHandler(client);

// Käynnistetään dashboard heti, jotta hosting näkee HTTP-portin
// myös silloin, jos Discord-kirjautuminen kestää tai epäonnistuu.
kaynnistaDashboard(client, process.env.DASHBOARD_PORT || process.env.PORT || 10000);

// Alusta korttirenderöinti ennen interaktioita ja äänitoistoa.
if (process.env.D1_API_URL && process.env.D1_API_KEY) {
    try { require("./utils/renderPng").warmup(); }
    catch (err) { console.warn("⚠️ Komitea-kuvarenderöinnin alustus epäonnistui:", err?.name); }
}

// Kirjaudutaan Discordiin
client.login(process.env.TOKEN)
    .then(() => {
        console.log("✅ Kirjautuminen onnistui.");
        kaynnistaAjastin(client);
    })
    .catch(err => {
        // Virheviesti ei sisällä tokenia, mutta tulostetaan vain viesti — ei koko olioita.
        console.error("❌ Kirjautuminen epäonnistui:", err?.message ?? err);
    });
