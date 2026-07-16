const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const db = new sqlite3.Database(
    path.join(process.cwd(), "database.sqlite"),
    (err) => {
        if (err) {
            console.error("❌ Tietokannan avaus epäonnistui:", err);
        } else {
            console.log("✅ SQLite-tietokanta yhdistetty.");
        }
    }
);

db.serialize(() => {

    // ==========================
    // Loukkaantumiset
    // ==========================
    db.run(`
        CREATE TABLE IF NOT EXISTS injuries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guildId TEXT NOT NULL,
            userId TEXT NOT NULL,
            reason TEXT NOT NULL,
            reportedBy TEXT NOT NULL,
            timestamp INTEGER NOT NULL
        )
    `);

    // ==========================
    // Päivittäiset viestit
    // ==========================
    db.run(`
        CREATE TABLE IF NOT EXISTS message_stats (
            guildId TEXT NOT NULL,
            userId TEXT NOT NULL,
            date TEXT NOT NULL,
            count INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (guildId, userId, date)
        )
    `);

    // ==========================
    // Päivittäinen ääniaktiivisuus
    // ==========================
    db.run(`
        CREATE TABLE IF NOT EXISTS voice_stats (
            guildId TEXT NOT NULL,
            userId TEXT NOT NULL,
            date TEXT NOT NULL,
            seconds INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (guildId, userId, date)
        )
    `);

    // ==========================
    // Aktiiviset äänisessiot
    // Tämä mahdollistaa sen,
    // ettei restartti nollaa ääniaktiivisuutta.
    // ==========================
    db.run(`
        CREATE TABLE IF NOT EXISTS active_voice_sessions (
            guildId TEXT NOT NULL,
            userId TEXT NOT NULL,
            joinedAt INTEGER NOT NULL,
            PRIMARY KEY (guildId, userId)
        )
    `);

    // ==========================
    // Komentojen käyttö
    // ==========================
    db.run(`
        CREATE TABLE IF NOT EXISTS command_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guildId TEXT NOT NULL,
            userId TEXT NOT NULL,
            command TEXT NOT NULL,
            timestamp INTEGER NOT NULL
        )
    `);

    // ==========================
    // Varoitukset
    // ==========================
    db.run(`
        CREATE TABLE IF NOT EXISTS warnings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guildId TEXT NOT NULL,
            userId TEXT NOT NULL,
            reason TEXT NOT NULL,
            moderatorId TEXT NOT NULL,
            timestamp INTEGER NOT NULL
        )
    `);

    // ==========================
    // Palvelinkohtaiset asetukset
    // (mm. minne automaattiset tuomiot/rankingit postataan)
    // ==========================
    db.run(`
        CREATE TABLE IF NOT EXISTS guild_settings (
            guildId TEXT PRIMARY KEY,
            announceChannelId TEXT,
            lastDigestDate TEXT
        )
    `);

    // ==========================
    // Epäiltyjen lista (pysyvä, ei koskaan tyhjennetä —
    // "poisto" vain merkitsee rivin passiiviseksi)
    // ==========================
    db.run(`
        CREATE TABLE IF NOT EXISTS suspects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guildId TEXT NOT NULL,
            userId TEXT NOT NULL,
            reason TEXT NOT NULL,
            addedBy TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            active INTEGER NOT NULL DEFAULT 1
        )
    `);

    // ==========================
    // Tutkinnat (avoin case-tyylinen järjestelmä)
    // ==========================
    db.run(`
        CREATE TABLE IF NOT EXISTS investigations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guildId TEXT NOT NULL,
            userId TEXT NOT NULL,
            title TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'open',
            openedBy TEXT NOT NULL,
            openedAt INTEGER NOT NULL,
            closedAt INTEGER,
            verdict TEXT
        )
    `);

    // ==========================
    // Tutkintojen todisteet (liittyy investigations.id:hen)
    // ==========================
    db.run(`
        CREATE TABLE IF NOT EXISTS investigation_evidence (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            investigationId INTEGER NOT NULL,
            addedBy TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp INTEGER NOT NULL
        )
    `);

    // ==========================
    // Syyllisyysloki — APPEND-ONLY.
    // Nykyinen syyllisyysprosentti lasketaan aina SUMmaamalla
    // tämä taulu, ei koskaan päivitetä yhtä "nykytila"-riviä.
    // Näin koko historia pysyy jäljitettävissä.
    // ==========================
    db.run(`
        CREATE TABLE IF NOT EXISTS guilt_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guildId TEXT NOT NULL,
            userId TEXT NOT NULL,
            delta INTEGER NOT NULL,
            syy TEXT NOT NULL,
            timestamp INTEGER NOT NULL
        )
    `);

    // ==========================
    // Syyllisyysäänestykset
    // ==========================
    db.run(`
        CREATE TABLE IF NOT EXISTS votes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guildId TEXT NOT NULL,
            targetUserId TEXT NOT NULL,
            startedBy TEXT NOT NULL,
            question TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'open',
            startedAt INTEGER NOT NULL,
            endsAt INTEGER NOT NULL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS vote_ballots (
            voteId INTEGER NOT NULL,
            userId TEXT NOT NULL,
            choice TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            PRIMARY KEY (voteId, userId)
        )
    `);

    // ==========================
    // Kaikkien tuomioiden pysyvä historia
    // (sekä manuaaliset /tuomio, /komitea että automaattiset)
    // ==========================
    db.run(`
        CREATE TABLE IF NOT EXISTS verdicts_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guildId TEXT NOT NULL,
            userId TEXT NOT NULL,
            verdict TEXT NOT NULL,
            source TEXT NOT NULL,
            automated INTEGER NOT NULL DEFAULT 0,
            timestamp INTEGER NOT NULL
        )
    `);

});

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve(this);
            }
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

module.exports = {
    db,
    run,
    get,
    all
};