const { db,stmt,day,DAY }=require("../community");
const profile=require("./profile");
const { ledger }=require("./economy");

const weekStart = n => n-(n+3)%7;

async function rank(guild,period) {
    if (period==="kaikki") return db.all(`SELECT user,rating,wins,losses,streak,best FROM cards_players
        WHERE guild=? AND wins+losses>0 ORDER BY rating DESC,wins DESC,user LIMIT 10`,[guild]);
    const date=new Date();
    const since=period==="viikko"?weekStart(day())*DAY:Date.UTC(date.getUTCFullYear(),period==="kausi"?Math.floor(date.getUTCMonth()/3)*3:date.getUTCMonth(),1);
    return db.all(`WITH matches AS (
        SELECT winner AS user,1 AS win,0 AS loss,json_extract(data,'$.eloGain') AS change
            FROM cards_battles WHERE guild=? AND ranked=1 AND ended>=?
        UNION ALL
        SELECT CASE winner WHEN p1 THEN p2 ELSE p1 END,0,1,-json_extract(data,'$.eloGain')
            FROM cards_battles WHERE guild=? AND ranked=1 AND ended>=?
    ) SELECT user,sum(win) AS wins,sum(loss) AS losses,1000+sum(change) AS rating
        FROM matches GROUP BY user ORDER BY rating DESC,wins DESC,user LIMIT 10`,[guild,since,guild,since]);
}

async function tasks(guild,user,claim=false) {
    const p=await profile.get(guild,user);
    const today=day(),week=weekStart(today);
    const result=await db.batch([
        stmt(`SELECT sum(CASE WHEN created>=? AND reason='Taisteluvoitto' THEN 1 ELSE 0 END) AS wins,
            sum(CASE WHEN reason IN ('Taisteluvoitto','Taisteluun osallistuminen') THEN 1 ELSE 0 END) AS matches,
            sum(CASE WHEN reason='Pomotaistelu' THEN 1 ELSE 0 END) AS boss,
            sum(CASE WHEN created>=? AND reason='Pakka avattu' THEN 1 ELSE 0 END) AS packs,
            sum(xp) AS xp FROM cards_ledger WHERE guild=? AND user=? AND created>=?`,today*DAY,today*DAY,guild,user,week*DAY),
        stmt(`SELECT sum(CASE WHEN ended>=? THEN milliseconds ELSE 0 END) AS ms,
            count(DISTINCT artist) AS artists FROM music_listens WHERE guild=? AND user=? AND ended>=?`,
        today*DAY,guild,user,week*DAY),
        stmt(`SELECT count(*) AS total FROM voice_stats AS v WHERE v.guildId=? AND v.userId=? AND v.date>=? AND v.seconds>=600
            AND EXISTS (SELECT 1 FROM music_listens AS m WHERE m.guild=v.guildId AND m.user=v.userId AND m.ended>=?
                AND date(m.ended/1000,'unixepoch')=v.date AND m.milliseconds>=120000
                AND EXISTS (SELECT 1 FROM music_listens AS peer WHERE peer.guild=m.guild AND peer.play=m.play
                    AND peer.user<>m.user AND peer.milliseconds>=120000))`,
            guild,user,new Date(week*DAY).toISOString().slice(0,10),week*DAY),
        stmt("SELECT event FROM cards_ledger WHERE guild=? AND user=? AND event LIKE 'task:%' AND created>=?",guild,user,week*DAY)
    ]);
    const [game={},music={},activity={}]=result.slice(0,3).map(r=>r.results?.[0]);
    const claimed=new Set(result[3].results?.map(r=>r.event));
    const list=[
        ["win","Voita päivän sijoitusottelu",game.wins,1,20,today],
        ["pack","Avaa tänään korttipakka",game.packs,1,10,today],
        ["music","Kuuntele tänään musiikkia 10 minuuttia",Math.floor((music.ms??0)/60_000),10,15,today],
        ["duel","Osallistu viikon aikana kolmeen sijoitusotteluun",game.matches,3,35,week],
        ["boss","Osallistu tällä viikolla pomon kukistamiseen",game.boss,1,45,week],
        ["artist","Kuuntele tällä viikolla kolmea artistia",music.artists,3,30,week],
        ["activity","Vietä äänikanavalla 10 min ja kuuntele yhdessä kolmena päivänä",activity.total,3,25,week],
        ["achievement1","Saavutus · Saavuta taso 10",p.stats.level,10,80,0],
        ["achievement2","Saavutus · Voita 10 sijoitusottelua",p.wins,10,100,0]
    ].map(([key,name,value,goal,coins,period])=>({key:`task:${key}:${period}`,name,value:Number(value)||0,goal,coins,done:false}));
    // Lifetime achievements may have been claimed before this week.
    const lifetime=await db.all("SELECT event FROM cards_ledger WHERE guild=? AND user=? AND event IN ('task:achievement1:0','task:achievement2:0')",[guild,user]);
    for(const row of lifetime) claimed.add(row.event);
    let awarded=0;
    const eligible=list.filter(t=>t.value>=t.goal&&!claimed.has(t.key));
    if (claim && eligible.length) {
        const results=await db.batch(eligible.map(t=>{
            const q=ledger(guild,user,t.key,"Tehtäväpalkinto",t.coins,20);
            return {...q,query:q.query+" ON CONFLICT(guild,user,event) DO NOTHING RETURNING event"};
        }));
        results.forEach((r,i)=>{
            if(r.results?.length) { awarded+=eligible[i].coins;claimed.add(eligible[i].key); }
        });
    }
    for(const t of list) t.done=claimed.has(t.key);
    return {list,awarded};
}
module.exports={rank,tasks,weekStart};
