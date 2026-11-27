const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, escapeMarkdown } = require("discord.js");
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
const OHJE = [
    "`!osu` arpoo karttoja kaikilta tasoilta.",
    "Valitse taso komennolla `!osu helppo`, `!osu keskitaso` tai `!osu vaikea`.",
    "`!osu [hakusana]` arpoo yhden artistiin tai kappaleeseen sopivan kartan.",
    "`!osu !erikoinen [hakusana]` etsii yhden erikoisen kartan. Hakusana on valinnainen.",
    "`!osu päivänhaaste` tai `!osu paivanhaaste` näyttää palvelimen päivän kartan.",
    "Ylläpitäjä voi asettaa kanavan tai päivittää ohjeen komennolla `!osu kanava [#kanava]`."
].join("\n");
const RANKED = new Set(["ranked"]);
const NOVELTY_GENRE = 7;
const JULKISET_STATUKSET = new Set(["ranked", "approved", "qualified", "loved", "pending", "wip", "graveyard"]);
const SUOMEN_PAIVA = new Intl.DateTimeFormat("fi-FI", {
    timeZone: "Europe/Helsinki", year: "numeric", month: "2-digit", day: "2-digit"
});
const HAKUVALIMUISTIN_KOKO = 24;
const HAKUJA_KERRALLAAN = 2;
const HAKUTULOSTEN_RAJA = 400;
const asetuksiaTallennetaan = new Set();
const haut = new Map();
let karttahaku;
let tunnus;
let tunnushaku;
let hakujaKaynnissa = 0;
const hakujaOdottaa = [];
let odotaAsti = 0;

class OsuHakuvirhe extends Error {
    constructor(code) {
        super(code);
        this.code = code;
    }
}

async function osuPyynto(url, asetukset) {
    if (Date.now() < odotaAsti || hakujaOdottaa.length >= 8) throw new OsuHakuvirhe("OSU_RUUHKA");
    if (hakujaKaynnissa < HAKUJA_KERRALLAAN) {
        hakujaKaynnissa++;
    } else {
        await new Promise(resolve => hakujaOdottaa.push(resolve));
    }

    try {
        if (Date.now() < odotaAsti) throw new OsuHakuvirhe("OSU_RUUHKA");
        const vastaus = await fetch(url, { ...asetukset, signal: AbortSignal.timeout(6000) });
        if (vastaus.status === 429) {
            const retryAfter = vastaus.headers.get("retry-after");
            const viive = retryAfter && /^\d+$/.test(retryAfter)
                ? Number(retryAfter) * 1000
                : Date.parse(retryAfter) - Date.now();
            odotaAsti = Math.max(odotaAsti, Date.now() + Math.max(1000, Number.isFinite(viive) ? viive : 30_000));
            throw new OsuHakuvirhe("OSU_RUUHKA");
        }
        if (!vastaus.ok) throw new Error(`osu! HTTP ${vastaus.status}`);
        return await vastaus.json();
    } finally {
        const seuraava = hakujaOdottaa.shift();
        if (seuraava) seuraava();
        else hakujaKaynnissa--;
    }
}

function haeTunnus() {
    const { OSU_CLIENT_ID, OSU_CLIENT_SECRET } = process.env;
    if (!OSU_CLIENT_ID || !OSU_CLIENT_SECRET) throw new OsuHakuvirhe("OSU_ASETUKSET");
    if (tunnus?.vanhenee > Date.now()) return Promise.resolve(tunnus.arvo);

    tunnushaku ??= osuPyynto("https://osu.ppy.sh/oauth/token", {
        method: "POST",
        redirect: "error",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
            client_id: OSU_CLIENT_ID, client_secret: OSU_CLIENT_SECRET,
            grant_type: "client_credentials", scope: "public"
        })
    }).then(data => {
        if (typeof data.access_token !== "string" || !Number.isFinite(data.expires_in)) {
            throw new Error("Virheellinen osu!-tunnusvastaus");
        }
        tunnus = { arvo: data.access_token, vanhenee: Date.now() + (data.expires_in - 30) * 1000 };
        return tunnus.arvo;
    }).finally(() => { tunnushaku = undefined; });
    return tunnushaku;
}

async function haeSivu(sivu, hakuehdot) {
    const url = new URL(hakuehdot
        ? "https://osu.ppy.sh/api/v2/beatmapsets/search"
        : "https://osu.ppy.sh/beatmapsets/search");
    const headers = { Accept: "application/json" };
    if (hakuehdot) {
        headers.Authorization = `Bearer ${await haeTunnus()}`;
        url.searchParams.set("m", "0");
        url.searchParams.set("nsfw", "false");
        url.searchParams.set("s", hakuehdot.status);
        if (hakuehdot.haku) url.searchParams.set("q", hakuehdot.haku);
        if (hakuehdot.genre) url.searchParams.set("g", String(hakuehdot.genre));
        if (hakuehdot.cursor) url.searchParams.set("cursor_string", hakuehdot.cursor);
    } else {
        url.searchParams.set("page", String(sivu));
    }

    const data = await osuPyynto(url, { headers, ...(hakuehdot && { redirect: "error" }) });
    if (data.error || !Array.isArray(data.beatmapsets)) throw new Error("Virheellinen karttalista");
    return data;
}

function metateksti(arvo) {
    return typeof arvo === "string" ? arvo.trim().slice(0, 300) : "";
}

function positiivinen(arvo) {
    return Number.isFinite(arvo) && arvo > 0 ? arvo : undefined;
}

function poimiKartat(setit, kartat, statukset, { erikoinen = false, osuvuus } = {}) {
    for (const setti of setit) {
        if (!setti || setti.nsfw || !Number.isSafeInteger(setti.id) || setti.id <= 0) continue;
        const artisti = metateksti(setti.artist) || metateksti(setti.artist_unicode);
        const nimi = metateksti(setti.title) || metateksti(setti.title_unicode);
        const tekija = metateksti(setti.creator);
        const kuva = kansikuva(setti.covers?.cover);
        for (const kartta of Array.isArray(setti.beatmaps) ? setti.beatmaps : []) {
            if (!kartta || kartta.mode_int !== 0 || kartta.convert || !statukset.has(kartta.status) ||
                !Number.isSafeInteger(kartta.id) || kartta.id <= 0 || !Number.isFinite(kartta.difficulty_rating)) continue;
            const syy = erikoinen ? erikoisuudenSyy(setti, kartta) : undefined;
            if (erikoinen && !syy) continue;
            kartat.set(kartta.id, {
                setti: setti.id,
                id: kartta.id,
                linkki: `https://osu.ppy.sh/beatmapsets/${setti.id}#osu/${kartta.id}`,
                kappale: `${artisti} – ${nimi}`,
                artisti, nimi, tekija, kuva,
                vaikeus: metateksti(kartta.version),
                tahdet: kartta.difficulty_rating,
                bpm: positiivinen(kartta.bpm) ?? positiivinen(setti.bpm),
                kesto: positiivinen(kartta.total_length),
                status: kartta.status,
                syy, osuvuus
            });
        }
    }
}

function kansikuva(arvo) {
    if (typeof arvo !== "string" || arvo.length > 512) return undefined;
    try {
        const url = new URL(arvo);
        if (url.protocol === "https:" && !url.username && !url.password &&
            (url.hostname === "osu.ppy.sh" || url.hostname.endsWith(".ppy.sh"))) return url.href;
    } catch {}
}

async function lataaKartat() {
    // Vierailijahaku ei tarjoa tähtisuodatusta. Luokitellaan kartat haun jälkeen.
    const tulokset = await Promise.allSettled(satunnaisetMonta(HAKUSIVUT, 2).map(sivu => haeSivu(sivu)));
    const kartat = new Map();
    for (const tulos of tulokset) {
        if (tulos.status === "fulfilled") poimiKartat(tulos.value.beatmapsets, kartat, RANKED);
    }
    if (kartat.size === 0) {
        const virhe = tulokset.find(tulos => tulos.reason?.code === "OSU_RUUHKA");
        throw virhe?.reason ?? new Error("Ei pelattavia osu!-karttoja");
    }
    return [...kartat.values()];
}

function haeKartat() {
    if (!karttahaku || karttahaku.vanhenee <= Date.now()) {
        const haku = { vanhenee: Infinity };
        haku.tulos = lataaKartat().then(kartat => {
            haku.vanhenee = Date.now() + KARTTOJEN_TTL_MS;
            return kartat;
        }).catch(err => {
            karttahaku = undefined;
            throw err;
        });
        karttahaku = haku;
    }
    return karttahaku.tulos;
}

function normalisoi(teksti) {
    return teksti.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}]+/gu)?.join(" ") ?? "";
}

function hakusananOsuvuus(setti, haku) {
    const artistit = [setti.artist, setti.artist_unicode].map(metateksti);
    const nimet = [setti.title, setti.title_unicode].map(metateksti);
    const kentat = new Set();
    for (const artisti of artistit) {
        for (const nimi of nimet) {
            for (const arvo of [artisti, nimi, `${artisti} ${nimi}`, `${nimi} ${artisti}`]) {
                kentat.add(normalisoi(arvo));
            }
        }
    }
    if (kentat.has(haku)) return 2;
    return [...kentat].some(arvo => ` ${arvo} `.includes(` ${haku} `)) ? 1 : 0;
}

function erikoisuudenSyy(setti, kartta) {
    const tagit = normalisoi(metateksti(setti.tags)).split(" ");
    const tagi = tagit.find(sana => ["meme", "memes", "parody", "novelty"].includes(sana));
    if (tagi) return `Karttasetin tagi: ${tagi}`;
    if (setti.genre_id === NOVELTY_GENRE) return "Karttasetin tyylilaji: Novelty.";
    const bpm = positiivinen(kartta.bpm) ?? positiivinen(setti.bpm);
    if (bpm && (bpm < 65 || bpm > 250)) return `Poikkeuksellinen tempo (${bpm} BPM).`;
}

async function lataaHakutulokset(haku, erikoinen) {
    const kartat = new Map();
    const osuma = normalisoi(haku);
    let cursor;
    for (let sivu = 0; sivu < 2; sivu++) {
        const genre = !haku && sivu === 1 ? NOVELTY_GENRE : undefined;
        const data = await haeSivu(undefined, {
            haku, status: erikoinen ? "any" : "ranked", cursor: genre ? undefined : cursor, genre
        });
        for (const setti of data.beatmapsets) {
            if (!setti) continue;
            const osuvuus = haku ? hakusananOsuvuus(setti, osuma) : 2;
            if (!osuvuus) continue;
            poimiKartat([setti], kartat, erikoinen ? JULKISET_STATUKSET : RANKED, { erikoinen, osuvuus });
            if (kartat.size >= HAKUTULOSTEN_RAJA) break;
        }
        const seuraava = data.cursor_string;
        if (kartat.size >= HAKUTULOSTEN_RAJA ||
            (haku && (typeof seuraava !== "string" || !seuraava || seuraava === cursor))) break;
        cursor = seuraava;
    }
    const ehdokkaat = [...kartat.values()];
    const parhaat = ehdokkaat.filter(kartta => kartta.osuvuus === 2);
    return (parhaat.length ? parhaat : ehdokkaat).slice(0, HAKUTULOSTEN_RAJA);
}

function haeHakutulokset(haku, erikoinen) {
    const avain = JSON.stringify([haku.toLowerCase(), erikoinen]);
    const nyt = Date.now();
    for (const [vanhaAvain, haku] of haut) {
        if (haku.vanhenee <= nyt) haut.delete(vanhaAvain);
    }
    if (haut.has(avain)) return haut.get(avain).tulos;
    if (haut.size >= HAKUVALIMUISTIN_KOKO) {
        const valmis = [...haut].find(([, haku]) => haku.vanhenee !== Infinity);
        if (!valmis) throw new OsuHakuvirhe("OSU_RUUHKA");
        haut.delete(valmis[0]);
    }
    const rivi = { vanhenee: Infinity };
    rivi.tulos = lataaHakutulokset(haku, erikoinen).then(kartat => {
        rivi.vanhenee = Date.now() + KARTTOJEN_TTL_MS;
        return kartat;
    }).catch(err => {
        haut.delete(avain);
        throw err;
    });
    haut.set(avain, rivi);
    return rivi.tulos;
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

function reply(message, vastaus) {
    const payload = typeof vastaus === "string" ? { content: vastaus } : vastaus;
    // Discord yhdistää samalla noncella lähetetyt vastaukset myös eri prosesseista.
    return message.reply({
        ...payload, nonce: message.id, enforceNonce: true, allowedMentions: EI_MAININTOJA
    });
}

function haeKanava(guildId) {
    return db.get("SELECT channel, message FROM komitea_panels WHERE guild=? AND kind='osu'", [guildId], AbortSignal.timeout(5000));
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
        if (asetettu?.channel === kanava.id) {
            const viesti = asetettu.message && await kanava.messages?.fetch(asetettu.message).catch(() => null);
            if (viesti?.author?.id === message.guild.members.me?.id && viesti?.editable) {
                await viesti.edit({
                    embeds: [info({ title: "🎯 osu!-haasteet", description: OHJE })],
                    allowedMentions: EI_MAININTOJA
                });
                return reply(message, `osu!-ohje päivitettiin kanavalla <#${kanava.id}>.`);
            }
            return reply(message, `osu!-haastekanava on jo <#${kanava.id}>.`);
        }
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

function paivaSuomessa(aika = new Date()) {
    const osat = Object.fromEntries(SUOMEN_PAIVA.formatToParts(aika).map(osa => [osa.type, osa.value]));
    return `${osat.year}-${osat.month}-${osat.day}`;
}

function paivanKarttaValinta(kartat, viimeiset) {
    const kappale = kartta => normalisoi(`${kartta.artisti} ${kartta.nimi}`);
    const viimeSetit = new Set(viimeiset.map(kartta => kartta.setti));
    const viimeKappaleet = new Set(viimeiset.map(kappale));
    const uudet = kartat.filter(kartta => !viimeSetit.has(kartta.setti) && !viimeKappaleet.has(kappale(kartta)));
    const ehdokkaat = uudet.length ? uudet : kartat;
    const luokat = [...TASOT.values()].flatMap(taso => taso.luokat).map(([min, max]) =>
        ehdokkaat.filter(kartta => kartta.tahdet >= min && kartta.tahdet < max)
    ).filter(luokka => luokka.length);
    const luokka = satunnaisetMonta(luokat, 1)[0] ?? ehdokkaat;
    const kappaleet = new Map();
    for (const kartta of luokka) {
        const avain = kappale(kartta) || kartta.setti;
        if (!kappaleet.has(avain)) kappaleet.set(avain, []);
        kappaleet.get(avain).push(kartta);
    }
    const versiot = satunnaisetMonta([...kappaleet.values()], 1)[0];
    return satunnaisetMonta(versiot, 1)[0];
}

async function haePaivanKartta(guild, paiva) {
    const rivit = await db.batch([{
        query: `SELECT day, beatmap FROM osu_daily_challenges
            WHERE guild = ? AND day BETWEEN date(?, '-5 days') AND ?
            ORDER BY day DESC`,
        params: [guild, paiva, paiva]
    }]);
    const historia = rivit[0].results;
    if (historia[0]?.day === paiva) return JSON.parse(historia[0].beatmap);

    const kartta = paivanKarttaValinta(await haeKartat(), historia.map(rivi => JSON.parse(rivi.beatmap)));
    const [, tulos] = await db.batch([{
        query: `INSERT INTO osu_daily_challenges (guild, day, beatmap)
            VALUES (?, ?, ?) ON CONFLICT (guild, day) DO NOTHING`,
        params: [guild, paiva, JSON.stringify(kartta)]
    }, {
        query: "SELECT beatmap FROM osu_daily_challenges WHERE guild = ? AND day = ?",
        params: [guild, paiva]
    }]);
    return JSON.parse(tulos.results[0].beatmap);
}

function naytaKartta(message, kartta, otsikko, paiva) {
    const minuutit = Math.floor(kartta.kesto / 60);
    const sekunnit = String(Math.floor(kartta.kesto % 60)).padStart(2, "0");
    const tiedot = [
        ["Kappale", siisti(kartta.nimi ?? "", 100)],
        ["Artisti", siisti(kartta.artisti ?? "", 100)],
        ["Kartantekijä", siisti(kartta.tekija ?? "", 100)],
        ["Vaikeustaso", siisti(kartta.vaikeus ?? "", 100)],
        ["Tähdet", `${kartta.tahdet.toFixed(2)} ★`],
        ["BPM", kartta.bpm && String(kartta.bpm)],
        ["Kesto", kartta.kesto && `${minuutit}:${sekunnit}`],
        ["Status", kartta.status],
        ["Päivämäärä", paiva?.split("-").reverse().join(".")],
        ["Miksi erikoinen?", kartta.syy]
    ];
    const fields = tiedot.filter(([, value]) => value).map(([name, value]) => ({ name, value, inline: name !== "Miksi erikoinen?" }));
    const linkki = new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Avaa kartta").setURL(kartta.linkki);
    return reply(message, {
        embeds: [info({ title: otsikko, fields, image: kartta.kuva, url: kartta.linkki })],
        components: [new ActionRowBuilder().addComponents(linkki)]
    });
}

async function kasitteleOsu(message, [toiminto, ...argumentit] = []) {
    const valittu = toiminto?.toLowerCase();
    const paivanhaaste = valittu === "paivanhaaste" || valittu === "päivänhaaste";
    const paiva = paivanhaaste ? paivaSuomessa() : undefined;
    try {
        if (valittu === "kanava") {
            return await (argumentit.length > 1 ? reply(message, OHJE) : asetaKanava(message, argumentit[0]));
        }
        if ((TASOT.has(valittu) || paivanhaaste) && argumentit.length) return await reply(message, OHJE);

        const asetettu = await haeKanava(message.guild.id);
        if (asetettu && message.channel.id !== asetettu.channel) {
            return await reply(message, `Arvo osu!-haaste kanavalla <#${asetettu.channel}>.`);
        }
        if (paivanhaaste) {
            const kartta = await haePaivanKartta(message.guild.id, paiva);
            return await naytaKartta(message, kartta, "🎯 osu! · Päivänhaaste", paiva);
        }
        if (!valittu || TASOT.has(valittu)) {
            const kartat = await haeKartat();
            return await reply(message, {
                embeds: [info({ title: "🎯 osu!-haastelista", fields: arvoLista(kartat, valittu) })]
            });
        }

        const erikoinen = valittu === "!erikoinen";
        const haku = (erikoinen ? argumentit : [toiminto, ...argumentit]).join(" ");
        if (haku.length > 250 || (haku && !normalisoi(haku))) {
            return await reply(message, "Käytä hakusanassa kirjaimia tai numeroita ja enintään 250 merkkiä.");
        }
        const kartat = await haeHakutulokset(haku, erikoinen);
        const kartta = satunnaisetMonta(kartat, 1)[0];
        if (!kartta) {
            return await reply(message, erikoinen
                ? "Erikoista osu!-karttaa ei löytynyt tällä haulla."
                : "Hakusanaan sopivaa osu!-karttaa ei löytynyt.");
        }
        return await naytaKartta(message, kartta, erikoinen ? "🎯 osu! · Erikoinen kartta" : "🎯 osu! · Hakutulos");
    } catch (err) {
        console.warn("[osu-haaste]", err?.name, err?.code);
        const viesti = {
            OSU_RUUHKA: "osu!-haussa on ruuhkaa. Kokeile hetken päästä.",
            OSU_ASETUKSET: "osu!-hakua varten ylläpidon pitää ottaa osu! API -yhteys käyttöön."
        }[err?.code] ?? (paivanhaaste
            ? "Pysyvää päivänhaastetta ei saatu juuri nyt. Kokeile hetken päästä."
            : "osu!-haaste ei onnistunut juuri nyt. Kokeile hetken päästä.");
        return reply(message, viesti).catch(() => {});
    }
}

module.exports = { kasitteleOsu };
