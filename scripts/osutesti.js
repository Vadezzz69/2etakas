const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { DatabaseSync } = require("node:sqlite");
const { test } = require("node:test");
const { ChannelType } = require("discord.js");
const db = require("../utils/db");
const tilastot = require("../utils/tilastot");
const mukautetut = require("../utils/mukautetutKomennot");

const migraatio = readFileSync(require.resolve("../migrations/002-osu-daily-challenges.sql"), "utf8");
const osuPolku = require.resolve("../utils/osu");
const viestiPolku = require.resolve("../events/messageCreate");

function lataaOsu() {
    delete require.cache[osuPolku];
    return require(osuPolku).kasitteleOsu;
}

function kartta(id, tahdet, muut = {}) {
    return {
        id, mode_int: 0, status: "ranked", version: "Hyper [MX]", difficulty_rating: tahdet,
        bpm: 150, total_length: 201, ...muut
    };
}

function setti(id, title, beatmaps, muut = {}) {
    return {
        id, title, artist: "Chief Keef", creator: "Mapper", beatmaps, nsfw: false,
        covers: { cover: "https://assets.ppy.sh/beatmaps/1/covers/cover.jpg" }, ...muut
    };
}

const ranked = [1.5, 2.3, 3, 4.5, 5.8, 7.2].flatMap((tahdet, i) =>
    [0, 1].map(n => {
        const id = 100 + 2 * i + n;
        return setti(id, `Kappale ${id}`, [kartta(id * 10, tahdet)]);
    })
);
const vastaus = (beatmapsets, cursor_string) => Response.json({ beatmapsets, cursor_string });

function viesti(kohde = {}) {
    return {
        id: "123456789012345678",
        content: "",
        author: { id: "user" },
        guild: { id: "guild", members: { me: { id: "bot" } }, channels: { cache: new Map() } },
        channel: { id: "1" },
        member: { permissions: { has: () => false } },
        reply: async payload => payload,
        ...kohde
    };
}

function kentat(payload) {
    return Object.fromEntries(payload.embeds[0].toJSON().fields.map(({ name, value }) => [name, value]));
}

function kaytaKantaa(t) {
    const sqlite = new DatabaseSync(":memory:");
    sqlite.exec(migraatio);
    sqlite.exec(migraatio);
    sqlite.exec(`CREATE TABLE komitea_panels (
        guild TEXT, kind TEXT, channel TEXT, message TEXT, PRIMARY KEY (guild, kind)
    )`);
    t.after(() => sqlite.close());
    t.mock.method(db, "get", async (sql, args) => sqlite.prepare(sql).get(...args));
    t.mock.method(db, "run", async (sql, args) => sqlite.prepare(sql).run(...args));
    const batch = t.mock.method(db, "batch", async statements => {
        sqlite.exec("BEGIN");
        try {
            const tulokset = statements.map(({ query, params }) => {
                const komento = sqlite.prepare(query);
                return /^SELECT/.test(query) ? { results: komento.all(...params) } : komento.run(...params);
            });
            sqlite.exec("COMMIT");
            return tulokset;
        } catch (err) {
            sqlite.exec("ROLLBACK");
            throw err;
        }
    });
    return { sqlite, batch };
}

function kaytaHakua(t, haku = () => vastaus(ranked)) {
    const id = process.env.OSU_CLIENT_ID;
    const salaisuus = process.env.OSU_CLIENT_SECRET;
    process.env.OSU_CLIENT_ID = "test-client";
    process.env.OSU_CLIENT_SECRET = "test-secret";
    t.after(() => {
        if (id === undefined) delete process.env.OSU_CLIENT_ID;
        else process.env.OSU_CLIENT_ID = id;
        if (salaisuus === undefined) delete process.env.OSU_CLIENT_SECRET;
        else process.env.OSU_CLIENT_SECRET = salaisuus;
    });
    return t.mock.method(globalThis, "fetch", async (osoite, asetukset) => {
        const url = new URL(osoite);
        assert.equal(url.hostname, "osu.ppy.sh");
        assert.ok(asetukset.signal instanceof AbortSignal);
        if (url.pathname === "/oauth/token") {
            assert.equal(asetukset.method, "POST");
            assert.equal(JSON.parse(asetukset.body).grant_type, "client_credentials");
            return Response.json({ access_token: "test-token", expires_in: 3600 });
        }
        if (url.pathname.startsWith("/api/v2/")) {
            assert.equal(asetukset.headers.Authorization, "Bearer test-token");
            assert.equal(url.searchParams.get("m"), "0");
            assert.equal(url.searchParams.get("nsfw"), "false");
        }
        return haku(url, asetukset);
    });
}

test("vanhat listat säilyttävät tähtiluokat, määrät, ranked-rajauksen ja vierashaun", async t => {
    kaytaKantaa(t);
    const haku = kaytaHakua(t, url => {
        assert.equal(url.pathname, "/beatmapsets/search");
        assert.ok(Number(url.searchParams.get("page")) >= 1);
        return vastaus([
            ...ranked,
            setti(1, "NSFW", [kartta(1, 3)], { nsfw: true }),
            setti(2, "Loved", [kartta(2, 4, { status: "loved" })]),
            setti(3, "Taiko", [kartta(3, 4, { mode_int: 1 })]),
            setti(4, "Convert", [kartta(4, 4, { convert: true })])
        ]);
    });
    const osu = lataaOsu();
    const kaikki = Object.values(kentat(await osu(viesti(), [])));
    assert.equal(kaikki.length, 3);
    kaikki.forEach(lista => assert.equal(lista.split("\n").length, 2));
    for (const taso of ["helppo", "keskitaso", "vaikea"]) {
        const [lista] = Object.values(kentat(await osu(viesti(), [taso])));
        assert.equal(lista.split("\n").length, 4);
        assert.doesNotMatch(lista, /NSFW|Loved|Taiko|Convert/);
    }
    assert.match((await osu(viesti(), ["helppo", "ylimääräinen"])).content, /hakusana/);
    assert.equal(haku.mock.callCount(), 2);
});

test("monisanainen haku, sivutus, satunnaiset vaikeudet ja erilliset välimuistit", async t => {
    kaytaKantaa(t);
    const haku = kaytaHakua(t, url => {
        const q = url.searchParams.get("q");
        if (q === "Linkin Park") return vastaus([setti(9, "Numb", [kartta(90, 4)], { artist: q })]);
        assert.equal(q, "Chief Keef Love Sosa");
        assert.equal(url.searchParams.get("s"), "ranked");
        if (url.searchParams.has("cursor_string")) {
            assert.equal(url.searchParams.get("cursor_string"), "seuraava");
            return vastaus([setti(1, "Love Sosa", [kartta(12, 5)])]);
        }
        return vastaus([
            setti(1, "Love Sosa", [kartta(11, 3)]),
            setti(2, "Love Art", [kartta(20, 5)]),
            setti(3, "Love Sosa", [kartta(30, 5)], { nsfw: true }),
            setti(4, "Now or Never", [kartta(40, 3)], { artist: "Kendrick Lamar" })
        ], "seuraava");
    });
    const osu = lataaOsu();
    const sanat = ["Chief", "Keef", "Love", "Sosa"];
    t.mock.method(Math, "random", () => 0);
    const [ensimmainen, toinen] = await Promise.all([osu(viesti(), sanat), osu(viesti(), sanat)]);
    assert.equal(ensimmainen.embeds[0].data.url, toinen.embeds[0].data.url);
    assert.match(ensimmainen.embeds[0].data.url, /#osu\/11$/);
    assert.equal(kentat(ensimmainen).Kappale, "Love Sosa");
    assert.equal(kentat(ensimmainen).Kesto, "3:21");
    assert.equal(kentat(ensimmainen).Kartantekijä, "Mapper");
    assert.equal(kentat(ensimmainen).BPM, "150");
    assert.equal(ensimmainen.embeds[0].data.image.url, "https://assets.ppy.sh/beatmaps/1/covers/cover.jpg");
    assert.match(kentat(ensimmainen).Vaikeustaso, /\\\[/);
    assert.equal(ensimmainen.components[0].toJSON().components[0].url, ensimmainen.embeds[0].data.url);
    assert.deepEqual(ensimmainen.allowedMentions, { parse: [], repliedUser: false });
    assert.equal(haku.mock.callCount(), 3);
    Math.random.mock.mockImplementation(() => 0.99);
    assert.match((await osu(viesti(), sanat)).embeds[0].data.url, /#osu\/12$/);
    assert.equal(kentat(await osu(viesti(), ["Linkin", "Park"])).Kappale, "Numb");
    assert.equal(haku.mock.callCount(), 4);
});

test("erikoinen haku näyttää todellisen perusteen ja statuksen", async t => {
    kaytaKantaa(t);
    const haku = kaytaHakua(t, url => {
        assert.equal(url.searchParams.get("s"), "any");
        if (url.searchParams.get("q") === "Chief Keef") {
            return vastaus([
                setti(1, "Ordinary", [kartta(10, 4)]),
                setti(2, "Unusual", [kartta(20, 5, { bpm: 300, status: "loved" })]),
                setti(3, "NSFW", [kartta(30, 5)], { tags: "meme", nsfw: true })
            ]);
        }
        if (url.searchParams.get("q") === "joku muu") return vastaus([setti(2, "Unusual", [kartta(20, 5)], { tags: "meme" })]);
        if (url.searchParams.get("g") === "7") return vastaus([setti(4, "Novelty", [kartta(40, 5)], { genre_id: 7 })]);
        return vastaus([]);
    });
    const osu = lataaOsu();
    const osuma = kentat(await osu(viesti(), ["!erikoinen", "Chief", "Keef"]));
    assert.equal(osuma.Kappale, "Unusual");
    assert.equal(osuma.Status, "loved");
    assert.match(osuma["Miksi erikoinen?"], /300 BPM/);
    const satunnainen = kentat(await osu(viesti(), ["!erikoinen"]));
    assert.match(satunnainen["Miksi erikoinen?"], /Novelty/);
    assert.match((await osu(viesti(), ["!erikoinen", "joku", "muu"])).content, /ei löytynyt/);
    assert.equal(haku.mock.callCount(), 5);
});

test("tyhjä haku, epätäydellinen metadata ja hakusanaan kuulumattomat tulokset", async t => {
    kaytaKantaa(t);
    kaytaHakua(t, url => vastaus(url.searchParams.get("q") === "Darude Sandstorm" ? [
        { id: 1, artist: "Darude", title: "Sandstorm", covers: { cover: "javascript:alert(1)" },
            beatmaps: [{ id: 10, mode_int: 0, difficulty_rating: 3.5, status: "ranked" }] }
    ] : [setti(2, "Different Song", [kartta(20, 3)])]));
    const osu = lataaOsu();
    const payload = await osu(viesti(), ["Darude", "Sandstorm"]);
    assert.equal(kentat(payload).Kappale, "Sandstorm");
    assert.equal(kentat(payload).Kartantekijä, undefined);
    assert.equal(kentat(payload).BPM, undefined);
    assert.equal(payload.embeds[0].data.image, undefined);
    assert.match((await osu(viesti(), ["Love", "Sosa"])).content, /ei löytynyt/);
});

test("Suomen talvi- ja kesäajan vuorokausirajat sekä päivänhaasteen säilyminen", async t => {
    const { sqlite } = kaytaKantaa(t);
    const haku = kaytaHakua(t);
    t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-01-20T21:59:59Z") });
    const osu = lataaOsu();
    const ennen = await osu(viesti(), ["paivanhaaste"]);
    assert.equal(kentat(ennen).Päivämäärä, "20.01.2026");

    const uudelleen = lataaOsu();
    const sama = await uudelleen(viesti(), ["päivänhaaste"]);
    assert.equal(sama.embeds[0].data.url, ennen.embeds[0].data.url);
    assert.equal(haku.mock.callCount(), 2);

    t.mock.timers.setTime(Date.parse("2026-01-20T22:00:00Z"));
    const seuraava = await osu(viesti(), ["päivänhaaste"]);
    assert.equal(kentat(seuraava).Päivämäärä, "21.01.2026");
    assert.notEqual(seuraava.embeds[0].data.url, ennen.embeds[0].data.url);

    t.mock.timers.setTime(Date.parse("2026-06-01T20:59:59Z"));
    assert.equal(kentat(await osu(viesti(), ["päivänhaaste"])).Päivämäärä, "01.06.2026");
    t.mock.timers.setTime(Date.parse("2026-06-01T21:00:00Z"));
    assert.equal(kentat(await osu(viesti(), ["päivänhaaste"])).Päivämäärä, "02.06.2026");
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM osu_daily_challenges").get().n, 4);
});

test("samanaikaiset prosessit lukevat saman SQLite-rivin, virhe ei näytä pysyvää haastetta", async t => {
    const { sqlite, batch } = kaytaKantaa(t);
    kaytaHakua(t);
    const a = lataaOsu();
    const b = lataaOsu();
    const [yksi, kaksi] = await Promise.all([a(viesti(), ["päivänhaaste"]), b(viesti(), ["päivänhaaste"])]);
    assert.equal(yksi.embeds[0].data.url, kaksi.embeds[0].data.url);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM osu_daily_challenges").get().n, 1);
    assert.equal(batch.mock.calls.filter(kutsu => /INSERT/.test(kutsu.arguments[0][0].query)).length, 2);

    batch.mock.mockImplementation(async () => { throw new Error("D1 offline"); });
    const virhe = await a(viesti(), ["paivanhaaste"]);
    assert.match(virhe.content, /Pysyvää päivänhaastetta ei saatu/);
    assert.equal(virhe.embeds, undefined);
});

test("eri prosessit lähettävät samalle Discord-viestille saman yksilöintitunnisteen", async t => {
    kaytaKantaa(t);
    kaytaHakua(t);
    const a = lataaOsu();
    const b = lataaOsu();
    const viestit = [viesti(), viesti()];
    const [yksi, kaksi] = await Promise.all(viestit.map((v, i) => [a, b][i](v, ["päivänhaaste"])));
    assert.equal(yksi.nonce, viestit[0].id);
    assert.equal(kaksi.nonce, yksi.nonce);
    assert.equal(yksi.enforceNonce, true);
    assert.equal(kaksi.enforceNonce, true);

    const uusi = viesti({ id: "123456789012345679" });
    const tulos = await a(uusi, ["päivänhaaste"]);
    assert.equal(tulos.nonce, uusi.id);
    assert.notEqual(tulos.nonce, yksi.nonce);
});

test("aikakatkaisu vapauttaa haun ja HTTP 429 pysäyttää uudet pyynnöt", async t => {
    kaytaKantaa(t);
    let tila = "timeout";
    const haku = kaytaHakua(t, () => {
        if (tila === "timeout") throw new DOMException("Timed out", "TimeoutError");
        if (tila === "rate") return new Response(null, { status: 429, headers: { "retry-after": "10" } });
        return vastaus([setti(1, "Love Sosa", [kartta(10, 3)])]);
    });
    const osu = lataaOsu();
    t.mock.timers.enable({ apis: ["Date"], now: 1_000_000 });
    assert.match((await osu(viesti(), ["Love", "Sosa"])).content, /ei onnistunut/);
    tila = "rate";
    assert.match((await osu(viesti(), ["Love", "Sosa"])).content, /ruuhkaa/);
    assert.match((await osu(viesti(), ["Chief", "Keef"])).content, /ruuhkaa/);
    assert.equal(haku.mock.callCount(), 3);
    tila = "ok";
    t.mock.timers.tick(10_000);
    assert.equal(kentat(await osu(viesti(), ["Love", "Sosa"])).Kappale, "Love Sosa");
    assert.equal(haku.mock.callCount(), 4);
});

test("hakujen rinnakkaisuus ja kahden minuutin välimuisti ovat rajattuja", async t => {
    kaytaKantaa(t);
    let aktiiviset = 0;
    let maksimi = 0;
    const haku = kaytaHakua(t, async url => {
        aktiiviset++;
        maksimi = Math.max(maksimi, aktiiviset);
        await new Promise(resolve => setImmediate(resolve));
        aktiiviset--;
        return vastaus([setti(1, url.searchParams.get("q"), [kartta(10, 3)])]);
    });
    const osu = lataaOsu();
    t.mock.timers.enable({ apis: ["Date"], now: 1_000_000 });
    const haut = ["yksi", "kaksi", "kolme", "neljä", "viisi", "kuusi"];
    const tulokset = await Promise.all(haut.map(sana => osu(viesti(), [sana])));
    assert.deepEqual(tulokset.map(tulos => kentat(tulos).Kappale), haut);
    assert.equal(maksimi, 2);
    assert.equal(haku.mock.callCount(), 7);
    t.mock.timers.tick(119_999);
    await osu(viesti(), ["yksi"]);
    assert.equal(haku.mock.callCount(), 7);
    t.mock.timers.tick(1);
    await osu(viesti(), ["yksi"]);
    assert.equal(haku.mock.callCount(), 8);
});

test("kanavan asetus, maininta, oikeudet ja nykyisen paneelin päivitys", async t => {
    kaytaKantaa(t);
    const botinViesti = { id: "paneeli", author: { id: "bot" }, editable: true };
    const edit = botinViesti.edit = t.mock.fn(async payload => payload);
    const kanava = {
        id: "1", type: ChannelType.GuildText, permissionsFor: () => ({ has: () => true }),
        messages: { fetch: async () => botinViesti }
    };
    const send = kanava.send = t.mock.fn(async () => botinViesti);
    const kohde = { ...kanava, id: "2" };
    const viestipohja = viesti({ channel: kanava });
    viestipohja.guild.channels.cache.set("2", kohde);
    const osu = lataaOsu();
    assert.match((await osu(viestipohja, ["kanava"])).content, /hallintaoikeus/);
    viestipohja.member.permissions.has = () => true;
    assert.match((await osu(viestipohja, ["kanava"])).content, /asetettiin <#1>/);
    assert.match(send.mock.calls[0].arguments[0].embeds[0].data.description, /päivänhaaste/);
    assert.match((await osu(viestipohja, ["kanava"])).content, /ohje päivitettiin/);
    assert.equal(send.mock.callCount(), 1);
    assert.equal(edit.mock.callCount(), 1);
    assert.match((await osu(viestipohja, ["kanava", "<#2>"])).content, /asetettiin <#2>/);
    for (const args of [[], ["Love", "Sosa"], ["!erikoinen"], ["päivänhaaste"]]) {
        assert.match((await osu(viestipohja, args)).content, /kanavalla <#2>/);
    }
});

test("viestitilastointi edeltää osu!-reititystä ja tavalliset mukautetut komennot toimivat", async t => {
    kaytaKantaa(t);
    kaytaHakua(t);
    const kutsut = [];
    t.mock.method(tilastot, "kirjaaViesti", async (...args) => kutsut.push(["tilasto", ...args]));
    t.mock.method(mukautetut, "haeMukautettuKomento", async (...args) => {
        kutsut.push(["mukautettu", ...args]);
        return { response: "vastaus" };
    });
    lataaOsu();
    delete require.cache[viestiPolku];
    const { execute } = require(viestiPolku);
    t.after(() => { delete require.cache[viestiPolku]; });
    const oma = viesti({ content: "!housu", reply: async payload => kutsut.push(["reply", payload]) });
    await execute(oma);
    assert.deepEqual(kutsut, [["tilasto", "guild", "user"], ["mukautettu", "guild", "housu"], ["reply", "vastaus"]]);
    kutsut.length = 0;
    const payload = await execute(viesti({ content: "!osu    helppo" }));
    assert.deepEqual(kutsut, [["tilasto", "guild", "user"]]);
    assert.ok(kentat(payload)["Helppo · Easy ja Normal"]);
});
