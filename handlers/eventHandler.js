const fs = require("fs");
const path = require("path");

const EVENTIT_KANSIO = path.join(__dirname, "..", "events");

function kirjaaInteractionAika(interaction) {
    if (process.env.SOITA_REST_DIAGNOSTIIKKA === "1") return;

    const nyt = Date.now();
    const luotuMs = interaction?.createdTimestamp;
    const rivi = {
        vaihe: "event-handler-received",
        komento: "soita",
        interactionId: interaction?.id ?? null,
        pid: process.pid,
        aika: new Date(nyt).toISOString(),
        aikaMs: nyt,
        luotuMs: Number.isFinite(luotuMs) ? luotuMs : null,
        viiveLuonnistaMs: Number.isFinite(luotuMs) ? nyt - luotuMs : null
    };
    setImmediate(() => console.info(`[interaction-timing] ${JSON.stringify(rivi)}`));
}

module.exports = (client) => {

    const eventFiles = fs
        .readdirSync(EVENTIT_KANSIO)
        .filter(file => file.endsWith(".js"));

    let count = 0;

    for (const file of eventFiles) {

        const event = require(path.join(EVENTIT_KANSIO, file));

        if (!event?.name || !event?.execute) {
            console.warn(`⚠️  Eventistä ${file} puuttuu "name" tai "execute" — ohitetaan.`);
            continue;
        }

        // Virhe yhdessä event-käsittelijässä ei saa kaataa koko prosessia
        // käsittelemättömänä Promise-hylkäyksenä.
        const suorita = async (...args) => {
            if (event.name === "interactionCreate" && args[0]?.commandName === "soita") {
                kirjaaInteractionAika(args[0]);
            }

            try {
                await event.execute(...args, client);
            } catch (err) {
                const virhe = event.name === "interactionCreate"
                    ? { name: err?.name, code: err?.code }
                    : err;
                console.error(`❌ Virhe eventissä ${event.name}:`, virhe);
            }
        };

        if (event.once) {
            client.once(event.name, suorita);
        } else {
            client.on(event.name, suorita);
        }

        count++;

    }

    console.log(`📡 Ladattu ${count} eventtiä.`);

};
