#!/usr/bin/env node
/**
 * Ajotesti: `npm run ajotesti`
 *
 * Ajaa JOKAISEN komennon execute()-funktion väärennetyllä Discord-interaktiolla
 * ja väärennetyllä tietokannalla (utils/db.js korvataan, oikeaan D1:een ei
 * kosketa eikä Discordiin yhdistetä). Jokainen komento ajetaan useita kertoja
 * sekä tyhjällä että täytetyllä datalla. Raportoi:
 *   - ajonaikaiset virheet (TypeError, ReferenceError ym.)
 *   - Discordin sääntörikkeet: kaksoisvastaus, vastaus ennen deferiä, tyhjä
 *     viesti/embed, yli 2000 merkin viesti, embedin kenttä- ja merkkirajat
 *   - komennot jotka eivät vastaa lainkaan
 *
 * Täydentää `npm test`:iä (joka tarkistaa vain rakenteen). Ei korvaa kokeilua
 * oikealla Discordilla: oikeuksia, ajastuksia ja ulkoisia rajapintoja (esim. meemi)
 * ei voi tässä testata.
 */
const path=require("path");
const proj=path.join(__dirname,"..");
process.chdir(proj);
const Module=require("module");

// ---- mockit ----
const rowFor=(i=0)=>new Proxy({},{
  get(_,k){
    if(typeof k!=="string")return undefined;
    if(k==="toJSON")return undefined;
    if(/(^id$|Id$|_id$)/.test(k))return String(123456789012345670+i);
    if(/(time|At$|aika|joined|date|pvm)/i.test(k))return Date.now()-3600000*(i+1);
    if(/^(reason|syy|nimi|name|title|kysymys|rangaistus|tyyppi|status|type|kuvaus|description|todiste|teksti|kohde|tekija|rikos|kategoria|tulos|lause|username|tag|message|content|text)/i.test(k))return "testi"+i;
    return 5+i;
  },
  has(){return true}
});
const rows=()=>[rowFor(0),rowFor(1),rowFor(2),rowFor(3)];
let MODE="empty";
const dbMock={
  run:async()=>({changes:1,lastID:1,meta:{changes:1}}),
  get:async()=>MODE==="empty"?undefined:rowFor(0),
  all:async()=>MODE==="empty"?[]:rows(),
};
const dbPath=path.join(proj,"utils","db.js");

// jaettu Proxy discord-olioille
function mock(name="mock",extra={}){
  const fn=function(){};
  return new Proxy(fn,{
    get(_,k){
      if(k in extra)return extra[k];
      if(k==="then")return undefined;
      if(k===Symbol.toPrimitive)return()=>`<mock:${name}>`;
      if(k==="toString")return()=>`<@111>`;
      if(k==="size")return 3;
      if(k===Symbol.iterator)return function*(){yield* [mock("a"),mock("b")]};
      if(/^(is|has|can)[A-Z]/.test(k))return()=>true;
      if(k==="length")return 3;
      return mock(name+"."+String(k));
    },
    apply(){return mock(name+"()")},
    has(){return true},
  });
}
let replies,flags;
function makeUser(id="111",bot=false){return {id,username:"testaaja",tag:"testaaja#0001",globalName:"Testaaja",bot,discriminator:"0",createdTimestamp:Date.now()-1e11,createdAt:new Date(Date.now()-1e11),displayAvatarURL:()=>"https://x/y.png",avatarURL:()=>"https://x/y.png",toString:()=>`<@${id}>`}}
function makeMember(id="111"){const u=makeUser(id);return {id,user:u,displayName:"Testaaja",nickname:null,joinedTimestamp:Date.now()-1e10,joinedAt:new Date(Date.now()-1e10),roles:{cache:new Map([["1",{id:"1",name:"rooli"}]]),highest:{position:1}},permissions:{has:()=>true},voice:{channel:null,channelId:null},displayAvatarURL:()=>"https://x/y.png",moderatable:true,kickable:true,bannable:true,communicationDisabledUntil:null,toString:()=>`<@${id}>`,timeout:async()=>{},kick:async()=>{},ban:async()=>{}}}
const channel=mock("channel",{id:"222",name:"yleinen",send:async m=>{replies.push(["channel.send",m]);return mock("msg")},isTextBased:()=>true,permissionOverwrites:{edit:async()=>{},cache:new Map()},bulkDelete:async()=>new Map([["a",1],["b",2]]),type:0,fetch:async()=>mock("c"),messages:{fetch:async()=>new Map()},guild:null});
function makeGuild(){
  const members=new Map([["111",makeMember("111")],["222",makeMember("222")],["333",makeMember("333")]]);
  const cache=Object.assign(new Map(members),{random:()=>members.get("222"),filter:f=>new Map([...members].filter(([k,v])=>f(v))),map:f=>[...members.values()].map(f)});
  const g={id:"999000",name:"Testipalvelin",memberCount:3,ownerId:"111",createdTimestamp:Date.now()-1e11,createdAt:new Date(Date.now()-1e11),premiumTier:1,premiumSubscriptionCount:0,verificationLevel:1,
    iconURL:()=>"https://x/y.png",bannerURL:()=>null,
    members:{cache,fetch:async a=>a?members.get(String(a))??members.get("111"):cache,me:makeMember("999")},
    channels:{cache:Object.assign(new Map([["222",channel]]),{filter:()=>new Map(),find:()=>channel}),fetch:async()=>channel},
    roles:{everyone:{id:"999000"},cache:Object.assign(new Map(),{filter:()=>new Map()})},
    emojis:{cache:new Map()},stickers:{cache:new Map()},
    fetchOwner:async()=>makeMember("111")};
  return g;
}
function makeInteraction(cmd,sub,client){
  const g=makeGuild();
  const optVals={kayttaja:()=>makeUser("222"),kohde:()=>makeUser("222"),kategoria:()=>"viestit",aikavali:()=>null,kysymys:()=>"Onko tämä testi?",syy:()=>"testisyy",veto:()=>"kruuna",viesti:()=>null,
    id:()=>"1",tutkinta:()=>"1",todiste:()=>"testitodiste",tiedot:()=>"testi",otsikko:()=>"testi",nimi:()=>"testi",kuvaus:()=>"testi"};
  const intVals={minuutit:()=>5,maara:()=>5,kesto_sekuntia:()=>5,id:()=>1,numero:()=>1,summa:()=>10,sakko:()=>10,maara_:()=>5};
  const mk={
    getUser:(n)=>(optVals[n]?optVals[n]():makeUser("222")),
    getMember:(n)=>makeMember("222"),
    getString:(n)=>optVals[n]?optVals[n]():null,
    getInteger:(n)=>intVals[n]?intVals[n]():null,
    getNumber:(n)=>intVals[n]?intVals[n]():null,
    getBoolean:()=>null,
    getChannel:()=>channel,getRole:()=>({id:"1"}),
    getSubcommand:()=>sub,getSubcommandGroup:()=>null,
  };
  const msg=()=>mock("message",{react:async()=>{},edit:async m=>{replies.push(["msg.edit",m])},delete:async()=>{},id:"5",
     createMessageComponentCollector:()=>({on(){return this},once(){return this},stop(){}}),
     awaitMessageComponent:async()=>{throw new Error("timeout")},createReactionCollector:()=>({on(){return this},stop(){}})});
  const i={
    commandName:cmd.data.name,user:makeUser("111"),member:makeMember("111"),guildId:"999000",guild:g,channel,channelId:"222",client,
    memberPermissions:{has:()=>true},appPermissions:{has:()=>true},createdTimestamp:Date.now()-50,locale:"fi",
    options:mk,deferred:false,replied:false,
    inGuild:()=>true,isChatInputCommand:()=>true,
    reply:async m=>{if(i.replied||i.deferred)throw new Error("DISCORD: InteractionAlreadyReplied (reply kutsuttu kun jo vastattu/deferattu)");check(m,"reply");flags.replied=true;i.replied=true;replies.push(["reply",m]);return msg()},
    deferReply:async()=>{if(i.replied||i.deferred)throw new Error("DISCORD: InteractionAlreadyReplied (deferReply kutsuttu kun jo vastattu/deferattu)");flags.deferred=true;i.deferred=true},
    editReply:async m=>{if(!i.replied&&!i.deferred)throw new Error("DISCORD: InteractionNotReplied (editReply ennen reply/deferReply)");check(m,"editReply");flags.replied=true;i.replied=true;replies.push(["editReply",m]);return msg()},
    followUp:async m=>{if(!i.replied&&!i.deferred)throw new Error("DISCORD: InteractionNotReplied (followUp ennen reply/deferReply)");check(m,"followUp");flags.replied=true;replies.push(["followUp",m]);return msg()},
    fetchReply:async()=>msg(),deleteReply:async()=>{},
  };
  g.channels.cache.set("222",Object.assign(channel,{guild:g}));
  return i;
}

// ---- Discordin viesti-/embed-rajat ----
function embedData(e){
  if(!e)return {};
  let d; try{d=typeof e.toJSON==="function"?e.toJSON():e}catch{d=e}
  // stubin muoto: {setTitle:[..],setDescription:[..],addFields:[[..]],setFooter:[..]}
  if(d&&(d.setTitle||d.setDescription||d.addFields||d.setFooter||d.setAuthor)){
    const o={};
    if(d.setTitle)o.title=d.setTitle[0];
    if(d.setDescription)o.description=d.setDescription[0];
    if(d.addFields||d.__fields)o.fields=(d.__fields||d.addFields.flat());
    if(d.setFooter)o.footer=d.setFooter[0];
    if(d.setAuthor)o.author=d.setAuthor[0];
    return o;
  }
  return d||{};
}
function check(m,kind){
  const ongelmat=[];
  if(typeof m==="string"){
    if(!m.trim())ongelmat.push("tyhjä viesti");
    if(m.length>2000)ongelmat.push(`sisältö ${m.length} merkkiä (raja 2000)`);
  }else if(m&&typeof m==="object"){
    const hasEmbeds=Array.isArray(m.embeds)&&m.embeds.length>0;
    const hasContent=typeof m.content==="string"&&m.content.trim().length>0;
    const hasFiles=Array.isArray(m.files)&&m.files.length>0;
    const hasComponents=Array.isArray(m.components)&&m.components.length>0;
    if(!hasEmbeds&&!hasContent&&!hasFiles&&!hasComponents)ongelmat.push("viestissä ei ole sisältöä eikä embediä");
    if(typeof m.content==="string"&&m.content.length>2000)ongelmat.push(`sisältö ${m.content.length} merkkiä (raja 2000)`);
    if(hasEmbeds){
      if(m.embeds.length>10)ongelmat.push("yli 10 embediä");
      let yht=0;
      for(const e of m.embeds){
        const d=embedData(e);
        const t=d.title??"",ds=d.description??"";
        yht+=String(t).length+String(ds).length;
        if(String(t).length>256)ongelmat.push(`embed-otsikko ${String(t).length} > 256`);
        if(String(ds).length>4096)ongelmat.push(`embed-kuvaus ${String(ds).length} > 4096`);
        const f=d.fields||[];
        if(f.length>25)ongelmat.push(`embedissä ${f.length} kenttää (raja 25)`);
        for(const k of f){
          const n=String(k?.name??""),v=String(k?.value??"");
          yht+=n.length+v.length;
          if(!n.trim())ongelmat.push("embed-kentän nimi tyhjä");
          if(!v.trim())ongelmat.push(`embed-kentän "${n.slice(0,30)}" arvo tyhjä`);
          if(n.length>256)ongelmat.push(`kentän nimi ${n.length} > 256`);
          if(v.length>1024)ongelmat.push(`kentän "${n.slice(0,30)}" arvo ${v.length} > 1024`);
        }
        const ft=d.footer?(d.footer.text??d.footer):null;
        if(ft&&String(ft).length>2048)ongelmat.push("footer > 2048");
        if(yht>6000)ongelmat.push(`embed yhteensä ${yht} > 6000`);
        if(!t&&!ds&&!f.length&&!d.image&&!d.thumbnail&&!d.author&&!d.footer)ongelmat.push("tyhjä embed");
      }
    }
  }
  if(ongelmat.length)throw new Error("DISCORD-RAJA ("+kind+"): "+ongelmat.join("; "));
}

// ---- lataa ----
const origLoad=Module._load;
Module._load=function(req,parent,isMain){
  let res;
  try{res=Module._resolveFilename(req,parent)}catch(e){return origLoad.apply(this,arguments)}
  if(res===dbPath)return dbMock;
  return origLoad.apply(this,arguments);
};
global.fetch=async()=>({ok:true,status:200,json:async()=>({url:"https://i.redd.it/x.png",title:"meemi",postLink:"https://redd.it/x",subreddit:"memes",nsfw:false,spoiler:false,ups:5,memes:[{url:"https://i.redd.it/x.png",title:"meemi",postLink:"https://redd.it/x",subreddit:"memes",nsfw:false,spoiler:false,ups:5}]}),text:async()=>"x",headers:{get:()=>"image/png"}});
const realST=global.setTimeout;
global.setTimeout=(fn,ms,...a)=>realST(fn,Math.min(ms||0,5),...a);

let komennot,ongelmat;
try{
  ({komennot,ongelmat}=require(path.join(proj,"handlers","commandLoader")).lataaKomennot());
}catch(e){console.log("LATAUS EPÄONNISTUI",e);process.exit(1)}
if(ongelmat?.length)console.log("LATAUSONGELMAT:",ongelmat);
const client={user:{id:"999",tag:"bot#1"},ws:{ping:42},commands:new (require("discord.js").Collection)(),guilds:{cache:new Map()},channels:{fetch:async()=>channel,cache:new Map()},users:{fetch:async()=>makeUser("222")},uptime:99999};
for(const k of komennot)client.commands.set(k.nimi,k.komento);

(async()=>{
  const tulos=[];
  for(const k of komennot){
    const j=k.komento.data.toJSON();
    const subs=(j.options||[]).filter(o=>o.type===1).map(o=>o.name);
    const variants=subs.length?subs:[null];
    for(const sub of variants){
      for(const mode of ["empty","filled"]){
        MODE=mode;
        const virheet=new Set();let eiVastausta=0,ajoja=0,timeouts=0;
        for(let n=0;n<8;n++){
          replies=[];flags={};
          const i=makeInteraction(k.komento,sub,client);
          ajoja++;
          try{
            await Promise.race([k.komento.execute(i,client),new Promise((_,rej)=>realST(()=>rej(new Error("__TIMEOUT__")),6000))]);
            if(!flags.replied)eiVastausta++;
          }catch(e){
            if(e.message==="__TIMEOUT__")timeouts++;
            else virheet.add((e.name||"Error")+": "+e.message.split("\n")[0]+"  @ "+(e.stack||"").split("\n").find(l=>l.includes(proj)&&!l.includes("harness"))?.replace(proj,"").trim());
          }
        }
        tulos.push({cmd:"/"+k.nimi+(sub?" "+sub:""),mode,virheet:[...virheet],eiVastausta,ajoja,timeouts});
      }
    }
  }
  const huonot=tulos.filter(t=>t.virheet.length||t.eiVastausta||t.timeouts);
  console.log(`\nAjettu ${tulos.length} komento/tila-yhdistelmää (${komennot.length} komentoa).`);
  for(const t of huonot){
    console.log(`\n${t.cmd} [data: ${t.mode}]`+(t.eiVastausta?`  ⚠️ ei vastannut ${t.eiVastausta}/${t.ajoja} ajossa`:"")+(t.timeouts?`  ⏱️ jäi odottamaan ${t.timeouts}/${t.ajoja}`:""));
    for(const v of t.virheet)console.log("   ❌ "+v);
  }
  if(!huonot.length)console.log("✅ Ei ajonaikaisia virheitä.");
  process.exit(huonot.length?1:0);
})();
