const { randomUUID }=require("node:crypto");
const { db,stmt,Notice,DAY }=require("../community");
const profiles=require("./profile");
const combat=require("./combat");
const { ledger }=require("./economy");
const TTL=180_000;
const column="guild=? AND id=?";

async function expire(guild=null) {
    await db.run(`UPDATE cards_battles SET state='expired',rev=rev+1 WHERE state IN ('pending','playing')
        AND expires<=?${guild?" AND guild=?":""}`,[Date.now(),...(guild?[guild]:[])]);
}

async function create(guild,left,right,slot=null) {
    if(left.id===right.id || left.bot || right.bot) throw new Notice("Valitse toinen oikea pelaaja.");
    await expire(guild);
    const [a,b]=await Promise.all([profiles.get(guild,left.id),profiles.get(guild,right.id)]);
    const combatant=(user,profile)=>combat.fighter(user.id,profile,user.displayAvatarURL?.({extension:"png",size:128}));
    const record = { id:randomUUID().slice(0,12),guild,p1:left.id,p2:right.id,
        pair:[left.id,right.id].sort().join(":"),state:"pending",rev:0,expires:Date.now()+TTL,tournament:slot?.cup.id ?? null,
        data:JSON.stringify({ players:[combatant(left,a),combatant(right,b)],events:[] }) };
    try {
        const insert = slot ? "SELECT ?,?,?,?,?,?,?,?,? WHERE changes()=1" : "VALUES(?,?,?,?,?,?,?,?,?)";
        const locks = slot ? "SELECT ?,?,? WHERE changes()=1 UNION ALL SELECT ?,?,? WHERE changes()=1" : "VALUES(?,?,?),(?,?,?)";
        const result = await db.batch([
            ...(slot ? [stmt(`UPDATE cards_cups SET data=json_set(data,?,?),rev=rev+1
                WHERE guild=? AND id=? AND state='playing' AND rev=? AND json_extract(data,?) IS NULL RETURNING id`,
                `$.rounds[${slot.index}].battle`,record.id,guild,slot.cup.id,slot.cup.rev,`$.rounds[${slot.index}].battle`)] : []),
            stmt(`INSERT INTO cards_battles(id,guild,p1,p2,pair,state,data,expires,tournament) ${insert}`,
                record.id,guild,left.id,right.id,record.pair,"pending",record.data,record.expires,record.tournament),
            stmt(`INSERT INTO cards_duel_locks(guild,user,battle) ${locks}`,
                guild,left.id,record.id,guild,right.id,record.id)
        ]);
        if (slot && !result[0]?.results?.length) throw new Notice("Turnaus muuttui. Päivitä näkymä.");
    } catch(err) {
        if (/unique constraint/i.test(err.message)) throw new Notice("Jompikumpi pelaajista on jo taistelussa tai annetussa haasteessa.");
        throw err;
    }
    return record;
}

const get=(guild,id)=>db.get(`SELECT * FROM cards_battles WHERE ${column}`,[guild,id]);

async function move(guild,id,user,rev,action,rng) {
    const record=await get(guild,id);
    if(!record || record.rev!==rev || record.expires<=Date.now()) throw new Notice("Vuoro tai haaste ehti vanhentua.");
    let data=JSON.parse(record.data);
    let state=record.state;
    let ranked=0;
    let pay;
    if (state==="pending") {
        if(user!==record.p2 && !(action==="decline" && user===record.p1)) throw new Notice("Vain haastettu voi hyväksyä haasteen.");
        if(action==="accept") { state="playing";data=combat.start(data.players); }
        else if(action==="decline") state="declined";
        else throw new Notice("Haaste odottaa hyväksyntää.");
    } else if(state==="playing") {
        if(!data.players.some(p=>p.user===user)) throw new Notice("Taistelu kuuluu ottelun pelaajille.");
        if(action==="retreat" && data.players[data.turn].user!==user) data.turn=1-data.turn;
        if(data.players[data.turn].user!==user) throw new Notice("Odota omaa vuoroasi.");
        try { data=combat.move(data,action,rng); }
        catch (err){ throw new Notice(err.message); }
        if(data.healed) pay=ledger(guild,user,`heal:${id}:${rev}`,"Ensiapu taistelussa",0,0,"laastari",-1);
        if(data.winner || data.draw) {
            state="finished";
            if(data.winner && data.step>=6 && data.players.every(p=>p.damageDone>0)) {
                const recent=await db.get(`SELECT
                    sum(CASE WHEN pair=? THEN 1 ELSE 0 END) AS samePair,
                    sum(CASE WHEN p1=? OR p2=? THEN 1 ELSE 0 END) AS leftMatches,
                    sum(CASE WHEN p1=? OR p2=? THEN 1 ELSE 0 END) AS rightMatches
                    FROM cards_battles WHERE guild=? AND ranked=1 AND ended>?`,
                [record.pair,record.p1,record.p1,record.p2,record.p2,guild,Date.now()-DAY]);
                ranked=(!recent?.samePair && (recent?.leftMatches??0)<8 && (recent?.rightMatches??0)<8)?1:0;
            }
        }
    } else throw new Notice("Taistelu on päättynyt.");

    const now=Date.now();
    const update=stmt(`UPDATE cards_battles SET state=?,data=?,rev=rev+1,expires=?,ended=?,winner=?,ranked=?
        WHERE ${column} AND rev=? AND expires>? RETURNING *`,
    state,JSON.stringify(data),now+TTL,state==="finished"?now:null,data.winner??null,ranked,guild,id,rev,now);
    // Debit only if the immediately preceding CAS succeeded. A failed debit rolls the batch back.
    const guardedPay=pay && stmt(pay.query.replace("VALUES(?,?,?,?,?,?,?,?,?,?)","SELECT ?,?,?,?,?,?,?,?,?,? WHERE changes()=1"),...pay.params);
    let result;
    try { [result]=await db.batch([update,...(guardedPay?[guardedPay]:[])]); }
    catch(err) {
        if(guardedPay && /check constraint/i.test(err.message)) throw new Notice("Tarvitset ensiapulaukun inventaariosta.");
        throw err;
    }
    if(!result?.results?.length) throw new Notice("Vuoro käsiteltiin jo. Käytä viestin uusimpia painikkeita.");
    return result.results[0];
}

function bind(record,channel,message) {
    return db.run("UPDATE cards_battles SET channel=?,message=? WHERE id=? AND guild=?",[channel,message,record.id,record.guild]);
}

function startSweep(client) {
    let running=false;
    const timer=setInterval(async()=>{
        if(running) return;
        running=true;
        try {
            await expire();
            const expired=await db.all("SELECT id,channel,message FROM cards_battles WHERE state='expired' AND message IS NOT NULL LIMIT 30");
            for(const record of expired) {
                const channel=client.channels.cache.get(record.channel);
                await channel?.messages?.edit(record.message,{
                    content:"Taistelu suljettiin aikakatkaisun vuoksi.",embeds:[],components:[]
                }).catch(()=>{});
            }
            if(expired.length) await db.batch(expired.map(record=>stmt(
                "UPDATE cards_battles SET message=NULL WHERE id=? AND state='expired'",record.id)));
        } catch { /* Tietokannan tilapäinen katkos ei vaikuta bottiin. */ }
        finally { running=false; }
    },60_000);
    timer.unref();
}
module.exports={create,get,move,bind,expire,startSweep};
