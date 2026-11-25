const { randomInt,randomUUID }=require("node:crypto");
const choose = list => list[randomInt(list.length)];
const { db,Notice,view,row,button,modal,execute,privateReply,failure }=require("../../community");
const store=require("./store");
const library=require("./library");
const UI=require("../muotoilu");

const sessions=new Map();
const quiz=[
    ["Mikä soitin käyttää tavallisesti 88 kosketinta?",["Piano","Harmonikka","Cembalo"],0],
    ["Minkä maan musiikkina reggae tunnetaan?",["Kuuba","Jamaika","Islanti"],1],
    ["Mitä BPM kuvaa?",["Taajuutta","Sointujen määrää","Iskuja minuutissa"],2],
    ["Mikä on Chief Keefin vuoden 2012 albumi?",["Finally Rich","Illmatic","Graduation"],0],
    ["Mikä termi tarkoittaa kappaleen vähittäistä hiljentymistä?",["Fugato","Diminuendo","Ostinato"],1],
    ["Kuinka monta puolisävelaskelta oktaavissa on?",["8","10","12"],2]
];

async function roulette(i) {
    const fav=(await store.favorites(i.guildId,i.user.id)).map(r=>JSON.parse(r.track));
    const lists=(await store.playlists(i.guildId,i.user.id)).filter(p=>p.shared);
    const tracks=lists.length ? JSON.parse((await store.playlist(i.guildId,i.user.id,choose(lists).id))?.tracks ?? "[]") : [];
    const pool=[...fav,...tracks];
    if(!pool.length) throw new Notice("Lisää suosikkeja tai jaa soittolista ennen rulettia.");
    return library.enqueue(i,[choose(pool)]);
}

function battleView(s) {
    const tracks=[...s.songs.values()];
    const votes=[...s.votes.values()];
    const names=tracks.map(({song,user},n)=>`${n+1}. ${UI.nimi(song)} · <@${user}>${s.closed?` · ${votes.filter(v=>v===n).length} ääntä`:""}`);
    const details=s.closed?(()=>{
        if (tracks.length<2) return "Äänestystä ei avattu, koska ehdotuksia ei saatu kahta.";
        const a=votes.filter(v=>v===0).length,b=votes.length-a;
        return a===b?"Tasapeli.":`Voittaja: ${UI.nimi(tracks[a>b?0:1].song)}.`;
    })():"Kaksi pelaajaa ehdottaa kappaleen. Muut äänestävät.\n"+
        (s.songs.size===2?"Äänestä suosikkiasi.":"Ehdottamiseen tarvitaan julkinen kappalelinkki.");
    return view("Musiikkibattle",[...names,details].join("\n"),s.closed?[]:s.songs.size===2?
        [row(button(`ks:vote:${s.id}:0`,"Äänestä 1"),button(`ks:vote:${s.id}:1`,"Äänestä 2"),button(`ks:end:${s.id}`,"Päätä äänestys"))]:
        [row(button(`ks:nominate:${s.id}`,"Ehdota kappaletta"))]);
}
function quizView(s) {
    const [question,answers,right]=s.question;
    return view("Musiikkivisa",question+(s.closed?`\nVastaus: **${answers[right]}**.`:""),
        s.closed?[]:[row(...answers.map((name,n)=>button(`ks:quiz:${s.id}:${n}`,name)))]);
}
async function start(i,type) {
    if([...sessions.values()].some(s=>s.guild===i.guildId&&s.type===type&&!s.closed)) throw new Notice("Palvelimella on jo tämä tapahtuma käynnissä.");
    if(sessions.size>=100) throw new Notice("Tapahtumia on juuri nyt liikaa.");
    const s={id:randomUUID().slice(0,10),guild:i.guildId,user:i.user.id,type,closed:false,until:Date.now()+180_000,
        votes:new Map(),songs:new Map(),question:choose(quiz)};
    sessions.set(s.id,s);
    startSweep();
    return Object.assign(type==="battle"?battleView(s):quizView(s),{afterReply:m=>{s.message=m;}});
}
let sweep;
function startSweep() {
    if(sweep) return;
    sweep=setInterval(()=>{
        for(const s of sessions.values()) if(s.until<=Date.now()) {
            s.closed=true;
            sessions.delete(s.id);
            void s.message?.edit?.(s.type==="battle"?battleView(s):quizView(s)).catch(()=>{});
        }
        if(!sessions.size) {clearInterval(sweep);sweep=null;}
    },20_000);
    sweep.unref();
}
async function handle(i) {
    const [,action,id,value]=i.customId.split(":");
    const s=sessions.get(id);
    if(!s || s.guild!==i.guildId || s.closed || s.until<=Date.now()) {
        return execute(i,()=>{throw new Notice("Tapahtuma on päättynyt.");});
    }
    if(action==="nominate") {
        if(s.songs.has(i.user.id)) return execute(i,()=>{throw new Notice("Olet jo ehdottanut kappaletta.");});
        return i.showModal(modal(`ks:submit:${id}`,"Ehdota kappaletta",[["song","Julkinen kappalelinkki",500]]));
    }
    if(action==="submit") return execute(i,async()=>{
        const url=i.fields.getTextInputValue("song").trim();
        if(!/^https?:\/\//i.test(url)) throw new Notice("Anna kappaleen julkinen linkki.");
        const opts=require("../config").asetukset();
        const result=await require("../lahteet").haeKappaleet(url,{asetukset:opts}).catch(()=>null);
        const song=result && !result.lista && store.track(result.kappaleet[0] ?? {});
        if(!song) throw new Notice("Kappaletta ei löytynyt.");
        if(s.closed || s.until<=Date.now() || s.songs.size>=2 || s.songs.has(i.user.id) ||
            [...s.songs.values()].some(x=>x.song.url===song.url)) throw new Notice("Ehdotukset ovat täynnä tai kappale on jo mukana.");
        s.songs.set(i.user.id,{song,user:i.user.id});
        await s.message?.edit?.(battleView(s)).catch(()=>{});
        return view("Ehdotus lisätty",UI.nimi(song));
    });
    if(action==="quiz") return execute(i,()=>{
        if(s.votes.has(i.user.id)) throw new Notice("Olet jo vastannut tähän kysymykseen.");
        const right=Number(value)===s.question[2];
        s.votes.set(i.user.id,right);
        return view("Musiikkivisa",right?"Oikein!":"Tällä kertaa väärin. Oikea vastaus julkaistaan visan päättyessä.");
    });
    if(action==="vote") return execute(i,()=>{
        if(s.songs.size!==2 || s.songs.has(i.user.id)) throw new Notice("Kappaleiden ehdottajat eivät äänestä omassa ottelussaan.");
        if(s.votes.has(i.user.id)) throw new Notice("Olet jo äänestänyt.");
        s.votes.set(i.user.id,Number(value));
        return view("Ääni kirjattu","Tulokset näkyvät äänestyksen päätyttyä.");
    });
    if(action==="end") {
        if(s.user!==i.user.id) return i.reply({...failure("Vain tapahtuman aloittaja voi päättää äänestyksen."),...privateReply});
        s.closed=true;
        sessions.delete(s.id);
        return i.update(battleView(s));
    }
}

async function taste(i) {
    const target=i.options.getUser("kayttaja",true);
    const top=user=>db.all(`SELECT lower(artist) AS artist FROM music_listens WHERE guild=? AND user=? AND artist IS NOT NULL
        GROUP BY lower(artist) ORDER BY sum(milliseconds) DESC LIMIT 25`,[i.guildId,user]);
    const [left,right]=(await Promise.all([top(i.user.id),top(target.id)])).map(rows=>rows.map(r=>r.artist));
    if(!left.length||!right.length) return view("Musiikkimaku","Molemmat tarvitsevat kuunteluhistoriaa vertailuun.");
    const common=left.filter(a=>right.includes(a));
    const share=Math.round(100*common.length/new Set([...left,...right]).size);
    return view("Musiikkimaku",`Kuunnelluimpien artistien yhteensopivuus <@${target.id}>: **${share} %**\n\n`+
        (common.length?`Yhteiset artistit: ${common.slice(0,5).map(UI.turvallinen).join(", ")}.`:"Yhteisiä suosikkiartisteja ei vielä löytynyt."));
}

const jokes={
    musiikkirikos:[
        "Tuomio: epäilyttävän hyvä toistovalinta.","Arkisto määräsi ehdollisen korvamadon.","Tutkinta jatkuu seuraavaan kertosäkeeseen.",
        "Komitea takavarikoi yhden kuvitteellisen AUX-johdon.","Valitus hyväksytään ainoastaan sävellajissa.","Todisteet katosivat bassolinjan mukana."
    ],
    biisivero:[
        "Myöhästymiskorko maksetaan taputuksina.","Tilitys suoritetaan kuvitteellisina desibeleinä.","Veroilmoituksen liitteeksi kelpaa hyvä kertosäe.",
        "Kuulokkeista ei saa kotitalousvähennystä.","Kuitit käsitellään seuraavassa säkeistössä.","Komitea hyväksyi yhden tahdin verovapaaksi."
    ],
    musaroast:[
        "Kuunteluhistoria kuulostaa siltä kuin DJ olisi hävinnyt vedon.","Olet vaihtanut genreä useammin kuin Komitea vaihtaa kokousaikaa.",
        "Suosikkibiisisi päätyi komitean pöytäkirjaan nimellä muu asia.","Soittolistasi tekee itsekin yllätysesiintymisen.",
        "Tähän makuun tarvitaan sekä kuulokkeet että selityslomake.","Musiikkitauollasi on parempi dramaturgia kuin itse kokouksella."
    ]
};
const keef=["Love Sosa","I Don't Like","Faneto","Hate Bein' Sober","Earned It","Citgo","Save That Shit","Kobe","I Don't Know Dem","Macaroni Time"];
async function troll(i,kind) {
    if(kind==="keef") {
        const title=choose(keef);
        const results=await require("../lahteet").haeKappaleet(`Chief Keef ${title}`,{asetukset:require("../config").asetukset(),hakulahde:"youtube"})
            .catch(()=>null);
        const normalize=value=>String(value ?? "").toLowerCase().replace(/[^a-z0-9 ]/g,"").trim();
        const exact=normalize(title);
        const candidate=results?.kappaleet.find(k=>/chief\s*keef/i.test(k.artisti??"") &&
            ` ${normalize(k.otsikko)} `.includes(` ${exact} `) && !/cover|remix|instrumental/i.test(k.otsikko));
        if(!candidate) throw new Notice("Chief Keefin kappaletta ei löytynyt luotettavasti. Kokeile uudelleen.");
        return library.enqueue(i,[candidate]);
    }
    if(kind==="banger") {
        const candidates=await db.all(`SELECT track FROM music_listens WHERE guild=? GROUP BY url ORDER BY count(DISTINCT user) DESC,
            sum(milliseconds) DESC LIMIT 10`,[i.guildId]);
        if(!candidates.length) throw new Notice("Palvelimella ei ole vielä kuunneltuja kappaleita.");
        return library.enqueue(i,[JSON.parse(choose(candidates).track)]);
    }
    const user=i.options.getUser("kayttaja") ?? i.user;
    const history=await store.history(i.guildId,user.id,0);
    if(!history.length) return view("Komitean musiikkiarkisto","Arkistossa ei ole vielä kuuntelutietoja.");
    const song=JSON.parse(history[0].track);
    if(kind==="biisivero") {
        const [[total]]=await store.wrapped(i.guildId,user.id,"kaikki");
        return view("Kuvitteellinen biisivero",`<@${user.id}> · ${total?.plays ?? 0} kuuntelua · ${Math.ceil((total?.ms ?? 0)/60_000)} kuvitteellista verominuuttia.\n${choose(jokes[kind])}`);
    }
    return view(kind==="musaroast"?"Musiikkimaun roast":"Musiikkirikostuomio",`<@${user.id}> · Viimeksi kuunneltu: ${UI.nimi(song)}.\n${choose(jokes[kind])}`);
}
module.exports={roulette,handle,start,taste,troll};
