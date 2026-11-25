const { randomUUID } = require("node:crypto");
const store = require("./store");

const ignored = () => {};
const modes = new Map();

async function load(guild) {
    let entry = modes.get(guild);
    if (!entry || entry.until < Date.now()) {
        entry = { until: Date.now()+60_000, value: store.settings(guild).catch(() => null) };
        if (modes.size >= 256) modes.delete(modes.keys().next().value);
        modes.set(guild, entry);
    }
    return entry.value;
}

function invalidate(guild) { modes.delete(guild); }

function attach(s, guild) {
    if (!guild || typeof guild !== "object") return;
    const voices = new Map();
    const recent = new Set();
    let play;
    let autoplaying = false;
    let lastTrack;
    s.musiikkiAsetukset ??= {};
    function listeners() {
        const members = guild.channels?.cache?.get(s.kanavaId)?.members;
        if (!members?.values) return [];
        return [...members.values()].filter(m => !m.user?.bot && !m.voice?.selfDeaf && !m.voice?.serverDeaf);
    }
    function sample() {
        if (!play) return;
        const now = s.resurssi?.playbackDuration ?? play.position;
        const ms = Math.max(0, now - play.position);
        play.position = now;
        if (!ms) return;
        for (const [user,session] of play.listeners) {
            const value = play.heard.get(user) ?? { ms: 0, session };
            value.ms += ms;
            play.heard.set(user,value);
        }
    }
    function update() {
        sample();
        const users = listeners();
        for (const id of voices.keys()) if (!users.some(m => m.id === id)) voices.delete(id);
        for (const member of users) if (!voices.has(member.id)) voices.set(member.id,randomUUID());
        if (play) play.listeners = new Map(voices);
    }
    s.musiikkiKuuntelijat = update;
    s.musiikkiToistoAlkoi = song => {
        update();
        play = { song, id: randomUUID(), position: 0, listeners: new Map(voices), heard: new Map() };
        lastTrack = song;
        if (song.url) {
            recent.add(song.url);
            if (recent.size > 50) recent.delete(recent.values().next().value);
        }
    };
    s.musiikkiToistoLoppui = () => {
        if (!play) return;
        sample();
        const { id, song, heard } = play;
        play = null;
        if (heard.size) void store.listening(s.guildId,id,song,heard).catch(ignored);
    };
    s.musiikkiAuto = async () => {
        if (!s.musiikkiAsetukset.autoplay || !lastTrack?.artisti || autoplaying || s.lopetettu || !listeners().length) return;
        autoplaying = true;
        try {
            const { haeKappaleet } = require("../lahteet");
            const normalize = v => String(v ?? "").normalize("NFKC").trim().toLowerCase();
            const previous = lastTrack;
            const generation = s.sarja;
            const artist = normalize(previous.artisti);
            const result = await haeKappaleet(previous.artisti,{ asetukset:s.asetukset,hakulahde:previous.hakulahde });
            const song = result.kappaleet.find(k => normalize(k.lahde) === normalize(previous.lahde) && normalize(k.artisti) === artist && k.url && !recent.has(k.url) &&
                normalize(k.otsikko) !== normalize(previous.otsikko));
            if (song && s.sarja===generation && !s.lopetettu && s.musiikkiAsetukset.autoplay && !s.nyt && !s.jono.length && listeners().length) {
                s.lisaa([{ ...song, pyytaja: null }]);
            }
        } catch { /* Jonon tyhjeneminen on normaalia. */ }
        finally { autoplaying = false; }
    };
}
module.exports = { attach, load, invalidate };
