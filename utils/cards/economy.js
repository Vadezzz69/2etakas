const { randomUUID,randomInt }=require("node:crypto");
const { db,stmt,Notice,day }=require("../community");
const profiles=require("./profile");
const { items }=require("./catalog");

const ledger=(guild,user,event,reason,delta=0,xp=0,item=null,quantity=0,effect=null)=>stmt(
    "INSERT INTO cards_ledger(guild,user,event,reason,created,delta,xp,item,quantity,effect) VALUES(?,?,?,?,?,?,?,?,?,?)",
    guild,user,event,reason,Date.now(),delta,xp,item,quantity,effect
);

async function transact(query, warning="Saldo tai tavaramäärä ei riitä, tai toiminto on jo käsitelty.") {
    try { return await db.run(query.query,query.params); }
    catch(err) {
        if (/check constraint|unique constraint/i.test(err.message)) throw new Notice(warning);
        throw err;
    }
}

async function daily(guild,user) {
    await profiles.get(guild,user);
    return transact(ledger(guild,user,`daily:${day()}`,"Päiväpalkinto",35,15),"Päiväpalkinto on jo noudettu tänään.");
}

async function buy(guild,user,item,event) {
    if (!items[item]) throw new Notice("Tavaraa ei löydy.");
    await profiles.get(guild,user);
    return transact(ledger(guild,user,`buy:${event}`,"Ostos",-items[item].price,0,item,1));
}

async function use(guild,user,item,event) {
    const data=items[item];
    if (!data || !["gear","cosmetic","training"].includes(data.kind)) throw new Notice("Tätä tavaraa käytetään taistelussa tai korttipakkana.");
    if (data.kind==="training") return transact(ledger(guild,user,`use:${event}`,"Koulutus",0,50,item,-1));
    const op=ledger(guild,user,`equip:${event}`,"Varusteen vaihto",0,0,null,0,item);
    const res=await db.run(op.query.replace("VALUES(?,?,?,?,?,?,?,?,?,?)",
        "SELECT ?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM cards_inventory WHERE guild=? AND user=? AND item=? AND quantity>0)"),
        [...op.params,guild,user,item]);
    if (!res.changes) throw new Notice("Tavaraa ei ole inventaariossa.");
}

async function open(guild,user,event,subjects) {
    await profiles.get(guild,user);
    const styles=["Arkisto","Hologrammi","Yövuoro","Pronssikehys"];
    const draws=Array.from({length:3},()=>({
        id:randomUUID().slice(0,12),subject:subjects[randomInt(subjects.length)],
        rarity:profiles.rarity(randomInt(10000)),style:styles[randomInt(styles.length)]
    }));
    const extras=["laastari","laastari","koulutus","tausta","suoja","holo"];
    const bonus=extras[randomInt(extras.length)];
    try {
        await db.batch([ledger(guild,user,`pack:${event}`,"Pakka avattu",0,8,"pakka",-1),
            ledger(guild,user,`pack-bonus:${event}`,"Pakan lisälöytö",0,0,bonus,1),
            ...draws.map(c=>stmt("INSERT INTO cards_collection(id,guild,owner,subject,rarity,style,created) VALUES(?,?,?,?,?,?,?)",
                c.id,guild,user,c.subject,c.rarity,c.style,Date.now()))]);
    } catch(err) {
        if (/check constraint|unique constraint/i.test(err.message)) throw new Notice("Pakkaa ei ole inventaariossa tai se avattiin jo.");
        throw err;
    }
    return {draws,bonus};
}
const inventory=(guild,user)=>db.all("SELECT item,quantity FROM cards_inventory WHERE guild=? AND user=? AND quantity>0 ORDER BY item",[guild,user]);
const history=(guild,user)=>db.all("SELECT delta,reason,created FROM cards_ledger WHERE guild=? AND user=? AND delta<>0 ORDER BY created DESC LIMIT 10",[guild,user]);

module.exports={ledger,daily,buy,use,open,inventory,history};
