CREATE TABLE IF NOT EXISTS komitea_panels (
    guild TEXT NOT NULL, kind TEXT NOT NULL, channel TEXT NOT NULL, message TEXT NOT NULL,
    PRIMARY KEY (guild, kind)
);
CREATE TABLE IF NOT EXISTS music_favorites (
    guild TEXT NOT NULL, user TEXT NOT NULL, url TEXT NOT NULL, track TEXT NOT NULL, created INTEGER NOT NULL,
    PRIMARY KEY (guild, user, url)
);
CREATE TABLE IF NOT EXISTS music_playlists (
    id TEXT PRIMARY KEY, guild TEXT NOT NULL, owner TEXT NOT NULL, name TEXT NOT NULL,
    shared INTEGER NOT NULL DEFAULT 0 CHECK(shared IN (0,1)), tracks TEXT NOT NULL DEFAULT '[]',
    UNIQUE(guild, owner, name)
);
CREATE INDEX IF NOT EXISTS music_lists_guild ON music_playlists(guild, shared, owner);
CREATE TABLE IF NOT EXISTS music_settings (
    guild TEXT PRIMARY KEY, autoplay INTEGER NOT NULL DEFAULT 0, fair INTEGER NOT NULL DEFAULT 0, dj TEXT
);
CREATE TABLE IF NOT EXISTS music_listens (
    guild TEXT NOT NULL, user TEXT NOT NULL, play TEXT NOT NULL, url TEXT NOT NULL, title TEXT NOT NULL,
    artist TEXT, source TEXT NOT NULL, track TEXT NOT NULL, milliseconds INTEGER NOT NULL CHECK(milliseconds > 0),
    session TEXT NOT NULL, ended INTEGER NOT NULL, PRIMARY KEY(guild,user,play)
);
CREATE INDEX IF NOT EXISTS music_listens_guild_date ON music_listens(guild,ended);
CREATE INDEX IF NOT EXISTS music_listens_play ON music_listens(guild,play);
CREATE INDEX IF NOT EXISTS music_listens_user_date ON music_listens(guild,user,ended);
CREATE TABLE IF NOT EXISTS music_activity (
    guild TEXT NOT NULL, user TEXT NOT NULL, day INTEGER NOT NULL, queued INTEGER NOT NULL DEFAULT 0,
    skipped INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(guild,user,day)
);

CREATE TABLE IF NOT EXISTS cards_players (
    guild TEXT NOT NULL, user TEXT NOT NULL, card TEXT NOT NULL, coins INTEGER NOT NULL DEFAULT 0 CHECK(coins >= 0),
    xp INTEGER NOT NULL DEFAULT 0 CHECK(xp >= 0), rating INTEGER NOT NULL DEFAULT 1000,
    wins INTEGER NOT NULL DEFAULT 0, losses INTEGER NOT NULL DEFAULT 0,
    streak INTEGER NOT NULL DEFAULT 0, best INTEGER NOT NULL DEFAULT 0, equipped TEXT,
    PRIMARY KEY(guild,user)
);
CREATE INDEX IF NOT EXISTS cards_rank ON cards_players(guild,rating DESC);
CREATE TABLE IF NOT EXISTS cards_inventory (
    guild TEXT NOT NULL, user TEXT NOT NULL, item TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity >= 0),
    PRIMARY KEY(guild,user,item), FOREIGN KEY(guild,user) REFERENCES cards_players(guild,user)
);
CREATE TABLE IF NOT EXISTS cards_ledger (
    guild TEXT NOT NULL, user TEXT NOT NULL, event TEXT NOT NULL, reason TEXT NOT NULL, created INTEGER NOT NULL,
    delta INTEGER NOT NULL, xp INTEGER NOT NULL DEFAULT 0, item TEXT,
    quantity INTEGER NOT NULL DEFAULT 0, effect TEXT, PRIMARY KEY(guild,user,event),
    FOREIGN KEY(guild,user) REFERENCES cards_players(guild,user)
);
CREATE INDEX IF NOT EXISTS cards_ledger_date ON cards_ledger(guild,user,created DESC);
CREATE TRIGGER IF NOT EXISTS cards_apply_ledger AFTER INSERT ON cards_ledger BEGIN
    UPDATE cards_players SET coins=coins+NEW.delta,xp=xp+NEW.xp,
        equipped=CASE WHEN NEW.effect IS NULL THEN equipped WHEN NEW.effect='' THEN NULL ELSE NEW.effect END
        WHERE guild=NEW.guild AND user=NEW.user;
    INSERT INTO cards_inventory(guild,user,item,quantity)
        SELECT NEW.guild,NEW.user,NEW.item,0 WHERE NEW.item IS NOT NULL
        ON CONFLICT(guild,user,item) DO NOTHING;
    UPDATE cards_inventory SET quantity=quantity+NEW.quantity
        WHERE guild=NEW.guild AND user=NEW.user AND item=NEW.item;
END;
CREATE TABLE IF NOT EXISTS cards_collection (
    id TEXT PRIMARY KEY, guild TEXT NOT NULL, owner TEXT NOT NULL, subject TEXT NOT NULL,
    rarity INTEGER NOT NULL CHECK(rarity BETWEEN 0 AND 5), style TEXT NOT NULL, created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS cards_collection_owner ON cards_collection(guild,owner,rarity);
CREATE TABLE IF NOT EXISTS cards_trades (
    id TEXT PRIMARY KEY, guild TEXT NOT NULL, sender TEXT NOT NULL, recipient TEXT NOT NULL,
    offered TEXT NOT NULL, requested TEXT NOT NULL, state TEXT NOT NULL, expires INTEGER NOT NULL
);
CREATE TRIGGER IF NOT EXISTS cards_apply_trade AFTER UPDATE OF state ON cards_trades
WHEN OLD.state='pending' AND NEW.state='accepted' BEGIN
    UPDATE cards_collection SET owner=NEW.recipient WHERE id=NEW.offered AND guild=NEW.guild AND owner=NEW.sender;
    SELECT CASE WHEN changes()<>1 THEN RAISE(ABORT,'trade ownership changed') END;
    UPDATE cards_collection SET owner=NEW.sender WHERE id=NEW.requested AND guild=NEW.guild AND owner=NEW.recipient;
    SELECT CASE WHEN changes()<>1 THEN RAISE(ABORT,'trade ownership changed') END;
END;
CREATE TABLE IF NOT EXISTS cards_battles (
    id TEXT PRIMARY KEY, guild TEXT NOT NULL, p1 TEXT NOT NULL, p2 TEXT NOT NULL,
    pair TEXT NOT NULL, state TEXT NOT NULL, data TEXT NOT NULL, rev INTEGER NOT NULL DEFAULT 0,
    expires INTEGER NOT NULL, ended INTEGER, winner TEXT, ranked INTEGER NOT NULL DEFAULT 0,
    tournament TEXT, channel TEXT, message TEXT
);
CREATE INDEX IF NOT EXISTS cards_match_expiry ON cards_battles(state,expires);
CREATE INDEX IF NOT EXISTS cards_match_pair ON cards_battles(guild,pair,ended DESC);
CREATE INDEX IF NOT EXISTS cards_match_guild ON cards_battles(guild,ended DESC);
CREATE TABLE IF NOT EXISTS cards_duel_locks (
    guild TEXT NOT NULL, user TEXT NOT NULL, battle TEXT NOT NULL, PRIMARY KEY(guild,user)
);
CREATE TRIGGER IF NOT EXISTS cards_release_duel AFTER UPDATE OF state ON cards_battles
WHEN NEW.state NOT IN ('pending','playing') BEGIN
    DELETE FROM cards_duel_locks WHERE battle=NEW.id;
END;
CREATE TABLE IF NOT EXISTS cards_bosses (
    id TEXT PRIMARY KEY, guild TEXT NOT NULL, day INTEGER NOT NULL, type INTEGER NOT NULL,
    hp INTEGER NOT NULL CHECK(hp>=0), state TEXT NOT NULL, rev INTEGER NOT NULL DEFAULT 0,
    UNIQUE(guild,day)
);
CREATE TABLE IF NOT EXISTS cards_boss_hits (
    boss TEXT NOT NULL, user TEXT NOT NULL, round INTEGER NOT NULL, damage INTEGER NOT NULL, retaliation INTEGER NOT NULL,
    PRIMARY KEY(boss,user,round), FOREIGN KEY(boss) REFERENCES cards_bosses(id)
);
CREATE INDEX IF NOT EXISTS cards_boss_hits_user ON cards_boss_hits(user,boss);
CREATE TABLE IF NOT EXISTS cards_cups (
    id TEXT PRIMARY KEY, guild TEXT NOT NULL, day INTEGER NOT NULL, host TEXT NOT NULL, state TEXT NOT NULL,
    rev INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL, UNIQUE(guild,day)
);

CREATE TRIGGER IF NOT EXISTS cards_apply_battle_result AFTER UPDATE OF state ON cards_battles
WHEN OLD.state='playing' AND NEW.state='finished' AND NEW.ranked=1 AND NEW.winner IS NOT NULL BEGIN
    UPDATE cards_players SET rating=max(100,rating+json_extract(NEW.data,'$.eloGain')),
        wins=wins+1,streak=streak+1,best=max(best,streak+1)
        WHERE guild=NEW.guild AND user=NEW.winner;
    UPDATE cards_players SET rating=max(100,rating-json_extract(NEW.data,'$.eloGain')),
        losses=losses+1,streak=0
        WHERE guild=NEW.guild AND user=CASE NEW.winner WHEN NEW.p1 THEN NEW.p2 ELSE NEW.p1 END;
    INSERT INTO cards_ledger(guild,user,event,reason,created,delta,xp)
        VALUES(NEW.guild,NEW.winner,'battle:'||NEW.id,'Taisteluvoitto',NEW.ended,25,60),
              (NEW.guild,CASE NEW.winner WHEN NEW.p1 THEN NEW.p2 ELSE NEW.p1 END,
               'battle:'||NEW.id,'Taisteluun osallistuminen',NEW.ended,8,25);
END;
CREATE TRIGGER IF NOT EXISTS cards_boss_rewards AFTER UPDATE OF state ON cards_bosses
WHEN OLD.state='active' AND NEW.state='finished' BEGIN
    INSERT INTO cards_ledger(guild,user,event,reason,created,delta,xp)
        SELECT NEW.guild,user,'boss:'||NEW.id,'Pomotaistelu',max(round),
            min(70,15+sum(damage)/3), min(160,30+sum(damage))
        FROM cards_boss_hits WHERE boss=NEW.id GROUP BY user HAVING sum(damage)>=10;
END;
