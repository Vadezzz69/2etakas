const { ActionRowBuilder, ComponentType, SlashCommandBuilder, StringSelectMenuBuilder } = require("discord.js");
const { AsyncLocalStorage } = require("node:async_hooks");
const { createHash, randomUUID } = require("node:crypto");
const { haeKappaleet, MusiikkiVirhe } = require("../../utils/musiikki/lahteet");
const { asetukset } = require("../../utils/musiikki/config");
const { valmisteleSoitto, haeTaiLuoSoitin } = require("../../utils/musiikki/ohjain");
const { lisattyEmbed } = require("../../utils/musiikki/muotoilu");

const VALINTA_AIKARAJA_MS = 60_000;
const REST_DIAGNOSTIIKKA_ENV = "SOITA_REST_DIAGNOSTIIKKA";
const restDiagnostiikkaContext = new AsyncLocalStorage();
const restDiagnostiikkaAsennetut = new WeakSet();

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

function tiivistaCallbackBody(body) {
    let raw = null;
    if (typeof body === "string") raw = body;
    else if (Buffer.isBuffer(body) || body instanceof Uint8Array) raw = Buffer.from(body).toString("utf8");
    else if (body && typeof body === "object") {
        try { raw = JSON.stringify(body); } catch { raw = null; }
    }

    let parsed = body;
    if (typeof raw === "string") {
        try { parsed = JSON.parse(raw); } catch { parsed = null; }
    }

    const rootKeys = parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? Object.keys(parsed).sort()
        : [];
    const data = parsed?.data;
    const dataKeys = data && typeof data === "object" && !Array.isArray(data)
        ? Object.keys(data).sort()
        : [];
    const isSafeDeferPayload = parsed?.type === 5 &&
        rootKeys.length === 2 && rootKeys.includes("type") && rootKeys.includes("data") &&
        dataKeys.length === 1 && dataKeys[0] === "flags" &&
        Number.isInteger(data.flags);

    return {
        byteLength: raw === null ? null : Buffer.byteLength(raw),
        sha256: raw === null ? null : createHash("sha256").update(raw).digest("hex"),
        json: isSafeDeferPayload ? raw : null,
        type: Number.isInteger(parsed?.type) ? parsed.type : null,
        rootKeys,
        dataKeys,
        flags: Number.isInteger(data?.flags) ? data.flags : null
    };
}

function callbackUrlForLog(url, pathParts, interactionsIndex) {
    const parsed = new URL(url);
    const safePath = pathParts.slice();
    safePath[interactionsIndex + 2] = "[REDACTED]";
    const query = parsed.searchParams.has("with_response")
        ? `?with_response=${encodeURIComponent(parsed.searchParams.get("with_response"))}`
        : "";
    return `${parsed.origin}/${safePath.join("/")}${query}`;
}

function headerValue(headers, name) {
    if (typeof headers?.get === "function") return headers.get(name);
    const key = Object.keys(headers ?? {}).find(item => item.toLowerCase() === name.toLowerCase());
    return key ? headers[key] : null;
}

function discordResponseForLog(error) {
    const raw = error?.rawError;
    if (!raw || typeof raw !== "object") return null;
    const message = typeof raw.message === "string"
        ? raw.message
            .replace(/https?:\/\/[^\s"'<>]+/gi, "[URL]")
            .replace(/[A-Za-z0-9._-]{40,}/g, "[REDACTED]")
            .slice(0, 160)
        : null;
    return {
        keys: Object.keys(raw).sort(),
        code: Number.isInteger(raw.code) ? raw.code : null,
        message
    };
}

function jononKokonaispituus(soitin) {
    return soitin ? soitin.jono.length + (soitin.nyt ? 1 : 0) : null;
}

function aloitaRestDiagnostiikka(interaction) {
    if (process.env[REST_DIAGNOSTIIKKA_ENV] !== "1") return null;

    const rest = interaction.client.rest;
    if (!restDiagnostiikkaAsennetut.has(rest)) {
        const alkuperainenMakeRequest = rest.options.makeRequest;
        if (typeof alkuperainenMakeRequest !== "function") return null;

        const tarkkailevaMakeRequest = function (url, init) {
            const context = restDiagnostiikkaContext.getStore();
            if (!context) return Reflect.apply(alkuperainenMakeRequest, this, arguments);

            const instrumentationStartedAt = Date.now();
            let osat;
            try {
                osat = new URL(url).pathname.split("/").filter(Boolean);
            } catch {
                context.otherRestRequestCount++;
                return Reflect.apply(alkuperainenMakeRequest, this, arguments);
            }

            const interactionsIndex = osat.lastIndexOf("interactions");
            const hasInteractionRoute = interactionsIndex >= 0;
            const routeId = hasInteractionRoute ? osat[interactionsIndex + 1] : undefined;
            const routeToken = hasInteractionRoute ? osat[interactionsIndex + 2] : undefined;
            const callbackRouteMatches = hasInteractionRoute &&
                interactionsIndex + 3 === osat.length - 1 &&
                Boolean(routeId) &&
                Boolean(routeToken) &&
                osat[interactionsIndex + 3] === "callback";
            const result = {
                methodMatchesPost: init?.method === "POST",
                callbackRouteMatches,
                apiVersionIsV10: osat[0] === "api" && osat[1] === "v10",
                interactionIdMatches: routeId === context.interactionId,
                interactionTokenMatches: routeToken === context.interactionToken,
                httpStatus: null,
                requestStartedAt: null,
                diagnosticPreparationMs: null,
                requestCompletedAt: null
            };
            const callbackMatchesInteraction = result.methodMatchesPost &&
                result.callbackRouteMatches &&
                result.apiVersionIsV10 &&
                result.interactionIdMatches &&
                result.interactionTokenMatches;

            if (callbackRouteMatches) {
                context.callbackRequestCount++;
                try {
                    result.callbackUrl = callbackUrlForLog(url, osat, interactionsIndex);
                    result.contentType = headerValue(init?.headers, "content-type");
                    result.httpBody = tiivistaCallbackBody(init?.body);
                } catch {
                    result.requestMetadataUnavailable = true;
                }
                context.lastCallbackRequest = result;
                if (callbackMatchesInteraction) {
                    context.matchingCallbackRequestCount++;
                    context.result = result;
                } else {
                    context.mismatchedCallbackRequestCount++;
                }
            } else {
                context.otherRestRequestCount++;
            }

            const requestStartedAt = Date.now();
            result.requestStartedAt = requestStartedAt;
            result.diagnosticPreparationMs = requestStartedAt - instrumentationStartedAt;
            const request = Reflect.apply(alkuperainenMakeRequest, this, arguments);
            if (!callbackMatchesInteraction) return request;

            return Promise.resolve(request).then(
                response => {
                    context.requestCompletedAt = Date.now();
                    result.requestCompletedAt = context.requestCompletedAt;
                    result.httpStatus = Number.isInteger(response?.status) ? response.status : null;
                    try {
                        result.discordDate = response?.headers?.get?.("date") ?? null;
                        result.discordDateHeaderResolutionMs = result.discordDate ? 1000 : null;
                        const discordDateMs = result.discordDate ? Date.parse(result.discordDate) : NaN;
                        result.localMinusDiscordMs = Number.isFinite(discordDateMs)
                            ? Date.now() - discordDateMs
                            : null;
                    } catch {
                        result.discordDate = null;
                        result.localMinusDiscordMs = null;
                    }
                    return response;
                },
                error => {
                    context.requestCompletedAt = Date.now();
                    result.requestCompletedAt = context.requestCompletedAt;
                    result.httpStatus = null;
                    throw error;
                }
            );
        };

        rest.options.makeRequest = tarkkailevaMakeRequest;
        restDiagnostiikkaAsennetut.add(rest);
    }

    const context = {
        interactionId: interaction.id,
        interactionToken: interaction.token,
        createdTimestamp: interaction.createdTimestamp,
        requestStartedAt: Date.now(),
        initiallyDeferred: interaction.deferred,
        initiallyReplied: interaction.replied,
        applicationId: interaction.applicationId,
        clientApplicationId: interaction.client.application?.id ?? null,
        callbackRequestCount: 0,
        matchingCallbackRequestCount: 0,
        mismatchedCallbackRequestCount: 0,
        otherRestRequestCount: 0,
        result: null,
        lastCallbackRequest: null
    };

    return {
        context,
        kirjaa(virhe) {
            const pyynto = context.result ?? context.lastCallbackRequest ?? {};
            console.info("[soita-rest-diagnostic] " + JSON.stringify({
                interactionId: context.interactionId,
                ageAtRequestMs: Number.isFinite(context.createdTimestamp) && Number.isFinite(pyynto.requestStartedAt)
                    ? pyynto.requestStartedAt - context.createdTimestamp
                    : null,
                ageAtDeferCallMs: Number.isFinite(context.createdTimestamp)
                    ? context.requestStartedAt - context.createdTimestamp
                    : null,
                deferToHttpRequestMs: Number.isFinite(pyynto.requestStartedAt)
                    ? pyynto.requestStartedAt - context.requestStartedAt
                    : null,
                diagnosticPreparationMs: Number.isFinite(pyynto.diagnosticPreparationMs)
                    ? pyynto.diagnosticPreparationMs
                    : null,
                requestDurationMs: Number.isFinite(pyynto.requestCompletedAt) && Number.isFinite(pyynto.requestStartedAt)
                    ? pyynto.requestCompletedAt - pyynto.requestStartedAt
                    : null,
                initiallyDeferred: context.initiallyDeferred,
                initiallyReplied: context.initiallyReplied,
                applicationIdMatches: Boolean(context.clientApplicationId && context.applicationId && context.clientApplicationId === context.applicationId),
                methodMatchesPost: pyynto.methodMatchesPost === true,
                callbackRouteMatches: pyynto.callbackRouteMatches === true,
                apiVersionIsV10: pyynto.apiVersionIsV10 === true,
                interactionIdMatches: pyynto.interactionIdMatches === true,
                interactionTokenMatches: pyynto.interactionTokenMatches === true,
                callbackRequestCount: context.callbackRequestCount,
                matchingCallbackRequestCount: context.matchingCallbackRequestCount,
                mismatchedCallbackRequestCount: context.mismatchedCallbackRequestCount,
                otherRestRequestCount: context.otherRestRequestCount,
                pid: process.pid,
                httpStatus: Number.isInteger(pyynto.httpStatus) ? pyynto.httpStatus : null,
                discordCode: Number.isInteger(virhe?.code) ? virhe.code : null,
                discordResponse: discordResponseForLog(virhe),
                callbackUrl: pyynto.callbackUrl ?? null,
                callbackContentType: pyynto.contentType ?? null,
                callbackHttpBody: pyynto.httpBody ?? null,
                discordDate: pyynto.discordDate ?? null,
                discordDateHeaderResolutionMs: pyynto.discordDateHeaderResolutionMs ?? null,
                localMinusDiscordMs: Number.isFinite(pyynto.localMinusDiscordMs) ? pyynto.localMinusDiscordMs : null
            }));
        },
        palauta() {}
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
                await interaction.editReply({ content: "Lisätään kappaletta jonoon...", components: [] });
                console.info(`[musiikki-haku] ${JSON.stringify({
                    hakuId: haku.hakuId,
                    vaihe: "tulos-valittu",
                    lahde: haku.kappaleet[indeksi].lahde,
                    tulos: indeksi + 1,
                    hakutapa: haku.hakutapa ?? "suora",
                    valinnanSyy: "kayttajan-valinta",
                    samankaltaisuus: haku.arviot?.[indeksi]?.samankaltaisuus ?? null,
                    osumanPeruste: haku.arviot?.[indeksi]?.valinnanSyy ?? null
                })}`);
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
    const restDiagnostiikkaBypass = process.env.SOITA_REST_DIAGNOSTIIKKA_BYPASS === "1";
    const restDiagnostiikka = restDiagnostiikkaBypass ? null : aloitaRestDiagnostiikka(interaction);
    console.info("[soita-ab] " + JSON.stringify({
        mode: restDiagnostiikkaBypass ? "B-bypass" : restDiagnostiikka ? "A-diagnostic" : "unconfigured",
        pid: process.pid
    }));
    let kuittaus;
    try {
        kuittaus = restDiagnostiikka
            ? restDiagnostiikkaContext.run(restDiagnostiikka.context, () => interaction.deferReply())
            : interaction.deferReply();
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
    let vaihe = "haku";
    let kappaleLoytyi = false;
    let jonoonLisaysKutsuttu = false;
    let jonoonLisaysOnnistui = false;
    let jonoEnnen = jononKokonaispituus(valmis.soitin);
    let soitin = null;
    let hakuId = null;

        try {
            const haku = await haeKappaleet(interaction.options.getString("haku"), {
                pyytaja: interaction.user.id,
                hakulahde: interaction.options.getString("lahde") ?? undefined,
                asetukset: asetukset()
            });
            hakuId = haku.hakuId ?? null;
            kappaleLoytyi = haku.kappaleet.length > 0;
            console.info("[musiikki-jono] " + JSON.stringify({
                vaihe: "haku-valmis",
                hakuId,
                loytyi: kappaleLoytyi,
                tuloksia: haku.kappaleet.length,
                jonoonLisaysKutsuttu: false
            }));

            if (!haku.kappaleet.length) {
                const syy = haku.hylatty
                    ? "Kaikki löydetyt kappaleet olivat suoria lähetyksiä tai liian pitkiä."
                    : "Mitään ei löytynyt tällä haulla.";
                return interaction.editReply(syy);
            }

            vaihe = "valinta";
            const valittu = haku.valittavat ? await valitseHakutulos(interaction, haku) : null;
            if (haku.valittavat && !valittu) {
                console.info("[musiikki-jono] " + JSON.stringify({
                    vaihe: "valinta-peruttu",
                    hakuId,
                    loytyi: kappaleLoytyi,
                    jonoonLisaysKutsuttu: false
                }));
                return;
            }
            const valittuIndeksi = haku.valittavat
                ? haku.kappaleet.findIndex(kappale => kappale.url === valittu.url)
                : -1;
            const soundCloudVaihtoehdot = valittuIndeksi >= 0
                ? haku.kappaleet.slice(valittuIndeksi + 1).concat(haku.kappaleet.slice(0, valittuIndeksi))
                : [];
            const kappaleet = haku.valittavat
                ? [{
                    ...valittu,
                    varatoistonEhdokkaat: valittu.hakulahde === "soundcloud"
                        ? soundCloudVaihtoehdot
                        : []
                }]
                : haku.kappaleet;

            // Soitin haetaan vasta nyt: haun aikana toinen käyttäjä on voinut luoda sen.
            vaihe = "soitin";
            soitin = haeTaiLuoSoitin(interaction.guildId);
            soitin.tekstikanava = interaction.channel;

            try {
                await soitin.yhdista(kanava);
            } catch (err) {
                if (!soitin.nyt && soitin.jono.length === 0) soitin.lopeta();
                throw err;
            }

            vaihe = "jonoon-lisays";
            jonoEnnen = jononKokonaispituus(soitin);
            jonoonLisaysKutsuttu = true;
            console.info("[musiikki-jono] " + JSON.stringify({
                vaihe: "lisays-alkoi",
                hakuId,
                loytyi: kappaleLoytyi,
                kappaleita: kappaleet.length,
                jonoonLisaysKutsuttu,
                jononPituusEnnen: jonoEnnen
            }));
            const tulos = soitin.lisaa(kappaleet);
            jonoonLisaysOnnistui = true;
            const jonoJalkeen = jononKokonaispituus(soitin);
            console.info("[musiikki-jono] " + JSON.stringify({
                vaihe: "lisays-valmis",
                hakuId,
                loytyi: kappaleLoytyi,
                lisatty: tulos.lisatyt.length,
                pudotettu: tulos.pudotettu,
                jonoonLisaysKutsuttu,
                onnistui: true,
                jononPituusEnnen: jonoEnnen,
                jononPituusJalkeen: jonoJalkeen
            }));

            vaihe = "vastaus";
            await interaction.editReply({
                embeds: [lisattyEmbed({
                    ...tulos,
                    hylatty: haku.hylatty,
                    lahde: haku.lahde,
                    jonoPituus: jonoJalkeen
                })]
            });

        } catch (err) {
            console.warn("[musiikki-jono] " + JSON.stringify({
                vaihe: jonoonLisaysOnnistui ? "jonon-lisays-valmis-vastaus-epaonnistui" : "lisays-epaonnistui",
                vaiheKohta: vaihe,
                hakuId,
                loytyi: kappaleLoytyi,
                jonoonLisaysKutsuttu,
                jonoonLisaysOnnistui,
                onnistui: jonoonLisaysOnnistui,
                jononPituusEnnen: jonoEnnen,
                jononPituusJalkeen: jononKokonaispituus(soitin ?? valmis.soitin),
                virheNimi: typeof err?.name === "string" ? err.name : null,
                virheKoodi: typeof err?.code === "string" || Number.isInteger(err?.code) ? err.code : null
            }));
            if (err instanceof MusiikkiVirhe) {
                return interaction.editReply(`⚠️ ${err.message}`);
            }
            throw err;
        }

    }
};
