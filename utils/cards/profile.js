const { randomInt, randomUUID } = require("node:crypto");
const { db, Notice } = require("../community");
const { classes,rarities,items } = require("./catalog");
const { xpUnit, stages, stageLevels } = require("./config");

function rarity(roll) { return rarities.findIndex(r=>roll<r.limit); }

function generate(rng=randomInt) {
    return {
        id:randomUUID().slice(0,12), edition:1, rarity:rarity(rng(10000)),
        classIndex:rng(classes.length),
        hp:96+rng(9),attack:18+rng(5),defense:8+rng(5),speed:8+rng(5),luck:4+rng(7)
    };
}

function describe(card,xp=0,equipped=null) {
    const level=Math.max(1,1+Math.floor(Math.sqrt(xp/xpUnit())));
    const [name,element,ability,passive,description,passiveId,move]=classes[card.classIndex];
    const power=Math.min(8,Math.floor((level-1)/4));
    return { ...card,name,element,ability,passive,description,passiveId,move,level,xp,
        next:xpUnit()*level**2, stage:stages().findLast(([min])=>level>=min)[1], burstLevel:stageLevels()[0],
        hp:card.hp+power*2,attack:card.attack+Math.floor(power/2),
        defense:card.defense+Math.floor(power/2)+(equipped==="suoja"?2:0),
        speed:card.speed+Math.floor(power/2)+(equipped==="saappaat"?2:0),equipped,
        gear:items[equipped]?.name ?? null
    };
}

async function get(guild,user) {
    let player=await db.get("SELECT * FROM cards_players WHERE guild=? AND user=?",[guild,user]);
    if (typeof player?.card !== "string") {
        await db.run("INSERT OR IGNORE INTO cards_players(guild,user,card) VALUES(?,?,?)",[guild,user,JSON.stringify(generate())]);
        player=await db.get("SELECT * FROM cards_players WHERE guild=? AND user=?",[guild,user]);
    }
    if (typeof player?.card !== "string") throw new Notice("Pelaajaprofiilia ei saatu ladattua.");
    return { ...player, stats:describe(JSON.parse(player.card),player.xp,player.equipped) };
}
module.exports={generate,get,describe,rarity};
