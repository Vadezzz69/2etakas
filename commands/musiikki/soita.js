const { ActionRowBuilder, ComponentType, SlashCommandBuilder, StringSelectMenuBuilder } = require("discord.js");
const { randomUUID } = require("node:crypto");
const { haeKappaleet, MusiikkiVirhe } = require("../../utils/musiikki/lahteet");
const { asetukset } = require("../../utils/musiikki/config");
const { valmisteleSoitto, haeTaiLuoSoitin } = require("../../utils/musiikki/ohjain");
const { lisattyEmbed } = require("../../utils/musiikki/muotoilu");

const VALINTA_AIKARAJA_MS = 60_000;
const REST_DIAGNOSTIIKKA_ENV = "SOITA_REST_DIAGNOSTIIKKA";
let restDiagnostiikkaKaytetty = false;

function kirjaaInteractionAika(interaction, vaihe, tiedot = {}) {
    if (process.env[REST_DIAGNOSTIIKKA_ENV] === "1") return;

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

function aloitaRestDiagnostiikka(interaction) {
    if (process.env[REST_DIAGNOSTIIKKA_ENV] !== "1" || restDiagnostiikkaKaytetty) return null;

    const rest = interaction.client.rest;
    const alkuperainenMakeRequest = rest.options.makeRequest;
    if (typeof alkuperainenMakeRequest !== "function") return null;

    restDiagnostiikkaKaytetty = true;
    const odotettuId = interaction.id;
    const odotettuToken = interaction.token;
    const pyynnot = [];

    const tarkkailevaMakeRequest = async function (url, init) {
        let tiedot;
        try {
            const osat = new URL(url).pathname.split("/").filter(Boolean);
            if (osat.includes("interactions") && osat.at(-1) === "callback") {
                const loppuosa = osat.slice(-4);
                tiedot = {
                    methodMatchesPost: init?.method === "POST",
                    callbackRouteMatches: loppuosa.length === 4 &&
                        loppuosa[0] === "interactions" &&
                        Boolean(loppuosa[1]) &&
                        Boolean(loppuosa[2]) &&
                        loppuosa[3] === "callback",
                    apiVersionIsV10: osat.at(-5) === "v10",
                    interactionIdMatches: loppuosa[1] === odotettuId,
                    interactionTokenMatches: loppuosa[2] === odotettuToken,
                    httpStatus: null
                };
                pyynnot.push(tiedot);
            }
        } catch {
            tiedot = undefined;
        }

        const response = await alkuperainenMakeRequest.call(this, url, init);
        if (tiedot) {
            tiedot.httpStatus = Number.isInteger(response?.status) ? response.status : null;
        }
        return response;
    };

    rest.options.makeRequest = tarkkailevaMakeRequest;

    return {
        kirjaa(virhe) {
            if (pyynnot.length > 1) return;

            const pyynto = pyynnot[0] ?? {};
            console.info("[soita-rest-diagnostic] " + JSON.stringify({
                methodMatchesPost: pyynto.methodMatchesPost === true,
                callbackRouteMatches: pyynto.callbackRouteMatches === true,
                apiVersionIsV10: pyynto.apiVersionIsV10 === true,
                interactionIdMatches: pyynto.interactionIdMatches === true,
                interactionTokenMatches: pyynto.interactionTokenMatches === true,
                pid: process.pid,
                httpStatus: Number.isInteger(virhe?.status)
                    ? virhe.status
                    : Number.isInteger(pyynto.httpStatus)
                        ? pyynto.httpStatus
                        : null,
                discordCode: Number.isInteger(virhe?.code) ? virhe.code : null
            }));
        },
        palauta() {
            if (rest.options.makeRequest === tarkkailevaMakeRequest) {
                rest.options.makeRequest = alkuperainenMakeRequest;
            }
            if (process.env[REST_DIAGNOSTIIKKA_ENV] === "1") {
                process.env[REST_DIAGNOSTIIKKA_ENV] = "used";
            }
        }
    };
}

function rajaa(teksti, max) {
    const siisti = String(teksti ?? "").replace(/\s+/g, " ").trim();
    return siisti.length > max ? `${siisti.slice(0, max - 1)}…` : siisti;
}

function kappaleenValinta(kappaleet, customId) {
    const valinnat = kappaleet.map((kappale, indeksi) => ({
        label: rajaa([kappale.artisti, kappale.otsikko].filter(Boolean).join(" - "), 100) || `Kappale ${indeksi + 1}`,
        description: rajaa(`${kappale.lahde} - ${kappale.kesto === null ? "kesto tuntematon" : `${Math.floor(kappale.kesto / 60)}:${String(kappale.kesto % 60).padStart(2, "0")}`}`, 100),
        value: String(indeksi)
    }));

    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder("Valitse soitettava versio")
            .addOptions(valinnat)
    );
}

async function valitseHakutulos(interaction, haku) {
    if (haku.kappaleet.length === 1) return haku.kappaleet[0];

    const customId = `musiikki-haku-${randomUUID()}`;
    await interaction.editReply({
        content: "Valitse soitettava versio:",
        embeds: [],
        components: [kappaleenValinta(haku.kappaleet, customId)]
    });

    const viesti = await interaction.fetchReply();
    const kerain = viesti.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        filter: valinta => valinta.customId === customId && valinta.user.id === interaction.user.id,
        time: VALINTA_AIKARAJA_MS,
        max: 1
    });

    return new Promise((resolve, reject) => {
        let valmis = false;
        const aseta = tulos => {
            if (valmis) return;
            valmis = true;
            resolve(tulos);
        };

        kerain.on("collect", async valinta => {
            try {
                const indeksi = Number(valinta.values[0]);
                if (!Number.isInteger(indeksi) || indeksi < 0 || indeksi >= haku.kappaleet.length) {
                    await valinta.deferUpdate();
                    await interaction.editReply({ content: "Valittua hakutulosta ei löytynyt.", components: [] });
                    aseta(null);
                    return;
                }

                await valinta.deferUpdate();
                await interaction.editReply({ content: null, components: [] });
                console.info(`[musiikki-haku] ${JSON.stringify({ hakuId: haku.hakuId, vaihe: "tulos-valittu", lahde: haku.kappaleet[indeksi].lahde, tulos: indeksi + 1 })}`);
                aseta(haku.kappaleet[indeksi]);
            } catch (err) {
                if (!valmis) {
                    valmis = true;
                    reject(err);
                }
            }
        });

        kerain.on("end", (keratyt, syy) => {
            if (valmis || syy !== "time" || keratyt.size > 0) return;
            interaction.editReply({ content: "Hakutuloksen valinta vanheni. Suorita /soita uudelleen.", components: [] })
                .then(() => aseta(null), reject);
        });
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("soita")
        .setDescription("Soittaa musiikkia äänikanavalla: hakusana tai linkki (YouTube, SoundCloud, Spotify ym.).")
        .addStringOption(option =>
            option
                .setName("haku")
                .setDescription("Kappaleen nimi tai linkki")
                .setRequired(true)
                .setMaxLength(500)
        )
        .addStringOption(option =>
            option
                .setName("lahde")
                .setDescription("Mistä nimihaku tehdään (oletus: palvelimen oletus)")
                .setRequired(false)
                .addChoices(
                    { name: "YouTube", value: "youtube" },
                    { name: "SoundCloud", value: "soundcloud" }
                )
        ),

async execute(interaction) {

    const executeAlkoiMs = Date.now();
    const deferAlkoiMs = Date.now();
    const restDiagnostiikka = aloitaRestDiagnostiikka(interaction);
    let kuittaus;
    try {
        kuittaus = interaction.deferReply();
    } catch (err) {
        try {
            restDiagnostiikka?.kirjaa(err);
            console.warn("[deferReply-error] " + JSON.stringify({
                stage: "call",
                httpStatus: Number.isInteger(err?.status) ? err.status : null,
                discordCode: Number.isInteger(err?.code) ? err.code : null
            }));
            kirjaaInteractionAika(interaction, "deferReply-failure", {
                executeAlkoiMs,
                deferAlkoiMs,
                deferKestoMs: Date.now() - deferAlkoiMs,
                discordCode: err?.code ?? null
            });
        } finally {
            restDiagnostiikka?.palauta();
        }
        throw err;
    }

    kirjaaInteractionAika(interaction, "command-execute-start", { executeAlkoiMs });
    kirjaaInteractionAika(interaction, "deferReply-start", { deferAlkoiMs });
    try {
        await kuittaus;
        restDiagnostiikka?.kirjaa();
        kirjaaInteractionAika(interaction, "deferReply-success", {
            executeAlkoiMs,
            deferAlkoiMs,
            deferKestoMs: Date.now() - deferAlkoiMs,
            kuittausViiveMs: Date.now() - interaction.createdTimestamp
        });
    } catch (err) {
        restDiagnostiikka?.kirjaa(err);
        console.warn("[deferReply-error] " + JSON.stringify({
            stage: "await",
            httpStatus: Number.isInteger(err?.status) ? err.status : null,
            discordCode: Number.isInteger(err?.code) ? err.code : null
        }));
        kirjaaInteractionAika(interaction, "deferReply-failure", {
            deferKestoMs: Date.now() - deferAlkoiMs,
            discordCode: err?.code ?? null
        });
        throw err;
    } finally {
        restDiagnostiikka?.palauta();
    }

    const valmis = await valmisteleSoitto(interaction);
    if (!valmis) return;

    const { kanava } = valmis;

        try {
            const haku = await haeKappaleet(interaction.options.getString("haku"), {
                pyytaja: interaction.user.id,
                hakulahde: interaction.options.getString("lahde") ?? undefined,
                asetukset: asetukset()
            });

            if (!haku.kappaleet.length) {
                const syy = haku.hylatty
                    ? "Kaikki löydetyt kappaleet olivat suoria lähetyksiä tai liian pitkiä."
                    : "Mitään ei löytynyt tällä haulla.";
                return interaction.editReply(syy);
            }

            const valittu = haku.valittavat ? await valitseHakutulos(interaction, haku) : null;
            if (haku.valittavat && !valittu) return;
            const kappaleet = haku.valittavat ? [valittu] : haku.kappaleet;

            // Soitin haetaan vasta nyt: haun aikana toinen käyttäjä on voinut luoda sen.
            const soitin = haeTaiLuoSoitin(interaction.guildId);
            soitin.tekstikanava = interaction.channel;

            try {
                await soitin.yhdista(kanava);
            } catch (err) {
                if (!soitin.nyt && soitin.jono.length === 0) soitin.lopeta();
                throw err;
            }

            const tulos = soitin.lisaa(kappaleet);

            await interaction.editReply({
                embeds: [lisattyEmbed({
                    ...tulos,
                    hylatty: haku.hylatty,
                    lahde: haku.lahde,
                    jonoPituus: soitin.jono.length + (soitin.nyt ? 1 : 0)
                })]
            });

        } catch (err) {
            if (err instanceof MusiikkiVirhe) {
                return interaction.editReply(`⚠️ ${err.message}`);
            }
            throw err;
        }

    }
};
