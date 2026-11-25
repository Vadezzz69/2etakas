const assert = require("node:assert/strict");
const { test,after } = require("node:test");
const { DatabaseSync } = require("node:sqlite");
const { mkdtempSync,readFileSync,rmSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");
const { day,db } = require("../utils/community");
const profiles=require("../utils/cards/profile");
const economy=require("../utils/cards/economy");
const battles=require("../utils/cards/battles");
const combat=require("../utils/cards/combat");
const collection=require("../utils/cards/collection");
const { rarities }=require("../utils/cards/catalog");
const boss=require("../utils/cards/boss");
const cups=require("../utils/cards/cups");
const progress=require("../utils/cards/progression");
const music=require("../utils/musiikki/yhteiso/store");
const { persistentPanel,wrapped }=require("../utils/musiikki/yhteiso/library");
const renderer=require("../utils/cards/render");
const cardsUI=require("../utils/cards/ui");
const migration=readFileSync(join(__dirname,"../migrations/001-komitea.sql"),"utf8");
const root=mkdtempSync(join(tmpdir(),"komitea-d1-"));
const location=join(root,"local.sqlite");
let sqlite=new DatabaseSync(location);
sqlite.exec("CREATE TABLE voice_stats (guildId TEXT,userId TEXT,date TEXT,seconds INTEGER); INSERT INTO voice_stats VALUES('legacy','123','2024-01-01',42);");
sqlite.exec(migration);
Object.assign(db,{
    get:async (q,p=[])=>sqlite.prepare(q).get(...p),
    all:async (q,p=[])=>sqlite.prepare(q).all(...p),
    run:async (q,p=[])=>sqlite.prepare(q).run(...p),
    batch:async batch=>{
        sqlite.exec("BEGIN");
        try {
            const out=batch.map(({query,params})=>({results:sqlite.prepare(query).all(...params)}));
            sqlite.exec("COMMIT");
            return out;
        } catch(err) {
            sqlite.exec("ROLLBACK");
            throw err;
        }
    }
});
after(()=>{sqlite.close();rmSync(root,{recursive:true,force:true});});
const left={id:"111111111111111111",username:"Äänekäs ässä",bot:false,displayAvatarURL:()=>"https://example.invalid/avatar.png"};
const right={id:"222222222222222222",username:"Varjo",bot:false};
const third={id:"333333333333333333",username:"Agentti",bot:false};
const fourth={id:"444444444444444444",username:"Kaaos",bot:false};
const folks=[left,right,third,fourth];
const song={url:"https://www.youtube.com/watch?v=abcdefghijk",otsikko:"Testiraita",artisti:"DJ Testi",kesto:63,lahde:"YouTube",hakulahde:"youtube"};

async function seed(guild,user,event,coins,item=null,quantity=0) {
    await profiles.get(guild,user);
    const q=economy.ledger(guild,user,event,"Testitapahtuma",coins,0,item,quantity);
    await db.run(q.query,q.params);
}
async function balance(guild,user) { return (await profiles.get(guild,user)).coins; }
async function amount(guild,user,item) { return (await economy.inventory(guild,user)).find(r=>r.item===item)?.quantity ?? 0; }

test("migraatio on additiivinen, toistettava ja säilyttää vanhat tilastot",async()=>{
    sqlite.exec(migration);
    assert.equal((await db.get("SELECT seconds FROM voice_stats WHERE guildId='legacy'")).seconds,42);
    assert.ok((await db.all("PRAGMA integrity_check")).every(row=>Object.values(row)[0]==="ok"));
});

test("korttien harvinaisuusjakauma on tarkka ja kortti pysyy tietokannan uudelleenavauksessa",async()=>{
    const distribution=[0,0,0,0,0,0];
    for(let n=0;n<10000;n++) distribution[profiles.rarity(n)]++;
    assert.deepEqual(distribution,[5000,2500,1500,700,250,50]);
    const [a,b]=await Promise.all([profiles.get("persist",left.id),profiles.get("persist",left.id)]);
    assert.equal(a.card,b.card);
    sqlite.close();
    sqlite=new DatabaseSync(location);
    assert.equal((await profiles.get("persist",left.id)).card,a.card);
    assert.equal(a.stats.level,1);
    const description=profiles.describe(JSON.parse(a.card),50*49**2);
    assert.equal(description.level,50);
    assert.ok(description.attack-a.stats.attack<=4);
});

test("PNG-renderöinti tuottaa oikean kuvan ja käyttää rajattua jaettua välimuistia",async()=>{
    const p=await profiles.get("render",left.id);
    const player = { ...left, displayAvatarURL:undefined };
    const [png,again]=await Promise.all([renderer.card(player,p.stats),renderer.card(player,p.stats)]);
    assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
    assert.equal(png.readUInt32BE(16),560);
    assert.equal(png.readUInt32BE(20),800);
    assert.equal(png,again);
    assert.ok(png.length<1024*1024);
    for(let n=0;n<28;n++) await renderer.card(player,{...p.stats,id:`render-${n}`,rarity:n%6});
});

test("päiväpalkinto ja ostot ovat atomisia, saldo ei voi alittua",async()=>{
    const guild="money",user=left.id;
    const daily=await Promise.allSettled([economy.daily(guild,user),economy.daily(guild,user)]);
    assert.equal(daily.filter(r=>r.status==="fulfilled").length,1);
    assert.equal(await balance(guild,user),35);
    const buys=await Promise.allSettled([economy.buy(guild,user,"laastari","1"),economy.buy(guild,user,"laastari","2")]);
    assert.equal(buys.filter(r=>r.status==="fulfilled").length,1);
    assert.equal(await amount(guild,user,"laastari"),1);
    assert.equal(await balance(guild,user),11);
    await assert.rejects(economy.use(guild,user,"suoja","not-owned"),/inventaario/);
    await seed(guild,user,"test-item",100,"suoja",1);
    await economy.use(guild,user,"suoja","equip");
    assert.equal((await profiles.get(guild,user)).equipped,"suoja");
});

test("kertakäyttöinen pakka, lisälöytö ja kahden omistajan atominen vaihto",async()=>{
    const guild="collection", a=left.id,b=right.id;
    await seed(guild,a,"pack-a",0,"pakka",1);
    await seed(guild,b,"pack-b",0,"pakka",1);
    const first=await economy.open(guild,a,"a",["Fiktiivinen arkistonvartija"]);
    const second=await economy.open(guild,b,"b",[left.id]);
    assert.equal(first.draws.length,3);
    assert.equal(await amount(guild,a,first.bonus),1);
    await assert.rejects(economy.open(guild,a,"a",["Fiktiivinen"]),/pakkaa|Pakkaa/);
    const cardA=first.draws[0].id,cardB=second.draws[0].id;
    const event=await collection.offer(guild,a,b,cardA,cardB);
    await assert.rejects(collection.respond(guild,event.id,a,true),/ei kuulu/);
    const decisions=await Promise.allSettled([collection.respond(guild,event.id,b,true),collection.respond(guild,event.id,b,true)]);
    assert.equal(decisions.filter(r=>r.status==="fulfilled").length,1);
    assert.equal((await db.get("SELECT owner FROM cards_collection WHERE id=?",[cardA])).owner,b);
    assert.equal((await db.get("SELECT owner FROM cards_collection WHERE id=?",[cardB])).owner,a);
    assert.equal((await collection.owned(guild,a,null)).length,3);
    assert.equal((await profiles.get(guild,b)).stats.id===cardA,false);
});

test("erikoiskyky, puolustus, lataus ja elementit vaikuttavat siirtoon",async()=>{
    const base=profiles.generate(()=>0);
    const a=combat.fighter(left.id,{stats:profiles.describe({...base,classIndex:1}),rating:1000});
    const b=combat.fighter(right.id,{stats:profiles.describe({...base,classIndex:3}),rating:1000});
    const data={...combat.start([a,b],()=>0),turn:0};
    const deterministic=limit=>limit===100?99:2;
    const open=combat.move(data,"special",deterministic);
    assert.equal(open.turn,1);
    assert.equal(open.players[1].status.palo,2);
    assert.equal(open.players[0].cooldown,2);
    const guarded=combat.move({...data,players:[a,{...b,guard:true}]},"special",deterministic);
    assert.ok(guarded.players[1].hp>open.players[1].hp);
    assert.throws(()=>combat.move({...open,turn:0},"special",deterministic),/latautuu/);
    assert.throws(()=>combat.move(data,"burst",deterministic),/tasolla/);
});

test("PvP-hyväksyntä, lukot, vuorokilpa, palkinnot ja parifarmauksen esto",async()=>{
    const guild="duel";
    await assert.rejects(battles.create(guild,left,left),/pelaaja/);
    const challenge=await battles.create(guild,left,right);
    await assert.rejects(battles.create(guild,left,third),/jo taistelussa/);
    await assert.rejects(battles.move(guild,challenge.id,left.id,0,"accept"),/haastettu/);
    const accepted=await battles.move(guild,challenge.id,right.id,0,"accept");
    const user=JSON.parse(accepted.data).players[JSON.parse(accepted.data).turn].user;
    const simultaneous=await Promise.allSettled([
        battles.move(guild,challenge.id,user,accepted.rev,"attack",n=>n-1),
        battles.move(guild,challenge.id,user,accepted.rev,"attack",n=>n-1)
    ]);
    assert.equal(simultaneous.filter(r=>r.status==="fulfilled").length,1);
    let row=await battles.get(guild,challenge.id);
    for(let n=1;n<6;n++) {
        const data=JSON.parse(row.data);
        row=await battles.move(guild,row.id,data.players[data.turn].user,row.rev,"attack",n=>n-1);
    }
    const result=await battles.move(guild,row.id,right.id,row.rev,"retreat");
    assert.equal(result.winner,left.id);
    assert.equal(result.ranked,1);
    assert.equal(await balance(guild,left.id),25);
    assert.equal(await balance(guild,right.id),8);
    await assert.rejects(battles.move(guild,row.id,right.id,row.rev,"retreat"),/vanhentua/);
    sqlite.close();
    sqlite=new DatabaseSync(location);
    let rematch=await battles.create(guild,left,right);
    rematch=await battles.move(guild,rematch.id,right.id,0,"accept");
    for(let n=0;n<6;n++) {
        const d=JSON.parse(rematch.data);
        rematch=await battles.move(guild,rematch.id,d.players[d.turn].user,rematch.rev,"attack",n=>n-1);
    }
    assert.equal((await battles.move(guild,rematch.id,right.id,rematch.rev,"retreat")).ranked,0);
    assert.equal(await balance(guild,left.id),25);
    assert.equal((await progress.rank(guild,"kausi"))[0].user,left.id);
});

test("vanhentunut haaste vapauttaa lukot ilman palkintoa",async()=>{
    const guild="expired";
    const record=await battles.create(guild,left,right);
    await db.run("UPDATE cards_battles SET expires=0 WHERE id=?",[record.id]);
    await battles.expire(guild);
    assert.equal((await battles.get(guild,record.id)).state,"expired");
    assert.equal(await balance(guild,left.id),0);
    assert.equal((await battles.create(guild,left,third)).state,"pending");
});

test("pomotaistelu estää tuplaiskun ja jakaa palkinnot kerran osallistumisesta",async()=>{
    const guild="boss";
    const open=await boss.get(guild);
    const concurrent=await Promise.allSettled([boss.hit(guild,left.id,open.id),boss.hit(guild,left.id,open.id)]);
    assert.equal(concurrent.filter(r=>r.status==="fulfilled").length,1);
    await boss.hit(guild,right.id,open.id);
    await db.run("UPDATE cards_bosses SET hp=1 WHERE id=?",[open.id]);
    await boss.hit(guild,third.id,open.id);
    assert.equal((await boss.get(guild)).state,"finished");
    assert.ok(await balance(guild,left.id)>0);
    assert.ok(await balance(guild,right.id)>0);
    assert.equal(await balance(guild,third.id),0);
    const c=await balance(guild,left.id);
    await assert.rejects(boss.hit(guild,left.id,open.id),/voitettu/);
    assert.equal(await balance(guild,left.id),c);
});

test("turnauskaavio etenee finaaliin ja maksaa mestarille yhden palkinnon",async()=>{
    const guild="cup";
    let c=await cups.open(guild,left.id);
    for(const player of folks.slice(1)) c=await cups.join(guild,player.id,c.id);
    assert.equal(c.state,"playing");
    async function win(slot,winner) {
        const i={guildId:guild,user:winner,client:{users:{fetch:async id=>folks.find(p=>p.id===id)}}};
        const match=await cups.match(i,c.id,slot);
        await db.run("UPDATE cards_battles SET state='finished',winner=? WHERE id=?",[winner.id,match.id]);
        c=await cups.sync(await cups.get(guild,c.id));
    }
    await win(0,left);await win(1,third);await win(2,left);
    assert.equal(c.state,"finished");
    assert.equal(await balance(guild,left.id),120);
    await cups.sync(await cups.get(guild,c.id));
    assert.equal(await balance(guild,left.id),120);
});

test("musiikkihistoria, suosikit, käyttöoikeudet, Wrapped ja yhteistehtävä",async()=>{
    const guild="music",a=left.id,b=right.id;
    assert.equal(await music.favorite(guild,a,song),true);
    assert.equal((await music.favorites(guild,a)).length,1);
    assert.equal(await music.favorite(guild,a,song),false);
    assert.equal((await music.favorites(guild,a)).length,0);
    const id=await music.addPlaylist(guild,a,"Arkisto",false,[song,song]);
    assert.equal(await music.playlist(guild,b,id),undefined);
    await assert.rejects(music.editPlaylist(guild,b,id,"nimi","Väärä"),/omistus/);
    await music.editPlaylist(guild,a,id,"jako",null);
    await music.editPlaylist(guild,a,id,"poista",0);
    assert.equal(JSON.parse((await music.playlist(guild,b,id)).tracks).length,1);
    const heard=new Map([[a,{ms:650_000,session:"test"}]]);
    await music.listening(guild,"same",song,heard);
    await music.listening(guild,"same",song,heard);
    await music.activity(guild,a,2,1);
    const [[stats],artists,songs,sources,top,[longest],[activity]]=await music.wrapped(guild,a,"viikko");
    assert.equal(stats.ms,650_000);
    assert.equal(stats.plays,1);
    assert.equal(artists[0].name,song.artisti);
    assert.equal(songs[0].name,song.otsikko);
    assert.equal(sources[0].name,song.lahde);
    assert.equal(top[0].name,a);
    assert.equal(longest.ms,650_000);
    assert.equal(activity.queued,2);
    assert.equal((await music.history(guild,a))[0].plays,1);
    const png=await wrapped({guildId:guild,user:left},"viikko","oma",true);
    assert.equal(png.files[0].attachment.readUInt32BE(16),800);
    await music.setSetting(guild,"autoplay",1);
    assert.equal((await music.settings(guild)).autoplay,1);
    assert.equal((await progress.tasks(guild,a,true)).awarded,15);
    assert.equal((await progress.tasks(guild,a,true)).awarded,0);
});

test("kuuntelumittari huomioi liittymisen, poistumisen ja todelliset dekoodatut millisekunnit",async()=>{
    const {attach}=require("../utils/musiikki/yhteiso/session");
    const guildId="audience";
    const members=new Map([[left.id,{id:left.id,user:left,voice:{}}]]);
    const guild={channels:{cache:new Map([["voice",{members}]])}};
    const player={guildId,kanavaId:"voice",resurssi:{playbackDuration:0}};
    attach(player,guild);
    player.musiikkiToistoAlkoi(song);
    player.resurssi.playbackDuration=4000;
    members.delete(left.id);
    members.set(right.id,{id:right.id,user:right,voice:{}});
    player.musiikkiKuuntelijat();
    player.resurssi.playbackDuration=9000;
    player.musiikkiToistoLoppui();
    await new Promise(setImmediate);
    assert.equal((await music.history(guildId,left.id))[0].milliseconds,4000);
    assert.equal((await music.history(guildId,right.id))[0].milliseconds,5000);
    player.resurssi.playbackDuration=0;
    player.musiikkiToistoAlkoi(song);
    player.musiikkiToistoLoppui();
    assert.equal((await music.history(guildId,right.id))[0].plays,1);
});

test("paneelin tietokantaviite säilyy uudelleenkäynnistyksessä ja käyttää olemassa olevaa viestiä",async()=>{
    const {setupPanel}=require("../utils/community");
    let sent=0,edited=0;
    const message={id:"panel-1",edit:async()=>{edited++;}};
    const ch={id:"text",send:async()=>{sent++;return message;},isTextBased:()=>true,
        messages:{fetch:async id=>id===message.id?message:null}};
    const i={guildId:"panel",channelId:"text",channel:ch,memberPermissions:{has:()=>true},
        guild:{channels:{cache:new Map([["text",ch]])}}};
    await setupPanel(i,"music",persistentPanel());
    sqlite.close();
    sqlite=new DatabaseSync(location);
    await setupPanel(i,"music",persistentPanel());
    assert.equal(sent,1);assert.equal(edited,1);
});

test("pysyvien paneelien komponentit validoituvat ja kommentorekisterissä riittää tilaa",()=>{
    for(const panel of [persistentPanel(),cardsUI.panel()]) {
        assert.ok(panel.components.length<=5);
        for(const part of panel.components) {
            const row=part.toJSON();
            assert.ok(row.components.length<=5);
            assert.ok(row.components.every(c=>c.custom_id.length<=100));
        }
    }
    const {komennot,ongelmat}=require("../handlers/commandLoader").lataaKomennot();
    assert.equal(ongelmat.length,0);
    assert.ok(komennot.length<=100);
});

test("raportoi testiprosessin muistihuipun",()=>{
    console.log(`Prosessin muistihuippu: ${(process.resourceUsage().maxRSS/1024).toFixed(1)} MiB`);
    assert.ok(process.resourceUsage().maxRSS<512*1024);
});

test("viimeisen vuoron ensiapu veloitetaan ja varaton siirto peruuntuu",async()=>{
    const guild="terminal-heal";
    let r=await battles.create(guild,left,right);
    r=await battles.move(guild,r.id,right.id,0,"accept");
    const d=JSON.parse(r.data);
    d.turn=0;d.step=59;
    d.players[0].hp=40;d.players[1].hp=55;
    await db.run("UPDATE cards_battles SET data=? WHERE id=?",[JSON.stringify(d),r.id]);
    await assert.rejects(battles.move(guild,r.id,left.id,r.rev,"heal"),/ensiapulaukun/);
    assert.equal((await battles.get(guild,r.id)).rev,r.rev);
    await seed(guild,left.id,"medicine",0,"laastari",1);
    const ended=await battles.move(guild,r.id,left.id,r.rev,"heal");
    assert.equal(ended.winner,left.id);
    assert.equal(await amount(guild,left.id,"laastari"),0);
});

test("turnauspaikka, taistelu ja lukot joko syntyvät yhdessä tai peruuntuvat",async()=>{
    const guild="coupled-cup";
    let c=await cups.open(guild,left.id);
    for(const player of folks.slice(1)) c=await cups.join(guild,player.id,c.id);
    const ordinary=await battles.create(guild,left,right);
    const i={guildId:guild,user:left,client:{users:{fetch:async()=>right}}};
    await assert.rejects(cups.match(i,c.id,0),/jo taistelussa/);
    assert.equal(JSON.parse((await cups.get(guild,c.id)).data).rounds[0].battle,undefined);
    await battles.move(guild,ordinary.id,left.id,0,"decline");
    const competing=await Promise.allSettled([cups.match(i,c.id,0),cups.match(i,c.id,0)]);
    const success=competing.filter(r=>r.status==="fulfilled");
    assert.equal(success.length,1);
    assert.equal(JSON.parse((await cups.get(guild,c.id)).data).rounds[0].battle,success[0].value.id);
    assert.equal((await db.all("SELECT * FROM cards_duel_locks WHERE guild=?",[guild])).length,2);
});

test("väärällä vuorolla tai ulkopuolisena tehty siirto jättää vuoron muuttumatta",async()=>{
    const guild="duel-guard";
    let r=await battles.create(guild,left,right);
    r=await battles.move(guild,r.id,right.id,0,"accept");
    const data=JSON.parse(r.data);
    await assert.rejects(battles.move(guild,r.id,third.id,r.rev,"attack"),/pelaajille/);
    await assert.rejects(battles.move(guild,r.id,data.players[1-data.turn].user,r.rev,"attack"),/omaa vuoroasi/);
    assert.equal((await battles.get(guild,r.id)).rev,r.rev);
});

test("kaikkien erikoisliikkeiden tila ja lataus sekä Arkistomyrsky vaikuttavat peliin",()=>{
    const {classes}=require("../utils/cards/catalog");
    const base=profiles.generate(()=>0);
    const rng=n=>n-1;
    for (let c=0;c<classes.length;c++) {
        const leftCard=profiles.describe({...base,classIndex:c});
        const rightCard=profiles.describe({...base,classIndex:9});
        const a=combat.fighter(left.id,{stats:leftCard,rating:1000});
        const b=combat.fighter(right.id,{stats:rightCard,rating:1000});
        const data={...combat.start([a,b],rng),turn:0};
        const moved=combat.move(data,"special",rng);
        assert.equal(moved.players[1].status[leftCard.move.status],2,leftCard.ability);
        assert.equal(moved.players[0].cooldown,2,leftCard.ability);
        assert.ok(moved.players[1].hp<b.hp,leftCard.ability);
    }
    const a=combat.fighter(left.id,{stats:profiles.describe(base,50*15**2),rating:1000});
    const b=combat.fighter(right.id,{stats:profiles.describe(base),rating:1000});
    const result=combat.move({...combat.start([a,b],rng),turn:0},"burst",rng);
    assert.equal(result.players[0].cooldown,3);
    assert.equal(result.players[1].status.heikko,2);
});

test("Worker hylkää puuttuvan avainasetuksen ja tunnistamattoman pyynnön",async()=>{
    const workerFile=readFileSync(join(__dirname,"../d1-worker/src/index.js"),"utf8");
    const {default:worker}=await import("data:text/javascript;base64,"+Buffer.from(workerFile).toString("base64"));
    const request=()=>new Request("https://example.invalid/api/run",{method:"POST"});
    for (const apiKey of [undefined,"","  ","local-test"]) {
        const result=await worker.fetch(request(),{API_KEY:apiKey});
        assert.equal(result.status,401);
    }
});

test("DJ-oikeus odottaa asetuksia ja äänikanavatarkistus käyttää ajantasaista tilaa",()=>{
    const {saaOhjata,samassaAaniKanavassa}=require("../utils/musiikki/ohjain");
    const voiceStates=new Map();
    const i={user:left,member:{roles:["dj"],voice:{channelId:"voice"}},guild:{voiceStates:{cache:voiceStates}}};
    const s={kanavaId:"voice",musiikkiAsetuksiaLadataan:true,musiikkiAsetukset:{dj:"dj"}};
    assert.equal(saaOhjata(i,s),false);
    s.musiikkiAsetuksiaLadataan=false;
    assert.equal(saaOhjata(i,s),true);
    s.musiikkiAsetuksetPuuttuvat=true;
    s.musiikkiAsetuksetUudelleen=Date.now()+10_000;
    assert.equal(saaOhjata(i,s),false);
    assert.equal(saaOhjata({...i,memberPermissions:{has:()=>true}},s),true);
    assert.equal(samassaAaniKanavassa(i,s),false);
    voiceStates.set(left.id,{channelId:"voice"});
    assert.equal(samassaAaniKanavassa(i,s),true);
});


test("dashboard ilman asetusta palvelee vain juuripolun elossaolovastauksen",()=>{
    const {tokenSuojaus}=require("../dashboard/server");
    const before=process.env.DASHBOARD_TOKEN;
    const status=(path,headers={})=>{
        const res={status(n){this.statusCode=n;return this;},type(){return this;},send(){return this;},setHeader(){}};
        tokenSuojaus({path,method:"GET",query:{},headers,get(name){return headers[name];}},res,()=>{res.statusCode=204;});
        return res.statusCode;
    };
    try {
        delete process.env.DASHBOARD_TOKEN;
        assert.equal(status("/"),200);
        assert.equal(status("/api/guilds"),403);
        process.env.DASHBOARD_TOKEN="local-test-value";
        assert.equal(status("/api/guilds",{cookie:"dashboard_token=%ZZ"}),401);
        assert.equal(status("/api/guilds",{"x-dashboard-token":"local-test-value"}),204);
    } finally {
        if(before===undefined) delete process.env.DASHBOARD_TOKEN;
        else process.env.DASHBOARD_TOKEN=before;
    }
});

test("automaattitoisto hylkää lähdevaihdon, uusinnan ja tyhjän kanavan",async()=>{
    const {attach}=require("../utils/musiikki/yhteiso/session");
    const sources=require("../utils/musiikki/lahteet");
    const original=sources.haeKappaleet;
    const accepted={...song,url:"https://youtu.be/next",otsikko:"Seuraava"};
    const members=new Map();
    const guild={channels:{cache:new Map([["voice",{members}]])}};
    const queued=[];
    const player={guildId:"auto",kanavaId:"voice",musiikkiAsetukset:{autoplay:true},sarja:1,jono:[],lisaa:k=>queued.push(...k)};
    let calls=0;
    try {
        sources.haeKappaleet=async()=>{
            calls++;
            return {kappaleet:[{...song,url:"https://soundcloud.com/a/h",lahde:"SoundCloud",otsikko:"Toinen lähde"},song,accepted]};
        };
        attach(player,guild);
        player.musiikkiToistoAlkoi(song);
        await player.musiikkiAuto();
        assert.equal(calls,0);
        members.set(left.id,{id:left.id,user:left,voice:{}});
        await player.musiikkiAuto();
        assert.deepEqual(queued,[{...accepted,pyytaja:null}]);
    } finally { sources.haeKappaleet=original; }
});

test("tilapäinen avatarivirhe ei jää PNG-välimuistiin",async()=>{
    const {createCanvas}=require("@napi-rs/canvas");
    const source=createCanvas(16,16);
    const ctx=source.getContext("2d");
    ctx.fillStyle="#ff0000";ctx.fillRect(0,0,16,16);
    const avatar=await source.encode("png");
    const original=global.fetch;
    const p=await profiles.get("avatar-cache",left.id);
    const user={...left,displayAvatarURL:()=>"https://cdn.discordapp.com/embed/avatars/0.png"};
    let requests=0;
    global.fetch=async()=>++requests===1 ? new Response(null,{status:503}) : new Response(avatar);
    try {
        const fallback=await renderer.card(user,p.stats);
        const success=await renderer.card(user,p.stats);
        assert.notDeepEqual(fallback,success);
        assert.equal(await renderer.card(user,p.stats),success);
        assert.equal(requests,2);
    } finally { global.fetch=original; }
});
