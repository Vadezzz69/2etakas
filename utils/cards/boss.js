const { db,stmt,day,Notice }=require("../community");
const profile=require("./profile");
const bosses=[
    {name:"Yliverottaja", hp:450, level:"Keskitaso", moves:["Tarkastus","Takautuva sakko"], element:"Valo",color:"#e7ad64"},
    {name:"Enzonicin demoni",hp:520,level:"Vaikea",moves:["Muistiraja","Ylikuormitus"],element:"Tuli",color:"#e57b85"},
    {name:"Komitean petturi",hp:390,level:"Helppo",moves:["Kaksoisagentti","Viimeinen kuulustelu"],element:"Pimeys",color:"#8889e8"},
    {name:"Discordin ylivaltias",hp:500,level:"Vaikea",moves:["Mykistys","Massaporttikielto"],element:"Sähkö",color:"#92bfff"},
    {name:"Kaaoksen byrokraatti",hp:445,level:"Keskitaso",moves:["Puuttuva liite","Arkistovyöry"],element:"Kaaos",color:"#a786db"},
    {name:"Error 503",hp:480,level:"Vaikea",moves:["Uusintapyyntö","Hetkellisesti poissa"],element:"Teknologia",color:"#74d4ae"}
];

async function get(guild, id) {
    let row=await db.get("SELECT * FROM cards_bosses WHERE guild=? AND day=?",[guild,day()]);
    if (!row && !id) {
        const date=day(),type=date%bosses.length;
        await db.run("INSERT OR IGNORE INTO cards_bosses(id,guild,day,type,hp,state) VALUES(?,?,?,?,?,'active')",
            [`b${date}-${guild}`,guild,date,type,bosses[type].hp]);
        row=await db.get("SELECT * FROM cards_bosses WHERE guild=? AND day=?",[guild,date]);
    }
    if (!row || !bosses[row.type] || (id && id!==row.id)) throw new Notice("Päivän pomo ei ole saatavilla. Avaa /boss.");
    return row;
}

async function hit(guild,user,id) {
    const p=await profile.get(guild,user);
    const b=await get(guild,id);
    if(b.state!=="active") throw new Notice("Päivän pomo on jo voitettu.");
    const now=Date.now();
    const def=bosses[b.type];
    const phase=b.hp*2<=def.hp?1:0;
    const damage=Math.min(b.hp,Math.max(10,p.stats.attack+(phase?1:5)));
    const blow=Math.max(5,phase*5+14-Math.floor(p.stats.defense/2));
    const result=await db.batch([
        stmt(`INSERT INTO cards_boss_hits(boss,user,round,damage,retaliation)
            SELECT id,?,?,?,? FROM cards_bosses WHERE id=? AND rev=? AND state='active'
            AND NOT EXISTS(SELECT 1 FROM cards_boss_hits WHERE boss=? AND user=? AND round>?)
            AND coalesce((SELECT sum(retaliation) FROM cards_boss_hits WHERE boss=? AND user=?),0) < ?`,
        user,now,damage,blow,id,b.rev,id,user,now-45_000,id,user,p.stats.hp),
        stmt(`UPDATE cards_bosses SET hp=hp-?,rev=rev+1,state=CASE WHEN hp-?=0 THEN 'finished' ELSE state END
            WHERE id=? AND rev=? AND changes()=1 RETURNING *`,damage,damage,id,b.rev)
    ]);
    const updated=result[1]?.results?.[0];
    if(!updated) throw new Notice("Hyökkäys on vielä latautumassa, HP:si loppuivat tai pomo ehti vaihtaa vuoroa. Yritä tarvittaessa uudelleen.");
    return { ...updated,damage,retaliation:blow,move:def.moves[phase],user };
}
const leaders=id=>db.all("SELECT user,sum(damage) AS damage FROM cards_boss_hits WHERE boss=? GROUP BY user ORDER BY damage DESC LIMIT 5",[id]);
module.exports={bosses,get,hit,leaders};
