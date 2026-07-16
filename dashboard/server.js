const express = require("express");
const path = require("path");

const {
    viestiListaAikavalilla,
    aaniListaAikavalilla,
    komentoListaAikavalilla,
    haeKaikkiAktiivisetSessiot
} = require("../utils/tilastot");

const {
    haeAktiivisetEpaillyt,
    haeSyyllisinLista,
    haeAvoimetTutkinnat
} = require("../utils/tutkintadata");

// Yksinkertainen välimuisti käyttäjätietojen hakuun, ettei jokainen
// dashboard-päivitys tee kymmeniä erillisiä Discord API -kutsuja.
const kayttajaCache = new Map(); // userId -> { data, haettu }
const CACHE_MS = 5 * 60 * 1000;

function kaynnistaDashboard(client, port = 3000) {

    const app = express();
    app.use(express.static(path.join(__dirname, "public")));

    async function resolveKayttaja(userId) {

        const valimuistissa = kayttajaCache.get(userId);
        if (valimuistissa && Date.now() - valimuistissa.haettu < CACHE_MS) {
            return valimuistissa.data;
        }

        try {
            const user = await client.users.fetch(userId);
            const data = {
                id: userId,
                username: user.username,
                avatar: user.displayAvatarURL({ size: 64 })
            };
            kayttajaCache.set(userId, { data, haettu: Date.now() });
            return data;
        } catch {
            const data = { id: userId, username: "Tuntematon agentti", avatar: null };
            kayttajaCache.set(userId, { data, haettu: Date.now() });
            return data;
        }

    }

    async function resolveMonta(rivit, idKentta = "userId") {
        return Promise.all(
            rivit.map(async (rivi) => ({ ...rivi, kayttaja: await resolveKayttaja(rivi[idKentta]) }))
        );
    }

    function valitseGuildId(req) {
        return req.query.guildId || client.guilds.cache.first()?.id || null;
    }

    // ==========================
    // API
    // ==========================

    app.get("/api/guilds", (req, res) => {
        res.json(
            [...client.guilds.cache.values()].map(g => ({
                id: g.id,
                name: g.name,
                memberCount: g.memberCount
            }))
        );
    });

    app.get("/api/overview", async (req, res) => {

        const guildId = valitseGuildId(req);
        const guild = guildId ? client.guilds.cache.get(guildId) : null;

        if (!guild) {
            return res.status(404).json({ error: "Palvelinta ei löytynyt." });
        }

        const kaikkiSessiot = await haeKaikkiAktiivisetSessiot();
        const aktiivisetTallaGuildilla = kaikkiSessiot.filter(s => s.guildId === guildId);

        res.json({
            id: guild.id,
            name: guild.name,
            memberCount: guild.memberCount,
            icon: guild.iconURL(),
            activeVoiceCount: aktiivisetTallaGuildilla.length,
            botTag: client.user.tag
        });

    });

    app.get("/api/leaderboard", async (req, res) => {

        const guildId = valitseGuildId(req);
        if (!guildId) return res.json([]);

        const kategoria = req.query.category ?? "viestit";
        const aikavali = req.query.range ?? "kaikki";

        let rivit;

        if (kategoria === "aani") {
            rivit = await aaniListaAikavalilla(guildId, aikavali, 10);
        } else if (kategoria === "komennot") {
            rivit = await komentoListaAikavalilla(guildId, aikavali, 10);
        } else {
            rivit = await viestiListaAikavalilla(guildId, aikavali, 10);
        }

        res.json(await resolveMonta(rivit));

    });

    app.get("/api/suspects", async (req, res) => {
        const guildId = valitseGuildId(req);
        if (!guildId) return res.json([]);
        const rivit = await haeAktiivisetEpaillyt(guildId);
        res.json(await resolveMonta(rivit.slice(0, 15)));
    });

    app.get("/api/guilt", async (req, res) => {
        const guildId = valitseGuildId(req);
        if (!guildId) return res.json([]);
        const rivit = await haeSyyllisinLista(guildId, 10);
        res.json(await resolveMonta(rivit));
    });

    app.get("/api/investigations", async (req, res) => {
        const guildId = valitseGuildId(req);
        if (!guildId) return res.json([]);
        const rivit = await haeAvoimetTutkinnat(guildId);
        res.json(await resolveMonta(rivit));
    });

    app.listen(port, () => {
        console.log(`🖥️  Dashboard käynnissä: http://localhost:${port}`);
    });

}

module.exports = { kaynnistaDashboard };
