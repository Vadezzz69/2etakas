CREATE TABLE IF NOT EXISTS osu_daily_challenges (
    guild TEXT NOT NULL,
    day TEXT NOT NULL,
    beatmap TEXT NOT NULL,
    PRIMARY KEY (guild, day)
);
