const { run, get, all } = require("./db");

async function lisaaVaroitus(guildId, userId, syy, moderaattoriId) {
    await run(
        `INSERT INTO warnings (guildId, userId, reason, moderatorId, timestamp) VALUES (?, ?, ?, ?, ?)`,
        [guildId, userId, syy, moderaattoriId, Date.now()]
    );
}

async function haeVaroitustenMaara(guildId, userId) {
    const row = await get(
        `SELECT COUNT(*) as count FROM warnings WHERE guildId = ? AND userId = ?`,
        [guildId, userId]
    );
    return row?.count ?? 0;
}

async function haeVaroitukset(guildId, userId, limit = 10) {
    return all(
        `SELECT reason, moderatorId, timestamp FROM warnings WHERE guildId = ? AND userId = ? ORDER BY timestamp DESC LIMIT ?`,
        [guildId, userId, limit]
    );
}

module.exports = { lisaaVaroitus, haeVaroitustenMaara, haeVaroitukset };
