const { ButtonStyle }=require("discord.js");
const { createHash }=require("node:crypto");
const { Notice,view,row,button,select,modal,execute,setupPanel }=require("../community");
const { palkki }=require("../tyyli");
const { turvallinen }=require("../musiikki/muotoilu");
const profile=require("./profile");
const { rarities,items }=require("./catalog");
const economy=require("./economy");
const battle=require("./battles");
const duelUi=require("./duelUi");
const { skills }=require("./combat");
const collection=require("./collection");
const boss=require("./boss");
const progression=require("./progression");
const cups=require("./cups");
const renderer=require("./render");

const btn=(action,label,style,disabled)=>button(`kc:${action}`,label,style,disabled);
const target=i=>i.options?.getUser("kayttaja") ?? i.user;
const labels={viikko:"Viikko",kuukausi:"Kuukausi",kausi:"Nykyinen kausi",kaikki:"Koko aika"};

async function card(i,user=target(i)) {
    if(user.bot) throw new Notice("Boteilla ei ole taistelukorttia.");
    const player=await profile.get(i.guildId,user.id);
    const png=await renderer.card(user,player.stats);
    return {
        ...view("Komitea Cards",`${rarities[player.stats.rarity].name} · ${player.stats.stage}`,[],{ image:"attachment://komitea-kortti.png" }),
        files:[{attachment:png,name:"komitea-kortti.png"}]
    };
}

async function challenge(i,user=target(i)) {
    return duelUi.publicDuel(await battle.create(i.guildId,i.user,user),i);
}

async function wallet(i) {
    const [player,entries]=await Promise.all([profile.get(i.guildId,i.user.id),economy.history(i.guildId,i.user.id)]);
    return view("Komiteakolikot",`Saldo **${player.coins} kolikkoa**\n\n`+
        (entries.map(r=>`${r.delta>0?"+":""}${r.delta} · ${r.reason} · <t:${Math.floor(r.created/1000)}:d>`).join("\n")||"Tapahtumia ei ole."),
        [row(btn("shop","Kauppa"),btn("daily","Päiväpalkinto"))]);
}

function shop() {
    return view("Komitean kauppa",Object.values(items).map(x=>`**${x.name}** · ${x.price} kolikkoa\n${x.description}`).join("\n"),
        [select("kc:buy","Valitse ostos",Object.entries(items).map(([value,item])=>({label:item.name,value,description:`${item.price} kolikkoa` })))]);
}

async function inventory(i) {
    const p=await profile.get(i.guildId,i.user.id);
    const stuff=(await economy.inventory(i.guildId,i.user.id)).filter(x=>items[x.item]);
    const usable=stuff.filter(x=>["gear","cosmetic","training"].includes(items[x.item].kind));
    return view("Inventaario",`Varuste: ${items[p.equipped]?.name ?? "Ei varustetta"}\n\n`+
        (stuff.map(x=>`${items[x.item].name} · ${x.quantity} kpl`).join("\n")||"Inventaario on tyhjä."),[
        ...(usable.length?[select("kc:use","Käytä tai varusta tavara",usable.map(x=>({ label:items[x.item].name,value:x.item })))]:[]),
        row(btn("pack","Avaa pakka"),btn("shop","Kauppa"))
    ]);
}

async function pack(i) {
    const humans=[...(i.guild.members.cache?.values() ?? [])].filter(x=>!x.user?.bot).slice(0,200).map(x=>x.id);
    const {draws,bonus}=await economy.open(i.guildId,i.user.id,i.id,[...humans,"Yöarkiston vartija","Kuitinsyöjä","Erikoistarkastaja","Hiljaisuuden sihteeri"]);
    return view("Pakka avattu",draws.map(c=>`**${rarities[c.rarity].name}** · ${/^\d+$/.test(c.subject)?`<@${c.subject}>`:c.subject} · ${c.style} · \`${c.id}\``).join("\n")
        +`\n\nLisälöytö · ${items[bonus].name}`,[row(btn("collection","Kokoelma"),btn("pack","Avaa toinen"))]);
}

const rarityFilter=v=>/^\d$/.test(v ?? "")&&Number(v)<rarities.length?Number(v):null;
async function cards(i,r=null,offset=0) {
    const stored=(await collection.owned(i.guildId,i.user.id,r,offset)).filter(x=>rarities[x.rarity]);
    const cards=stored.slice(0,10);
    const filter=select("kc:rarity","Suodata harvinaisuuden mukaan",[{label:"Kaikki",value:"all"},
        ...rarities.map((item,id)=>({label:item.name,value:String(id)}))]);
    return view("Korttikokoelma",cards.map(c=>`**${rarities[c.rarity].name}** · ${/^\d+$/.test(c.subject)?`<@${c.subject}>`:c.subject} · ${c.style} · \`${c.id}\``).join("\n")
        ||"Kokoelmassa ei ole tämän suodattimen kortteja.",[
        filter,
        ...(cards.length?[select("kc:copy","Avaa keräilykortin kuva",cards.map(c=>({label:`${rarities[c.rarity].name} · ${c.id}`,value:c.id})))]:[]),
        ...(offset || stored.length>10 ? [row(btn(`collection:${r??"all"}:${Math.max(0,offset-10)}`,"Edellinen",undefined,offset===0),
            btn(`collection:${r??"all"}:${offset+10}`,"Seuraava",undefined,stored.length<=10))]:[])
    ]);
}
async function copy(i,id) {
    const {db}=require("../community");
    const record=await db.get("SELECT * FROM cards_collection WHERE guild=? AND owner=? AND id=?",[i.guildId,i.user.id,id]);
    if(!record || typeof record.subject!=="string") throw new Notice("Korttia ei löydy kokoelmastasi.");
    let user={username:record.subject};
    if(/^\d+$/.test(record.subject)) user=await i.client.users.fetch(record.subject).catch(()=>({username:"Tuntematon agentti"}));
    let cursor=0;
    const hash=createHash("sha256").update(id).digest();
    const rolled=profile.generate(max=>hash.readUInt16LE((cursor++*2)%30)%max);
    const equipped={ Hologrammi:"holo",Yövuoro:"tausta",Pronssikehys:"kehys" }[record.style];
    const png=await renderer.card(user,profile.describe({...rolled,id,rarity:record.rarity},0,equipped),"Keräily");
    return {...view("Keräilykortti",`${rarities[record.rarity].name} · ${record.style}`,[],{image:"attachment://kerailykortti.png"}),
        files:[{attachment:png,name:"kerailykortti.png"}]};
}
function tradeView(t) {
    return view("Korttivaihto",`<@${t.sender}> tarjoaa korttia \`${t.offered}\` vastaan \`${t.requested}\` käyttäjältä <@${t.recipient}>.\n`+
        (t.state==="pending"?"Vastaanottajan hyväksyntä tarvitaan.":t.state==="accepted"?"Omistajuudet vaihdettiin.":"Tarjous peruutettiin."),
    t.state==="pending"?[row(btn(`trade:${t.id}:yes`,"Hyväksy",ButtonStyle.Primary),btn(`trade:${t.id}:no`,"Hylkää"))]:[]);
}
async function trade(i) {
    const user=target(i);
    if(user.bot) throw new Notice("Botti ei voi vaihtaa kortteja.");
    return tradeView(await collection.offer(i.guildId,i.user.id,user.id,
        i.options.getString("tarjoan",true),i.options.getString("pyydan",true)));
}
async function daily(i) {
    await economy.daily(i.guildId,i.user.id);
    return view("Päiväpalkinto","Sait **35 Komiteakolikkoa** ja **15 XP:tä**.");
}
async function ranking(i,period=i.options?.getString("jakso") ?? "kaikki") {
    const list=await progression.rank(i.guildId,period);
    return view(`Ranking · ${labels[period] ?? labels.kaikki}`,list.map((r,n)=>
        `${n+1}. <@${r.user}> · **${r.rating} Elo** · ${r.wins} V / ${r.losses} T · ${Math.round(r.wins/(r.wins+r.losses)*100)} %`).join("\n")||
        "Tälle jaksolle ei ole ranked-tuloksia.",[select("kc:rank","Valitse ajanjakso",Object.entries(labels).map(([value,label])=>({value,label})))]);
}
async function player(i,user=target(i)) {
    if(user.bot) throw new Notice("Boteilla ei ole peliprofiilia.");
    const p=await profile.get(i.guildId,user.id);
    const s=p.stats;
    return view("Peliprofiili",`<@${user.id}> · **${s.stage}** · Taso ${s.level}\n${palkki(s.xp/s.next*100,12)} ${s.xp}/${s.next} XP`,
        [row(btn("card","Oma kortti"),btn("tasks","Tehtävät"))],{fields:[
            {name:"Elo",value:String(p.rating),inline:true},{name:"Voitot / tappiot",value:`${p.wins} / ${p.losses}`,inline:true},
            {name:"Voittoputki / ennätys",value:`${p.streak} / ${p.best}`,inline:true}
        ]});
}
async function development(i) {
    const p=await profile.get(i.guildId,i.user.id);
    const s=p.stats;
    const stock=await economy.inventory(i.guildId,i.user.id);
    const books=stock.find(item=>item.item==="koulutus")?.quantity ?? 0;
    return view("Kortin kehitys",`**${s.stage}** · Taso ${s.level}
${palkki(s.xp/s.next*100,12)} ${s.xp}/${s.next} XP

`+
        (s.level>=s.burstLevel?`${skills.burst} on avattu.`:`${skills.burst} avautuu tasolla ${s.burstLevel}.`)+`
Koulutusoppaita: ${books}.`,[
        row(btn("train","Käytä koulutusopas",ButtonStyle.Primary,!books),btn("tasks","Tehtävät"),btn("shop","Kauppa"))
    ]);
}
async function tasks(i,claim=false) {
    const result=await progression.tasks(i.guildId,i.user.id,claim);
    return view("Tehtävät ja saavutukset",(claim?`Lunastettu nyt **${result.awarded} kolikkoa**.\n\n`:"")+result.list.map(t=>
        `${t.done?"✓":"–"} ${t.name} · ${Math.min(t.value,t.goal)}/${t.goal} · ${t.coins} kolikkoa`).join("\n"),[row(btn("claim","Lunasta valmiit"))]);
}
async function bossView(i,record) {
    const b=record ?? await boss.get(i.guildId);
    const c=boss.bosses[b.type];
    const leaders=await boss.leaders(b.id);
    const pseudo=profile.describe({id:b.id,edition:"Pomo",rarity:4,classIndex:b.type,hp:c.hp,attack:26,defense:11,speed:9,luck:9},0);
    const buffer=await renderer.card({username:c.name},{...pseudo,color:c.color,element:c.element,move:null,ability:c.moves.join(" / "),description:"Yhteinen päivittäinen pomotaistelu."});
    const payload=view(c.name,`${c.level} · ${b.state==="finished"?"Voitettu":b.hp*2<=c.hp?"Vaihe 2":"Vaihe 1"}\n${palkki(b.hp/c.hp*100,12)} ${b.hp}/${c.hp} HP\n\n`+
        (b.damage?`<@${b.user}> teki ${b.damage} vahinkoa. **${b.move}** vastasi ${b.retaliation} vahingolla.\n\n`:"")+
        (leaders.map(k=>`<@${k.user}> · ${k.damage} vahinkoa`).join("\n")||"Osallistujia ei vielä ole."),
        b.state==="active"?[row(btn(`hit:${b.id}`,"Hyökkää",ButtonStyle.Primary))]:[],
        {thumbnail:"attachment://pomo.png"});
    payload.files=[{attachment:buffer,name:"pomo.png"}];
    return payload;
}
function cupView(c) {
    const data=JSON.parse(c.data);
    const slots=data.rounds.map((slot,n)=>`${n<2?`Välierä ${n+1}`:"Finaali"} · ${slot.players.map(p=>`<@${p}>`).join(" vastaan ")||"Odottaa"}${slot.winner?` · voittaja <@${slot.winner}>`:""}`);
    return view("Komitean päiväturnaus",c.state==="open"?`Ilmoittautuneet ${data.players.length}/4\n${data.players.map(p=>`<@${p}>`).join(" · ")}`:slots.join("\n"),
        c.state==="open"?[row(btn(`cupjoin:${c.id}`,"Ilmoittaudu",ButtonStyle.Primary),btn("cuprefresh","Päivitä"))]:
            c.state==="finished"?[]:[row(...data.rounds.flatMap((slot,n)=>slot.players.length&&!slot.winner&&!slot.battle?
                [btn(`cupmatch:${c.id}:${n}`,n===2?"Avaa finaali":`Avaa välierä ${n+1}`)]:[]),btn("cuprefresh","Päivitä"))]);
}
async function cup(i){
    const c=await cups.sync(await cups.get(i.guildId));
    return c?cupView(c):view("Komitean päiväturnaus","Neljä pelaajaa, kaksi välierää ja finaali. Voittaja saa 120 kolikkoa ja 180 XP:tä.",
        [row(btn("cupopen","Luo turnaus",ButtonStyle.Primary))]);
}
function panel(){
    return view("Komitea Cards","Oma kortti, taistelut ja Komitean arkiston keräilykortit.",[
        row(btn("card","Oma kortti"),btn("challenge","Haasta"),btn("pack","Korttipakka"),btn("collection","Kokoelma")),
        row(btn("shop","Kauppa"),btn("inventory","Inventaario"),btn("tasks","Tehtävät"),btn("daily","Päiväpalkinto")),
        row(btn("rank","Ranking"),btn("boss","Pomotaistelu"),btn("cup","Turnaus"),btn("wallet","Saldo"))
    ]);
}
async function handle(i) {
    const [,action,a,b,c]=i.customId.split(":");
    if(action==="duel") return duelUi.interaction(i,a,b,c);
    if(action==="challenge") return i.showModal(modal("kc:opponent","Haasta pelaaja",[["user","Vastustajan käyttäjätunniste",24]]));
    if(action==="trade") {
        await i.deferUpdate();
        try { return await i.editReply(tradeView(await collection.respond(i.guildId,a,i.user.id,b==="yes"))); }
        catch(err) { if(err instanceof Notice) return i.followUp({...require("../community").failure(err.message),...require("../community").privateReply}); throw err; }
    }
    return execute(i,async()=>{
        const value=i.values?.[0];
        const tasksByAction={
            card:()=>card(i,i.user),pack:()=>pack(i),collection:()=>cards(i,rarityFilter(a),Math.max(0,Math.min(10000,Number(b)||0))),
            rarity:()=>cards(i,rarityFilter(value)),copy:()=>copy(i,value),shop,inventory:()=>inventory(i),
            buy:async()=>{await economy.buy(i.guildId,i.user.id,value,i.id);return inventory(i);},
            use:async()=>{await economy.use(i.guildId,i.user.id,value,i.id);return inventory(i);},
            wallet:()=>wallet(i),daily:()=>daily(i),rank:()=>ranking(i,value??"kaikki"),tasks:()=>tasks(i),
            claim:()=>tasks(i,true),
            train:async()=>{await economy.use(i.guildId,i.user.id,"koulutus",i.id);return development(i);},
            boss:()=>bossView(i),hit:async()=>bossView(i,await boss.hit(i.guildId,i.user.id,a)),
            cup:()=>cup(i),cuprefresh:()=>cup(i),cupopen:async()=>cupView(await cups.open(i.guildId,i.user.id)),
            cupjoin:async()=>cupView(await cups.join(i.guildId,i.user.id,a)),
            cupmatch:async()=>duelUi.publicDuel(await cups.match(i,a,Number(b)),i),
            opponent:async()=>{
                const id=i.fields.getTextInputValue("user").trim().replace(/^<@!?(\d+)>$/,"$1");
                if(!/^\d{17,22}$/.test(id)) throw new Notice("Anna palvelimella olevan vastustajan Discord-tunniste.");
                const member=await i.guild.members.fetch(id).catch(()=>null);
                if(!member) throw new Notice("Pelaajaa ei löytynyt palvelimelta.");
                return challenge(i,member.user);
            }
        };
        if(!tasksByAction[action]) throw new Notice("Toiminto vanheni.");
        return tasksByAction[action]();
    },["opponent","cupmatch"].includes(action));
}

module.exports={handle,card,challenge,pack,cards,shop,inventory,trade,daily,ranking,player,tasks,wallet,bossView,cup,panel,
    development,setup:i=>setupPanel(i,"cards",panel())};
