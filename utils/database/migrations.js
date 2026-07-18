const migrations = [
    {
        id: 1,
        name: "initial-schema",
        statements: [
            `CREATE TABLE IF NOT EXISTS injuries (id INTEGER PRIMARY KEY AUTOINCREMENT, guildId TEXT NOT NULL, userId TEXT NOT NULL, reason TEXT NOT NULL, reportedBy TEXT NOT NULL, timestamp INTEGER NOT NULL)`,
            `CREATE TABLE IF NOT EXISTS message_stats (guildId TEXT NOT NULL, userId TEXT NOT NULL, date TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (guildId, userId, date))`,
            `CREATE TABLE IF NOT EXISTS voice_stats (guildId TEXT NOT NULL, userId TEXT NOT NULL, date TEXT NOT NULL, seconds INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (guildId, userId, date))`,
            `CREATE TABLE IF NOT EXISTS active_voice_sessions (guildId TEXT NOT NULL, userId TEXT NOT NULL, joinedAt INTEGER NOT NULL, PRIMARY KEY (guildId, userId))`,
            `CREATE TABLE IF NOT EXISTS command_usage (id INTEGER PRIMARY KEY AUTOINCREMENT, guildId TEXT NOT NULL, userId TEXT NOT NULL, command TEXT NOT NULL, timestamp INTEGER NOT NULL)`,
            `CREATE TABLE IF NOT EXISTS warnings (id INTEGER PRIMARY KEY AUTOINCREMENT, guildId TEXT NOT NULL, userId TEXT NOT NULL, reason TEXT NOT NULL, moderatorId TEXT NOT NULL, timestamp INTEGER NOT NULL)`,
            `CREATE TABLE IF NOT EXISTS guild_settings (guildId TEXT PRIMARY KEY, announceChannelId TEXT, lastDigestDate TEXT)`,
            `CREATE TABLE IF NOT EXISTS suspects (id INTEGER PRIMARY KEY AUTOINCREMENT, guildId TEXT NOT NULL, userId TEXT NOT NULL, reason TEXT NOT NULL, addedBy TEXT NOT NULL, timestamp INTEGER NOT NULL, active INTEGER NOT NULL DEFAULT 1)`,
            `CREATE TABLE IF NOT EXISTS investigations (id INTEGER PRIMARY KEY AUTOINCREMENT, guildId TEXT NOT NULL, userId TEXT NOT NULL, title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', openedBy TEXT NOT NULL, openedAt INTEGER NOT NULL, closedAt INTEGER, verdict TEXT)`,
            `CREATE TABLE IF NOT EXISTS investigation_evidence (id INTEGER PRIMARY KEY AUTOINCREMENT, investigationId INTEGER NOT NULL, addedBy TEXT NOT NULL, content TEXT NOT NULL, timestamp INTEGER NOT NULL)`,
            `CREATE TABLE IF NOT EXISTS guilt_log (id INTEGER PRIMARY KEY AUTOINCREMENT, guildId TEXT NOT NULL, userId TEXT NOT NULL, delta INTEGER NOT NULL, syy TEXT NOT NULL, timestamp INTEGER NOT NULL)`,
            `CREATE TABLE IF NOT EXISTS votes (id INTEGER PRIMARY KEY AUTOINCREMENT, guildId TEXT NOT NULL, targetUserId TEXT NOT NULL, startedBy TEXT NOT NULL, question TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', startedAt INTEGER NOT NULL, endsAt INTEGER NOT NULL)`,
            `CREATE TABLE IF NOT EXISTS vote_ballots (voteId INTEGER NOT NULL, userId TEXT NOT NULL, choice TEXT NOT NULL, timestamp INTEGER NOT NULL, PRIMARY KEY (voteId, userId))`,
            `CREATE TABLE IF NOT EXISTS verdicts_log (id INTEGER PRIMARY KEY AUTOINCREMENT, guildId TEXT NOT NULL, userId TEXT NOT NULL, verdict TEXT NOT NULL, source TEXT NOT NULL, automated INTEGER NOT NULL DEFAULT 0, timestamp INTEGER NOT NULL)`,
            `CREATE TABLE IF NOT EXISTS fines (id INTEGER PRIMARY KEY AUTOINCREMENT, guildId TEXT NOT NULL, userId TEXT NOT NULL, amount INTEGER NOT NULL, unit TEXT NOT NULL, reason TEXT NOT NULL, issuedBy TEXT NOT NULL, timestamp INTEGER NOT NULL)`
        ]
    },
    {
        id: 2,
        name: "lookup-indexes",
        statements: [
            `CREATE INDEX IF NOT EXISTS idx_command_usage_guild_user_time ON command_usage (guildId, userId, timestamp)`,
            `CREATE INDEX IF NOT EXISTS idx_fines_guild_user_time ON fines (guildId, userId, timestamp)`,
            `CREATE INDEX IF NOT EXISTS idx_investigations_guild_user_status ON investigations (guildId, userId, status)`,
            `CREATE INDEX IF NOT EXISTS idx_warnings_guild_user_time ON warnings (guildId, userId, timestamp)`,
            `CREATE INDEX IF NOT EXISTS idx_suspects_guild_user_active ON suspects (guildId, userId, active)`,
            `CREATE INDEX IF NOT EXISTS idx_guilt_log_guild_user_time ON guilt_log (guildId, userId, timestamp)`,
            `CREATE INDEX IF NOT EXISTS idx_verdicts_guild_user_time ON verdicts_log (guildId, userId, timestamp)`
        ]
    }
];

function applyMigrations(db) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS schema_migrations (id INTEGER PRIMARY KEY, name TEXT NOT NULL, appliedAt INTEGER NOT NULL)`, error => {
                if (error) return reject(error);
            });

            for (const migration of migrations) {
                for (const statement of migration.statements) {
                    db.run(statement, error => {
                        if (error) console.error(`Database migration ${migration.id} failed:`, error);
                    });
                }

                db.run(
                    `INSERT OR IGNORE INTO schema_migrations (id, name, appliedAt) VALUES (?, ?, ?)`,
                    [migration.id, migration.name, Date.now()]
                );
            }

            db.get(`SELECT COUNT(*) AS count FROM schema_migrations`, (error, row) => {
                if (error) return reject(error);
                resolve(row.count);
            });
        });
    });
}

module.exports = { applyMigrations, migrations };
