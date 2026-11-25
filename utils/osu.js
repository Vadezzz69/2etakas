const { ChannelType, PermissionFlagsBits, escapeMarkdown } = require("discord.js");
const db = require("./db");
const { info } = require("./ui");
const { satunnaisetMonta } = require("./satunnainen");

const TASOT = new Map([
    ["helppo", { nimi: "Helppo · Easy ja Normal", luokat: [[0, 2], [2, 2.7]] }],
    ["keskitaso", { nimi: "Keskitaso · Hard ja Insane", luokat: [[2.7, 4], [4, 5.3]] }],
    ["vaikea", { nimi: "Vaikea · Expert ja Expert+", luokat: [[5.3, 6.5], [6.5, Infinity]] }]
]);
const HAKUSIVUT = Array.from({ length: 100 }, (_, i) => i + 1);
const KARTTOJEN_TTL_MS = 120_000;
const EI_MAININTOJA = { parse: [], repliedUser: false };
const OHJE = "`!osu` arpoo mapit kaikilta tasoilta. Valitse oma tasosi komennolla `!osu helppo`, `!osu keskitaso` tai `!osu vaikea`.";
const asetuksiaTallennetaan = new Set();
let karttahaku;

async function haeSivu(sivu) {
    const url = new URL("https://osu.ppy.sh/beatmapsets/search");
    url.searchParams.set("page", String(sivu));
    const vastaus = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(6000)
    });
    if (!vastaus.ok) throw new Error(`osu! HTTP ${vastaus.status}`);
    const data = await vastaus.json();
    if (data.error || !Array.isArray(data.beatmapsets)) throw new Error("Virheellinen karttalista");
    return data.beatmapsets;
}

async function lataaKartat() {
    // Vierailijahaku ei käytä sivuston tähtisuodattimia. Luokitellaan kartat haun jälkeen.
    const tulokset = await Promise.allSettled(satunnaisetMonta(HAKUSIVUT, 2).map(haeSivu));
    const kartat = new Map();
    for (const tulos of tulokset) {
        if (tulos.status !== "fulfilled") continue;
        for (const setti of tulos.value) {
            if (setti.nsfw || !Number.isSafeInteger(setti.id)) continue;
            for (const kartta of setti.beatmaps ?? []) {
                if (kartta.mode_int !== 0 || kartta.convert || kartta.status !== "ranked" ||
                    !Number.isSafeInteger(kartta.id) || !Number.isFinite(kartta.difficulty_rating)) continue;
                kartat.set(kartta.id, {
                    setti: setti.id,
                    linkki: `https://osu.ppy.sh/beatmapsets/${setti.id}#osu/${kartta.id}`,
                    kappale: `${setti.artist} – ${setti.title}`,
                    vaikeus: kartta.version,
                    tahdet: kartta.difficulty_rating
                });
            }
        }
    }
    if (kartat.size === 0) throw new Error("Ei pelattavia osu!-karttoja");
    return [...kartat.values()];
}

function haeKartat() {
    if (!karttahaku || karttahaku.vanhenee <= Date.now()) {
        karttahaku = {
            vanhenee: Date.now() + KARTTOJEN_TTL_MS,
            tulos: lataaKartat().catch(err => {
                karttahaku = undefined;
                throw err;
            })
        };
    }
    return karttahaku.tulos;
}

function siisti(teksti, pituus) {
    return escapeMarkdown(String(teksti).replace(/\s+/g, " ").trim().slice(0, pituus))
        .replace(/[[\]]/g, "\\$&");
}

function arvoLista(kartat, valittu) {
    const kaytetyt = new Set();
    const tasot = valittu ? [TASOT.get(valittu)] : [...TASOT.values()];
    const maara = valittu ? 2 : 1;
    return tasot.map(taso => {
        const rivit = [];
        for (const [min, max] of taso.luokat) {
            const ehdokkaat = kartat.filter(k => k.tahdet >= min && k.tahdet < max && !kaytetyt.has(k.setti));
            let valittuja = 0;
            for (const kartta of satunnaisetMonta(ehdokkaat, ehdokkaat.length)) {
                if (kaytetyt.has(kartta.setti)) continue;
                kaytetyt.add(kartta.setti);
                rivit.push(`• [${siisti(kartta.kappale, 65)}](${kartta.linkki}) · ${siisti(kartta.vaikeus, 32)} · **${kartta.tahdet.toFixed(2)}★**`);
                if (++valittuja === maara) break;
            }
        }
        return { name: taso.nimi, value: rivit.join("\n") || "Tälle tasolle ei löytynyt karttoja tällä arvonnalla." };
    });
}

function reply(message, content) {
    return message.reply({ content, allowedMentions: EI_MAININTOJA });
}

function haeKanava(guildId) {
    return db.get("SELECT channel FROM komitea_panels WHERE guild=? AND kind='osu'", [guildId], AbortSignal.timeout(5000));
}

async function asetaKanava(message, kohde) {
    if (!message.member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return reply(message, "Haastekanavan vaihtamiseen tarvitaan palvelimen hallintaoikeus.");
    }

    const id = kohde?.match(/^<#(\d+)>$/)?.[1];
    if (kohde && !id) return reply(message, "Käytä `!osu kanava #kanava` tai kirjoita `!osu kanava` haluamallasi kanavalla.");
    const kanava = id ? message.guild.channels.cache.get(id) : message.channel;
    if (kanava?.type !== ChannelType.GuildText || !kanava.permissionsFor(message.member)?.has(PermissionFlagsBits.ViewChannel)) {
        return reply(message, "Valitse tekstikanava, jonka näet tällä palvelimella.");
    }
    if (!kanava.permissionsFor(message.guild.members.me)?.has([
        PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks
    ])) {
        return reply(message, "Botti tarvitsee valitulla kanavalla oikeudet nähdä kanava, lähettää viestejä ja upottaa linkkejä.");
    }

    const guildId = message.guild.id;
    if (asetuksiaTallennetaan.has(guildId)) return reply(message, "Haastekanavan tallennus on jo käynnissä.");
    asetuksiaTallennetaan.add(guildId);
    try {
        const asetettu = await haeKanava(guildId);
        if (asetettu?.channel === kanava.id) return reply(message, `osu!-haastekanava on jo <#${kanava.id}>.`);
        const ohjeviesti = await kanava.send({
            embeds: [info({ title: "🎯 osu!-haasteet", description: OHJE })],
            allowedMentions: EI_MAININTOJA
        });
        try {
            await db.run(`INSERT INTO komitea_panels(guild,kind,channel,message) VALUES(?,'osu',?,?)
                ON CONFLICT(guild,kind) DO UPDATE SET channel=excluded.channel,message=excluded.message`,
            [guildId, kanava.id, ohjeviesti.id]);
        } catch (err) {
            await ohjeviesti.delete().catch(() => {});
            throw err;
        }
        return reply(message, `osu!-haastekanavaksi asetettiin <#${kanava.id}>.`);
    } finally {
        asetuksiaTallennetaan.delete(guildId);
    }
}

async function kasitteleOsu(message, [toiminto, kohde, ...ylimaaraiset]) {
    const valittu = toiminto?.toLowerCase();
    try {
        if (valittu === "kanava" && ylimaaraiset.length === 0) return await asetaKanava(message, kohde);
        if (kohde || (valittu && !TASOT.has(valittu))) return await reply(message, OHJE);
        const asetettu = await haeKanava(message.guild.id);
        if (asetettu && message.channel.id !== asetettu.channel) {
            return await reply(message, `Arvo osu!-haaste kanavalla <#${asetettu.channel}>.`);
        }
        const kartat = await haeKartat();
        return await message.reply({
            embeds: [info({ title: "🎯 osu!-haastelista", fields: arvoLista(kartat, valittu) })],
            allowedMentions: EI_MAININTOJA
        });
    } catch (err) {
        console.warn("[osu-haaste]", err?.name, err?.code);
        return reply(message, "osu!-haaste ei onnistunut juuri nyt. Kokeile hetken päästä.").catch(() => {});
    }
}

module.exports = { kasitteleOsu };
