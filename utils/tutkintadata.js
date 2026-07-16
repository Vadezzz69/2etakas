const { run, get, all } = require("./db");

// =====================================================
// PALVELINASETUKSET
// =====================================================

async function asetaIlmoituskanava(guildId, channelId) {
    await run(
        `INSERT INTO guild_settings (guildId, announceChannelId) VALUES (?, ?)
         ON CONFLICT(guildId) DO UPDATE SET announceChannelId = excluded.announceChannelId`,
        [guildId, channelId]
    );
}

async function haeAsetukset(guildId) {
    return get(`SELECT * FROM guild_settings WHERE guildId = ?`, [guildId]);
}

async function merkitseDigestLahetetyksi(guildId, paivamaara) {
    await run(
        `INSERT INTO guild_settings (guildId, lastDigestDate) VALUES (?, ?)
         ON CONFLICT(guildId) DO UPDATE SET lastDigestDate = excluded.lastDigestDate`,
        [guildId, paivamaara]
    );
}

async function haeKaikkiAsetuksetJoillaKanava() {
    return all(`SELECT * FROM guild_settings WHERE announceChannelId IS NOT NULL`);
}

// =====================================================
// EPÄILTYJEN LISTA
// =====================================================

async function lisaaEpailty(guildId, userId, reason, addedBy) {
    await run(
        `INSERT INTO suspects (guildId, userId, reason, addedBy, timestamp, active) VALUES (?, ?, ?, ?, ?, 1)`,
        [guildId, userId, reason, addedBy, Date.now()]
    );
}

async function haeAktiivisetEpaillyt(guildId) {
    return all(
        `SELECT * FROM suspects WHERE guildId = ? AND active = 1 ORDER BY timestamp DESC`,
        [guildId]
    );
}

async function poistaEpailyistaAktiivisuus(guildId, userId) {
    const tulos = await run(
        `UPDATE suspects SET active = 0 WHERE guildId = ? AND userId = ? AND active = 1`,
        [guildId, userId]
    );
    return tulos.changes;
}

// =====================================================
// TUTKINNAT
// =====================================================

async function aloitaTutkinta(guildId, userId, title, openedBy) {
    const tulos = await run(
        `INSERT INTO investigations (guildId, userId, title, status, openedBy, openedAt)
         VALUES (?, ?, ?, 'open', ?, ?)`,
        [guildId, userId, title, openedBy, Date.now()]
    );
    return tulos.lastID;
}

async function lisaaTodiste(investigationId, addedBy, content) {
    await run(
        `INSERT INTO investigation_evidence (investigationId, addedBy, content, timestamp) VALUES (?, ?, ?, ?)`,
        [investigationId, addedBy, content, Date.now()]
    );
}

async function haeTodisteet(investigationId) {
    return all(
        `SELECT * FROM investigation_evidence WHERE investigationId = ? ORDER BY timestamp ASC`,
        [investigationId]
    );
}

async function suljeTutkinta(investigationId, verdict) {
    await run(
        `UPDATE investigations SET status = 'closed', closedAt = ?, verdict = ? WHERE id = ?`,
        [Date.now(), verdict, investigationId]
    );
}

async function haeTutkinta(investigationId) {
    return get(`SELECT * FROM investigations WHERE id = ?`, [investigationId]);
}

async function haeAvoimetTutkinnat(guildId) {
    return all(
        `SELECT * FROM investigations WHERE guildId = ? AND status = 'open' ORDER BY openedAt DESC`,
        [guildId]
    );
}

// =====================================================
// SYYLLISYYSLOKI (append-only — prosentti lasketaan lennossa)
// =====================================================

async function lisaaSyyllisyytta(guildId, userId, delta, syy) {
    await run(
        `INSERT INTO guilt_log (guildId, userId, delta, syy, timestamp) VALUES (?, ?, ?, ?, ?)`,
        [guildId, userId, delta, syy, Date.now()]
    );
}

async function haeSyyllisyysprosentti(guildId, userId) {
    const row = await get(
        `SELECT COALESCE(SUM(delta), 0) as summa FROM guilt_log WHERE guildId = ? AND userId = ?`,
        [guildId, userId]
    );
    const summa = row?.summa ?? 0;
    // Puristetaan välille 0-100, jotta prosentti pysyy järkevänä vaikka
    // historiaa olisi kertynyt paljon suuntaan tai toiseen.
    return Math.max(0, Math.min(100, summa));
}

async function haeSyyllisyysHistoria(guildId, userId, limit = 10) {
    return all(
        `SELECT delta, syy, timestamp FROM guilt_log
         WHERE guildId = ? AND userId = ? ORDER BY timestamp DESC LIMIT ?`,
        [guildId, userId, limit]
    );
}

async function haeSyyllisinLista(guildId, limit = 10) {
    return all(
        `SELECT userId, SUM(delta) as summa FROM guilt_log
         WHERE guildId = ? GROUP BY userId ORDER BY summa DESC LIMIT ?`,
        [guildId, limit]
    );
}

// =====================================================
// ÄÄNESTYKSET
// =====================================================

async function aloitaAanestys(guildId, targetUserId, startedBy, question, kestoMs) {
    const nyt = Date.now();
    const tulos = await run(
        `INSERT INTO votes (guildId, targetUserId, startedBy, question, status, startedAt, endsAt)
         VALUES (?, ?, ?, ?, 'open', ?, ?)`,
        [guildId, targetUserId, startedBy, question, nyt, nyt + kestoMs]
    );
    return tulos.lastID;
}

async function annaAani(voteId, userId, choice) {
    await run(
        `INSERT INTO vote_ballots (voteId, userId, choice, timestamp) VALUES (?, ?, ?, ?)
         ON CONFLICT(voteId, userId) DO UPDATE SET choice = excluded.choice, timestamp = excluded.timestamp`,
        [voteId, userId, choice, Date.now()]
    );
}

async function haeAanestysTulos(voteId) {
    return all(
        `SELECT choice, COUNT(*) as maara FROM vote_ballots WHERE voteId = ? GROUP BY choice`,
        [voteId]
    );
}

async function suljeAanestys(voteId) {
    await run(`UPDATE votes SET status = 'closed' WHERE id = ?`, [voteId]);
}

async function haeAanestys(voteId) {
    return get(`SELECT * FROM votes WHERE id = ?`, [voteId]);
}

// =====================================================
// TUOMIOHISTORIA (kaikki /tuomio, /komitea ja automaattiset tuomiot)
// =====================================================

async function kirjaaTuomio(guildId, userId, verdict, source, automated = false) {
    await run(
        `INSERT INTO verdicts_log (guildId, userId, verdict, source, automated, timestamp) VALUES (?, ?, ?, ?, ?, ?)`,
        [guildId, userId, verdict, source, automated ? 1 : 0, Date.now()]
    );
}

async function haeTuomiohistoria(guildId, userId, limit = 10) {
    return all(
        `SELECT verdict, source, automated, timestamp FROM verdicts_log
         WHERE guildId = ? AND userId = ? ORDER BY timestamp DESC LIMIT ?`,
        [guildId, userId, limit]
    );
}

async function haeTuomioidenMaara(guildId, userId) {
    const row = await get(
        `SELECT COUNT(*) as maara FROM verdicts_log WHERE guildId = ? AND userId = ?`,
        [guildId, userId]
    );
    return row?.maara ?? 0;
}

module.exports = {
    asetaIlmoituskanava,
    haeAsetukset,
    merkitseDigestLahetetyksi,
    haeKaikkiAsetuksetJoillaKanava,

    lisaaEpailty,
    haeAktiivisetEpaillyt,
    poistaEpailyistaAktiivisuus,

    aloitaTutkinta,
    lisaaTodiste,
    haeTodisteet,
    suljeTutkinta,
    haeTutkinta,
    haeAvoimetTutkinnat,

    lisaaSyyllisyytta,
    haeSyyllisyysprosentti,
    haeSyyllisyysHistoria,
    haeSyyllisinLista,

    aloitaAanestys,
    annaAani,
    haeAanestysTulos,
    suljeAanestys,
    haeAanestys,

    kirjaaTuomio,
    haeTuomiohistoria,
    haeTuomioidenMaara
};
