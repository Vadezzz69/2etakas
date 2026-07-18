const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { createQueryHelpers } = require("./database/helpers");
const { applyMigrations } = require("./database/migrations");

const db = new sqlite3.Database(path.join(process.cwd(), "database.sqlite"), error => {
    if (error) {
        console.error("❌ Tietokannan avaus epäonnistui:", error);
    } else {
        console.log("✅ SQLite-tietokanta yhdistetty.");
    }
});

// Migrations use only CREATE/INDEX statements and INSERT OR IGNORE metadata;
// they never drop, rename, or rewrite existing tables or rows.
const ready = applyMigrations(db).catch(error => {
    console.error("❌ Tietokantamigraatio epäonnistui:", error);
    throw error;
});

const { run, get, all } = createQueryHelpers(db);

module.exports = { db, ready, run, get, all };
