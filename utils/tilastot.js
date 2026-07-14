const { run, get, all } = require("./db");

function tanaan() {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

async function kirjaaViesti(guildId, userId) {
    await run(
        `INSERT INTO message_stats (guildId, userId, date, count) VALUES (?, ?, ?, 1)
         ON CONFLICT(guildId, userId, date) DO UPDATE SET count = count + 1`,
        [guildId, userId, tanaan()]
    );
}

async function lisaaAanaikaa(guildId, userId, seconds) {
    if (seconds <= 0) return;
    await run(
        `INSERT INTO voice_stats (guildId, userId, date, seconds) VALUES (?, ?, ?, ?)
         ON CONFLICT(guildId, userId, date) DO UPDATE SET seconds = seconds + excluded.seconds`,
        [guildId, userId, tanaan(), seconds]
    );
}

async function kirjaaKomento(guildId, userId, command) {
    await run(
        `INSERT INTO command_usage (guildId, userId, command, timestamp) VALUES (?, ?, ?, ?)`,
        [guildId, userId, command, Date.now()]
    );
}

// --- Päivän kärkinimet yksittäisille kategorioille ---

async function aktiivisinKirjoittaja(guildId) {
    return get(
        `SELECT userId, count FROM message_stats WHERE guildId = ? AND date = ? ORDER BY count DESC LIMIT 1`,
        [guildId, tanaan()]
    );
}

async function aktiivisinAanikanavassa(guildId) {
    return get(
        `SELECT userId, seconds FROM voice_stats WHERE guildId = ? AND date = ? ORDER BY seconds DESC LIMIT 1`,
        [guildId, tanaan()]
    );
}

async function aktiivisinKomennoissa(guildId) {
    const alkaenTanaan = new Date(`${tanaan()}T00:00:00.000Z`).getTime();
    return get(
        `SELECT userId, COUNT(*) as count FROM command_usage
         WHERE guildId = ? AND timestamp >= ?
         GROUP BY userId ORDER BY count DESC LIMIT 1`,
        [guildId, alkaenTanaan]
    );
}

// --- Ennätyslistat (top 10) ---

async function viestiLista(guildId, limit = 10) {
    return all(
        `SELECT userId, count FROM message_stats WHERE guildId = ? AND date = ? ORDER BY count DESC LIMIT ?`,
        [guildId, tanaan(), limit]
    );
}

async function aaniLista(guildId, limit = 10) {
    return all(
        `SELECT userId, seconds FROM voice_stats WHERE guildId = ? AND date = ? ORDER BY seconds DESC LIMIT ?`,
        [guildId, tanaan(), limit]
    );
}

async function komentoLista(guildId, limit = 10) {
    const alkaenTanaan = new Date(`${tanaan()}T00:00:00.000Z`).getTime();
    return all(
        `SELECT userId, COUNT(*) as count FROM command_usage
         WHERE guildId = ? AND timestamp >= ?
         GROUP BY userId ORDER BY count DESC LIMIT ?`,
        [guildId, alkaenTanaan, limit]
    );
}

async function kayttajanViestitTanaan(guildId, userId) {
    const row = await get(
        `SELECT count FROM message_stats WHERE guildId = ? AND userId = ? AND date = ?`,
        [guildId, userId, tanaan()]
    );
    return row?.count ?? 0;
}

async function kayttajanAaniTanaan(guildId, userId) {
    const row = await get(
        `SELECT seconds FROM voice_stats WHERE guildId = ? AND userId = ? AND date = ?`,
        [guildId, userId, tanaan()]
    );
    return row?.seconds ?? 0;
}

// --- Kaikkiaikaiset tilastot (koko historian ajalta) ---

async function kayttajanViestitYhteensa(guildId, userId) {
    const row = await get(
        `SELECT COALESCE(SUM(count), 0) as total FROM message_stats WHERE guildId = ? AND userId = ?`,
        [guildId, userId]
    );
    return row?.total ?? 0;
}

async function kayttajanAaniYhteensa(guildId, userId) {
    const row = await get(
        `SELECT COALESCE(SUM(seconds), 0) as total FROM voice_stats WHERE guildId = ? AND userId = ?`,
        [guildId, userId]
    );
    return row?.total ?? 0;
}

async function kayttajanKomentojaYhteensa(guildId, userId) {
    const row = await get(
        `SELECT COUNT(*) as total FROM command_usage WHERE guildId = ? AND userId = ?`,
        [guildId, userId]
    );
    return row?.total ?? 0;
}

async function kayttajanSuosikkiKomento(guildId, userId) {
    return get(
        `SELECT command, COUNT(*) as count FROM command_usage
         WHERE guildId = ? AND userId = ?
         GROUP BY command ORDER BY count DESC LIMIT 1`,
        [guildId, userId]
    );
}

async function kayttajanViestisija(guildId, userId) {
    const rivit = await all(
        `SELECT userId, SUM(count) as total FROM message_stats WHERE guildId = ? GROUP BY userId ORDER BY total DESC`,
        [guildId]
    );
    const sija = rivit.findIndex(r => r.userId === userId);
    return { sija: sija === -1 ? null : sija + 1, jasenmaara: rivit.length };
}

module.exports = {
    tanaan,
    kirjaaViesti,
    lisaaAanaikaa,
    kirjaaKomento,
    aktiivisinKirjoittaja,
    aktiivisinAanikanavassa,
    aktiivisinKomennoissa,
    viestiLista,
    aaniLista,
    komentoLista,
    kayttajanViestitTanaan,
    kayttajanAaniTanaan,
    kayttajanViestitYhteensa,
    kayttajanAaniYhteensa,
    kayttajanKomentojaYhteensa,
    kayttajanSuosikkiKomento,
    kayttajanViestisija
};
