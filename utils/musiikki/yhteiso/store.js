const { randomUUID } = require("node:crypto");
const { db, stmt, day, DAY, Notice } = require("../../community");

function track(k) {
    try {
        const url = new URL(k.url);
        if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.href.length>2048 ||
            url.searchParams.has("secret_token") || /\/s-[^/]+\/?$/.test(url.pathname)) return null;
        url.hash = "";
        return { url: url.href, otsikko: k.otsikko, artisti: k.artisti ?? null, lahde: k.lahde,
            hakulahde: k.hakulahde, kesto: k.kesto ?? null, kuva: k.kuva ?? null };
    } catch { return null; }
}

function favorites(guild, user, offset = 0, limit = 100) {
    return db.all("SELECT track FROM music_favorites WHERE guild=? AND user=? ORDER BY created DESC,url LIMIT ? OFFSET ?",
        [guild,user,limit,offset]);
}

async function favorite(guild, user, song) {
    const k = track(song);
    if (!k) throw new Notice("Tätä kappaletta ei voi tallentaa suosikiksi.");
    const result = await db.batch([
        stmt(`DELETE FROM music_favorites WHERE guild=? AND user=? AND url=? AND EXISTS
             (SELECT 1 FROM music_favorites WHERE guild=? AND user=? AND url=?) RETURNING url`,guild,user,k.url,guild,user,k.url),
        stmt(`INSERT INTO music_favorites(guild,user,url,track,created) SELECT ?,?,?,?,?
            WHERE changes()=0 AND (SELECT count(*) FROM music_favorites WHERE guild=? AND user=?)<100 RETURNING url`,
        guild,user,k.url,JSON.stringify(k),Date.now(),guild,user)
    ]);
    if (result[0]?.results?.length) return false;
    if (!result[1]?.results?.length) throw new Notice("Suosikkilista on täynnä (100 kappaletta).");
    return true;
}

function history(guild,user,offset = 0) {
    return db.all(`SELECT track,max(ended) AS last,count(*) AS plays,sum(milliseconds) AS milliseconds
        FROM music_listens WHERE guild=? AND user=? GROUP BY url ORDER BY last DESC LIMIT 11 OFFSET ?`,[guild,user,offset]);
}

async function addPlaylist(guild,owner,name,shared,tracks = []) {
    const id = randomUUID().slice(0, 8);
    const result = await db.run(`INSERT INTO music_playlists(id,guild,owner,name,shared,tracks)
        SELECT ?,?,?,?,?,? WHERE (SELECT count(*) FROM music_playlists WHERE guild=? AND owner=?)<25
        ON CONFLICT DO NOTHING`,[id,guild,owner,name,shared?1:0,JSON.stringify(tracks.map(k=>track(k) ?? (!k.url && k.lahde==="Spotify" ? {
            url:null,otsikko:k.otsikko,artisti:k.artisti,lahde:k.lahde,hakulahde:k.hakulahde,kesto:null
        } : null)).filter(Boolean).slice(0,100)),guild,owner]);
    if (!result.changes) throw new Notice("Listan nimi on käytössä tai 25 listan raja täyttyi.");
    return id;
}

const playlists = (guild,user,offset=0) => db.all(`SELECT id,name,owner,shared,json_array_length(tracks) AS total
    FROM music_playlists WHERE guild=? AND (owner=? OR shared=1) ORDER BY name,id LIMIT 11 OFFSET ?`,[guild,user,offset]);
const playlist = (guild,user,id) => db.get(`SELECT * FROM music_playlists WHERE id=? AND guild=? AND (owner=? OR shared=1)`,[id,guild,user]);

async function editPlaylist(guild,user,id,action,value) {
    const args = [id,guild,user];
    const updates = {
        nimi: ["name=?", [value]],
        jako: ["shared=1-shared", []],
        lisaa: ["tracks=json_insert(tracks,'$[#]',json(?))", [JSON.stringify(value)]],
        poista: ["tracks=json_remove(tracks,?)", [`$[${value}]`]]
    };
    const [sql, params] = updates[action];
    const extra = action === "lisaa" ? " AND json_array_length(tracks)<100" : action === "poista" ? " AND json_array_length(tracks)>?" : "";
    let result;
    try {
        result = await db.run(`UPDATE music_playlists SET ${sql} WHERE id=? AND guild=? AND owner=?${extra}`,
            [...params,...args,...(action === "poista" ? [value] : [])]);
    } catch (err) {
        if (action === "nimi" && /unique/i.test(err.message)) throw new Notice("Listan nimi on jo käytössä.");
        throw err;
    }
    if (!result.changes) throw new Notice("Tarkista listan omistus, kappaleen numero ja listan koko.");
}

function listening(guild, play, song, heard) {
    const k = track(song);
    if (!k) return Promise.resolve();
    const now = Date.now();
    const queries = [...heard].filter(([,v]) => v.ms > 0).map(([user,v]) => stmt(`INSERT OR IGNORE INTO music_listens
        (guild,user,play,url,title,artist,source,track,milliseconds,session,ended) VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
    guild,user,play,k.url,k.otsikko,k.artisti,k.lahde,JSON.stringify(k),v.ms,v.session,now));
    return queries.reduce((previous, _, index) => index % 50 ? previous : previous.then(() => db.batch(queries.slice(index,index+50))),Promise.resolve());
}

function activity(guild,user,queued,skipped) {
    if (!user) return Promise.resolve();
    return db.run(`INSERT INTO music_activity(guild,user,day,queued,skipped) VALUES(?,?,?,?,?)
        ON CONFLICT(guild,user,day) DO UPDATE SET queued=queued+excluded.queued,skipped=skipped+excluded.skipped`,
    [guild,user,day(),queued,skipped]);
}

function settings(guild) {
    return db.get(`SELECT s.autoplay,s.fair,s.dj,p.message AS persistentPanel FROM (SELECT ? AS guild) g
        LEFT JOIN music_settings s ON s.guild=g.guild
        LEFT JOIN komitea_panels p ON p.guild=g.guild AND p.kind='music'`,[guild],AbortSignal.timeout(2500));
}

function setSetting(guild,key,value) {
    if (!["autoplay","fair","dj"].includes(key)) throw new Notice("Tuntematon asetus.");
    return db.run(`INSERT INTO music_settings(guild,${key}) VALUES(?,?)
        ON CONFLICT(guild) DO UPDATE SET ${key}=excluded.${key}`,[guild,value]);
}

async function wrapped(guild,user,period) {
    const now = new Date();
    const dates = { viikko: Date.now()-7*DAY, kuukausi: Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1),
        vuosi: Date.UTC(now.getUTCFullYear(),0,1), kaikki: 0 };
    const since = dates[period] ?? 0;
    const where = "guild=? AND ended>=?" + (user ? " AND user=?" : "");
    const params = [guild,since,...(user ? [user] : [])];
    const result = await db.batch([
        stmt(`SELECT coalesce(sum(milliseconds),0) AS ms,${user ? "count(*)" : "count(DISTINCT play)"} AS plays,count(DISTINCT artist) AS artists FROM music_listens WHERE ${where}`,...params),
        ...["artist","title","source","user"].map(col => stmt(`SELECT ${col} AS name,sum(milliseconds) AS ms,count(*) AS plays
            FROM music_listens WHERE ${where} AND ${col} IS NOT NULL GROUP BY ${col} ORDER BY ms DESC,name LIMIT 5`,...params)),
        stmt(`SELECT max(total) AS ms FROM (SELECT sum(milliseconds) AS total FROM music_listens WHERE ${where} GROUP BY user,session)`,...params),
        stmt(`SELECT sum(queued) AS queued,sum(skipped) AS skipped FROM music_activity WHERE guild=? AND day>=?${user ? " AND user=?" : ""}`,
        guild,day(since),...(user ? [user] : []))
    ]);
    return result.map(r => r.results ?? []);
}

module.exports = { track, favorites, favorite, history, addPlaylist, playlists, playlist, editPlaylist, listening, activity, settings, setSetting, wrapped };
