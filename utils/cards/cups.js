const { randomUUID }=require("node:crypto");
const { db,stmt,day,Notice }=require("../community");
const battle=require("./battles");
const { ledger }=require("./economy");

function bracket(players) {
    return [ {players:players.slice(0,2)}, {players:players.slice(2,4)}, {players:[]} ];
}

async function get(guild,id=null) {
    return id ? db.get("SELECT * FROM cards_cups WHERE guild=? AND id=?",[guild,id])
        : db.get("SELECT * FROM cards_cups WHERE guild=? AND day=?",[guild,day()]);
}

async function open(guild,user) {
    const id=randomUUID().slice(0,12);
    await db.run(`INSERT INTO cards_cups(id,guild,day,host,state,data)
        VALUES(?,?,?,?,'open',?) ON CONFLICT(guild,day) DO NOTHING`,[id,guild,day(),user,JSON.stringify({players:[user],rounds:[]})]);
    return get(guild);
}

async function save(cup,data,state=cup.state,champion=null) {
    const results=await db.batch([
        stmt("UPDATE cards_cups SET data=?,state=?,rev=rev+1 WHERE id=? AND rev=? RETURNING *",
            JSON.stringify(data),state,cup.id,cup.rev),
        ...(champion?[(()=>{
            const q=ledger(cup.guild,champion,`cup:${cup.id}`,"Turnausvoitto",120,180);
            return {...q,query:q.query.replace("VALUES(?,?,?,?,?,?,?,?,?,?)","SELECT ?,?,?,?,?,?,?,?,?,? WHERE changes()=1")};
        })()]:[])
    ]);
    if(!results[0]?.results?.length) throw new Notice("Turnaus muuttui. Päivitä näkymä.");
    return results[0].results[0];
}

async function join(guild,user,id) {
    const cup=await get(guild);
    if(!cup || cup.id!==id || cup.state!=="open") throw new Notice("Ilmoittautuminen on suljettu.");
    const data=JSON.parse(cup.data);
    if(data.players.includes(user)) return cup;
    data.players.push(user);
    if(data.players.length===4) {
        data.rounds=bracket(data.players);
        return save(cup,data,"playing");
    }
    return save(cup,data);
}

async function sync(cup) {
    if(cup?.state!=="playing") return cup;
    const data=JSON.parse(cup.data);
    let changed=false;
    for(const slot of data.rounds) {
        if(!slot.battle || slot.winner) continue;
        const match=await battle.get(cup.guild,slot.battle);
        if (match?.state==="finished" && match.winner) { slot.winner=match.winner;changed=true; }
        else if(!match || !["pending","playing"].includes(match.state) || match.expires<=Date.now()) { delete slot.battle;changed=true; }
    }
    if(data.rounds[0].winner && data.rounds[1].winner && !data.rounds[2].players.length) {
        data.rounds[2].players=[data.rounds[0].winner,data.rounds[1].winner];changed=true;
    }
    const winner=data.rounds[2].winner;
    if(winner) return save(cup,data,"finished",winner);
    return changed?save(cup,data):cup;
}

async function match(i,id,n) {
    const cup=await sync(await get(i.guildId));
    if(!cup || cup.id!==id || cup.state!=="playing") throw new Notice("Turnaus ei ole käynnissä.");
    const data=JSON.parse(cup.data);
    const slot=data.rounds[n];
    if(!slot?.players.includes(i.user.id) || slot.winner || slot.battle) throw new Notice("Tämä ottelu ei ole avattavissa sinulle.");
    const opponent=await i.client.users.fetch(slot.players.find(p=>p!==i.user.id));
    return battle.create(i.guildId,i.user,opponent,{ cup,index:n });
}

module.exports={get,open,join,sync,match};
