const { Events } = require("discord.js");
const { route } = require("../utils/communityRouter");
const { musiikkiPainike, kasittelePainike } = require("../utils/musiikki/paneeli");
const { virhe: musiikkiVirhe } = require("../utils/musiikki/muotoilu");
const MUSIIKKIKOMENNOT = new Set(["soita", "jono", "nyt", "ohita", "lopeta", "sekoita", "tauko", "toisto"]);
const { kirjaaKomento } = require("../utils/tilastot");
const { satunnainen } = require("../utils/satunnainen");
const { VIRHEVIESTIT, VANHAT_KOMENNOT } = require("../utils/comedy/data/viestit");

// Tunnistaa saman Discord-interaktion myös silloin, jos siitä syntyy uusi olio.
const kasitellytInteraktiot = new Map();
const INTERAKTION_SAILYTYSAIKA_MS = 15 * 60 * 1000;
let seuraavaInteraktioSiivousMs = 0;

function kirjaaInteractionAika(interaction, vaihe, tiedot = {}) {
    if (process.env.SOITA_REST_DIAGNOSTIIKKA === "1") return;

    const nyt = Date.now();
    const luotuMs = interaction?.createdTimestamp;
    const rivi = {
        vaihe,
        komento: "soita",
        interactionId: interaction?.id ?? null,
        pid: process.pid,
        aika: new Date(nyt).toISOString(),
        aikaMs: nyt,
        luotuMs: Number.isFinite(luotuMs) ? luotuMs : null,
        viiveLuonnistaMs: Number.isFinite(luotuMs) ? nyt - luotuMs : null,
        ...tiedot
    };
    setImmediate(() => console.info(`[interaction-timing] ${JSON.stringify(rivi)}`));
}

/**
 * Kertoo käyttäjälle virheestä niin, ettei virheilmoituksen lähetys itse voi
 * heittää uutta käsittelemätöntä virhettä (esim. jos vuorovaikutus on jo
 * vanhentunut tai komento ehti vastata ennen kaatumista).
 */
async function ilmoitaVirhe(interaction, teksti) {
    const vastaus = typeof teksti === "string" ? { content: teksti, embeds: [], components: [] } : teksti;
    try {
        if (interaction.deferred && !interaction.replied) {
            await interaction.editReply(vastaus);
        } else if (interaction.replied) {
            await interaction.followUp({ ...vastaus, ephemeral: true });
        } else {
            await interaction.reply({ ...vastaus, ephemeral: true });
        }
    } catch (err) {
        if (Number(err?.code) === 10062) {
            console.warn("⚠️ Interaction vanheni ennen virheilmoituksen lähettämistä.");
            return;
        }
        console.error("❌ Virheilmoituksen lähetys epäonnistui:", { name: err?.name, code: err?.code });
    }
}

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        const saapuiMs = Date.now();
        const onSoita = interaction.commandName === "soita";
        if (onSoita) kirjaaInteractionAika(interaction, "interactionCreate-start", { saapuiMs });

        const onMusiikkiPainike = musiikkiPainike(interaction);
        const uusiToiminto = route(interaction);
        if (!uusiToiminto && !onMusiikkiPainike && !interaction.isChatInputCommand()) return;

        const nyt = Date.now();
        if (nyt >= seuraavaInteraktioSiivousMs) {
            seuraavaInteraktioSiivousMs = nyt + 60_000;
            for (const [id, aikaleima] of kasitellytInteraktiot) {
                if (nyt - aikaleima > INTERAKTION_SAILYTYSAIKA_MS) kasitellytInteraktiot.delete(id);
            }
        }

        if (kasitellytInteraktiot.has(interaction.id)) {
            console.warn("[interaction-duplicate] " + JSON.stringify({
                command: interaction.commandName,
                interactionId: interaction.id,
                firstSeenAt: kasitellytInteraktiot.get(interaction.id),
                pid: process.pid,
                deferred: interaction.deferred,
                replied: interaction.replied
            }));
            return;
        }
        if (interaction.id) kasitellytInteraktiot.set(interaction.id, nyt);
        if (uusiToiminto || onMusiikkiPainike) {
            try {
                await (uusiToiminto ?? kasittelePainike)(interaction);
            } catch (err) {
                if ([10008, 10062, 40060, 50001, 50013].includes(Number(err?.code))) return;
                console.warn("[musiikki-painike]", err?.name, err?.code);
                if (!interaction.deferred && !interaction.replied) {
                    await ilmoitaVirhe(interaction, musiikkiVirhe("Toiminto epäonnistui. Avaa soitin uudelleen komennolla /nyt."));
                }
            }
            return;
        }

        if (["soita", "meemi"].includes(interaction.commandName)) {
            console.info("[interaction-compare] " + JSON.stringify({
                command: interaction.commandName,
                commandId: interaction.commandId ?? null,
                applicationId: interaction.applicationId ?? null,
                guildId: interaction.guildId ?? null,
                channelId: interaction.channelId ?? null,
                interactionCreateListenerCount: typeof client?.listenerCount === "function"
                    ? client.listenerCount(Events.InteractionCreate)
                    : null,
                createdTimestamp: interaction.createdTimestamp ?? null,
                context: interaction.context ?? null,
                version: interaction.version ?? null,
                tokenPresent: Boolean(interaction.token)
            }));
        }

        if (onSoita && process.env.SOITA_REST_DIAGNOSTIIKKA !== "1") {
            const clientApplicationId = client.application?.id;
            console.info("[soita-identity] " + JSON.stringify({
                clientApplicationReady: Boolean(clientApplicationId),
                applicationIdMatches: Boolean(
                    clientApplicationId &&
                    interaction.applicationId &&
                    clientApplicationId === interaction.applicationId
                )
            }));
        }

        const command = client.commands.get(interaction.commandName);

        if (!command) {
            // Discord muistaa vielä vanhan komennon, jota ei enää ole koodissa.
            console.warn(`⚠️ Tuntematon komento: /${interaction.commandName}`);
            return ilmoitaVirhe(interaction, satunnainen(VANHAT_KOMENNOT));
        }

        try {

            if (onSoita) {
                kirjaaInteractionAika(interaction, "command-dispatch-start", {
                    viiveSaapumisestaMs: Date.now() - saapuiMs
                });
            }
            await command.execute(interaction, client);

        } catch (err) {

            console.error(`❌ Virhe komennossa /${interaction.commandName}:`, {
                name: err?.name,
                code: err?.code,
                interactionId: interaction.id,
                deferred: interaction.deferred,
                replied: interaction.replied,
                pid: process.pid,
                ikaSaapuessaMs: Number.isFinite(interaction.createdTimestamp)
                    ? saapuiMs - interaction.createdTimestamp : null,
                aikaSaapumisestaVirheeseenMs: Date.now() - saapuiMs,
                gatewayPingMs: Number.isFinite(client.ws?.ping) ? client.ws.ping : null
            });
            if (Number(err?.code) === 10062) {
                console.warn("⚠️ Interaction vanheni ennen komennon valmistumista; virhevastausta ei yritetty uudelleen.");
                return;
            }
            if (MUSIIKKIKOMENNOT.has(interaction.commandName) && Number(err?.code) === 40060) return;
            return ilmoitaVirhe(interaction, MUSIIKKIKOMENNOT.has(interaction.commandName)
                ? musiikkiVirhe("Toiminto epäonnistui. Yritä hetken päästä uudelleen.")
                : satunnainen(VIRHEVIESTIT));

        }

        if (interaction.guildId) {
            kirjaaKomento(interaction.guildId, interaction.user.id, interaction.commandName)
                .catch(err => console.error("❌ Komentotilaston kirjaus epäonnistui:", err?.message ?? err));
        }

    }
};
