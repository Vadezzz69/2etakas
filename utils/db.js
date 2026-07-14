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