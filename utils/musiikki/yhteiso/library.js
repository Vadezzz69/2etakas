const { randomUUID } = require("node:crypto");
const { PermissionFlagsBits, ButtonStyle } = require("discord.js");
const { Notice, view, row, button, select, modal, execute, setupPanel } = require("../../community");
const UI = require("../muotoilu");
const store = require("./store");
const session = require("./session");
const { haeSoitin } = require("../soitin");
const { render, label } = require("../../renderPng");

const id = (...parts) => ["km", ...parts].join(":");
const btn = (action, labelText) => button(id(...action),labelText);
const listLabel = k => String(k.otsikko ?? "Tuntematon kappale").slice(0,100);
const duration = ms => UI.aika(Math.floor(ms/1000));
const choices = new Map();
const periods = { viikko:"7 päivää",kuukausi:"Tämä kuukausi",vuosi:"Tämä vuosi",kaikki:"Koko aika" };

async function enqueue(i,songs) {
    if (!songs.length) throw new Notice("Listalla ei ole kappaleita.");
    const { valmisteleSoitto, haeTaiLuoSoitin, samassaAaniKanavassa } = require("../ohjain");
    const ready = await valmisteleSoitto(i);
    if (!ready) return;
    const soitin = haeTaiLuoSoitin(i.guildId,i.guild);
    try { await soitin.yhdista(ready.kanava); }
    catch (err) { if (!soitin.nyt && !soitin.jono.length) soitin.lopeta(); throw err; }
    if (!samassaAaniKanavassa(i,soitin)) throw new Notice("Äänikanava vaihtui. Yritä uudelleen.");
    soitin.tekstikanava ??= i.channel;
    const result = soitin.lisaa(songs.map(k => ({ ...k,pyytaja:i.user.id })));
    void store.activity(i.guildId,i.user.id,result.lisatyt.length,0).catch(() => {});
    soitin.paivitaPaneeli?.();
    return UI.lisattyNakyma({ ...result,hylatty:0,lahde:songs[0].lahde,jonoPituus:soitin.jono.length+Number(Boolean(soitin.nyt)) },soitin);
}

function pages(action, offset, more) {
    return row(button(id(action,Math.max(0,offset-10)),"Edellinen",ButtonStyle.Secondary,offset===0),
        button(id(action,offset+10),"Seuraava",ButtonStyle.Secondary,!more));
}

async function listTracks(i, type, offset = 0) {
    const isFav = type === "fav";
    const items = await (isFav ? store.favorites(i.guildId,i.user.id,offset,11) : store.history(i.guildId,i.user.id,offset));
    const shown = items.slice(0,10);
    const songs = shown.map(x => JSON.parse(x.track));
    const components = [];
    if (songs.length) {
        const token=randomUUID().slice(0,12);
        if(choices.size>=200) choices.delete(choices.keys().next().value);
        choices.set(token,{guild:i.guildId,user:i.user.id,songs,expires:Date.now()+900_000});
        components.push(select(id("pick",token),"Valitse jonotettava kappale",
            songs.map((k,index) => ({ label:listLabel(k),value:String(index) }))));
    }
    if (offset || items.length > 10) components.push(pages(type,offset,items.length>10));
    if (isFav && songs.length) components.push(row(btn(["favall"],"Jonota kaikki"),btn(["favrandom"],"Satunnainen")));
    return view(isFav ? "Suosikit" : "Kuunteluhistoria", songs.map((k,index) => isFav
        ? `${offset+index+1}. ${UI.rivi(k)}`
        : `${offset+index+1}. ${UI.rivi(k)} · ${shown[index].plays} kertaa · <t:${Math.floor(shown[index].last/1000)}:d>`
    ).join("\n") || (isFav ? "Lisää suosikki soittimen sydänpainikkeella." : "Kuunteluhistoria on tyhjä."), components);
}

async function listPlaylists(i,offset=0) {
    const lists = await store.playlists(i.guildId,i.user.id,offset);
    const shown = lists.slice(0,10);
    const parts = [row(btn(["form","new"],"Uusi lista"),btn(["form","save"],"Tallenna nykyinen jono"))];
    if (shown.length) parts.push(select(id("list"),"Avaa soittolista",shown.map(p => ({
        label:p.name,value:p.id,description:`${p.total} kappaletta · ${p.shared ? "Palvelimen yhteinen" : "Yksityinen"}`
    }))));
    if (offset || lists.length > 10) parts.push(pages("lists",offset,lists.length > 10));
    return view("Soittolistat",shown.map(p => `**${UI.turvallinen(p.name)}** · ${p.total} kappaletta`).join("\n") ||
        "Luo oma lista tai tallenna nykyinen jono.",parts);
}

async function onePlaylist(i,listId,offset=0) {
    const p = await store.playlist(i.guildId,i.user.id,listId);
    if (!p) throw new Notice("Soittolistaa ei löydy tai se on yksityinen.");
    const tracks = JSON.parse(p.tracks);
    const parts = [row(btn(["queue",p.id],"Jonota lista"))];
    if (offset || tracks.length>10) parts.push(row(
        button(id("list",p.id,Math.max(0,offset-10)),"Edellinen",ButtonStyle.Secondary,offset===0),
        button(id("list",p.id,offset+10),"Seuraava",ButtonStyle.Secondary,offset+10>=tracks.length)));
    if (p.owner === i.user.id) parts.push(row(
        btn(["form","rename",p.id],"Nimeä"),btn(["form","add",p.id],"Lisää linkki"),
        btn(["form","remove",p.id],"Poista kappale"),btn(["share",p.id],p.shared ? "Muuta yksityiseksi" : "Jaa palvelimelle")));
    return view(p.name,tracks.slice(offset,offset+10).map((k,n) => `${offset+n+1}. ${UI.rivi(k)}`).join("\n") || "Lista on tyhjä.",parts,
        { footer:`${p.shared ? "Palvelimen yhteinen" : "Yksityinen"} · ${tracks.length} kappaletta` });
}

async function wrapped(i, period="kaikki", scope="oma", png=false, user=i.user) {
    const [[total],artists,songs,sources,users,[longest],[activity]] = await store.wrapped(i.guildId,scope==="palvelin" ? null : user.id,period);
    const sections = [
        ["Kuunteluaika",duration(total?.ms ?? 0)],["Soitettu",total?.plays ?? 0],["Eri artistia",total?.artists ?? 0],
        ["Pisin kuuntelu",duration(longest?.ms ?? 0)],["Jonotettu",activity?.queued ?? 0],["Ohitettu",activity?.skipped ?? 0],
        ["Kuunnelluin artisti",artists[0]?.name ?? "–"],["Kuunnelluin kappale",songs[0]?.name ?? "–"],
        ["Suosituin lähde",sources[0]?.name ?? "–"],...(scope==="palvelin" ? [["Aktiivisin kuuntelija",users[0] ? `<@${users[0].name}>` : "–"]] : [])
    ];
    const title = `Music Wrapped · ${scope==="palvelin" ? "Palvelin" : user.globalName ?? user.username}`;
    const result = view(title,periods[period] ?? periods.kaikki,[
        select(id("period",scope),"Valitse ajanjakso",Object.entries(periods).map(([value,label]) => ({label,value}))),
        row(btn(["wrapped",period,scope==="palvelin"?"oma":"palvelin"],scope==="palvelin"?"Omat tilastot":"Palvelimen tilastot"),
            btn(["png",period,scope],"PNG-kuva"))
    ],{ fields:sections.map(([name,value])=>({name,value:String(value).slice(0,150),inline:true})) });
    if (png) {
        const buffer = await render(null,async ({createCanvas}) => {
            const canvas = createCanvas(800,640);
            const ctx=canvas.getContext("2d");
            const bg=ctx.createLinearGradient(0,0,800,640);
            bg.addColorStop(0,"#181333"); bg.addColorStop(1,"#0c1a25");
            ctx.fillStyle=bg; ctx.fillRect(0,0,800,640);
            label(ctx,"KOMITEA MUSIC",40,57,700,22,"#c0a6ff",true);
            label(ctx,title,40,108,720,38,"#ffffff",true);
            label(ctx,periods[period],40,145,720,20);
            sections.forEach(([name,value],k) => {
                const x=40+(k%2)*370,y=182+Math.floor(k/2)*84;
                ctx.fillStyle="#ffffff15"; ctx.fillRect(x,y,350,70);
                label(ctx,name,x+14,y+23,322,15,"#c0a6ff");
                label(ctx,String(value).replace(/^<@(\d+)>$/,"Discord · $1"),x+14,y+53,322,24,"#fff",true);
            });
            return canvas.encode("png");
        });
        result.files=[{attachment:buffer,name:"komitea-wrapped.png"}];
    }
    return result;
}

function persistentPanel() {
    return view("Komitea Music","Hae kappale tai toista linkki. Oma kirjastosi ja soitin ovat yhden painalluksen päässä.",[
        row(btn(["form","haku"],"Hae musiikkia"),btn(["form","linkki"],"Toista linkistä"),btn(["now"],"Avaa soitin"),btn(["queueview"],"Jono")),
        row(btn(["fav",0],"Suosikit"),btn(["hist",0],"Historia"),btn(["lists",0],"Soittolistat"),btn(["wrapped","kaikki","oma"],"Tilastot")),
        row(btn(["form","volume"],"Äänenvoimakkuus"),btn(["autoplay"],"Autoplay"),btn(["skipvote"],"Äänestä ohitusta")),
        row(btn(["panelctl","tauko"],"Tauko / jatka"),btn(["panelctl","ohita"],"Seuraava"),btn(["panelctl","lopeta"],"Pysäytä"),
            btn(["panelctl","sekoita"],"Sekoita"),btn(["panelctl","toisto"],"Toistotila"))
    ]);
}

const forms = {
    haku:["Hae musiikkia","Kappale tai artisti",200],linkki:["Toista linkistä","Kappaleen tai soittolistan linkki",500],
    volume:["Äänenvoimakkuus","Voimakkuus 0–100",3],
    new:["Luo soittolista","Listan nimi",60],save:["Tallenna jono","Listan nimi",60],
    rename:["Nimeä soittolista","Uusi nimi",60],add:["Lisää kappale","Kappaleen julkinen linkki",500],remove:["Poista kappale","Kappaleen numero",3]
};

function current(i) {
    const s = haeSoitin(i.guildId);
    if (!s) throw new Notice("Soitin ei ole käynnissä. Lisää ensin kappale.");
    return s;
}

async function control(i, action, value, expected) {
    const s = current(i);
    const { samassaAaniKanavassa, saaOhjata } = require("../ohjain");
    if (!samassaAaniKanavassa(i,s)) throw new Notice("Liity botin äänikanavalle.");
    if (expected && (expected.s !== s || expected.sarja !== s.sarja)) throw new Notice("Kappale ehti vaihtua.");
    if (action !== "skipvote" && !saaOhjata(i,s)) throw new Notice("DJ-tila: vain DJ voi käyttää tätä ohjainta.");
    if (action === "autoplay") {
        const a=s.musiikkiAsetukset ?? {};
        const value = !a.autoplay;
        await store.setSetting(i.guildId,"autoplay",value?1:0);
        s.musiikkiAsetukset={...a,autoplay:value};
        session.invalidate(i.guildId);
        if (value && !s.nyt) void s.musiikkiAuto?.();
        return view("Autoplay",value ? "Käytössä." : "Pois käytöstä.");
    }
    if (action === "volume") {
        const parsed = Number(value);
        if (!/^\d{1,3}$/.test(value) || parsed<0 || parsed>100) throw new Notice("Anna kokonaisluku 0–100.");
        s.asetaVoimakkuus(parsed);
        s.paivitaPaneeli?.();
        return view("Äänenvoimakkuus",`${parsed} %`);
    }
    if (!s.nyt) throw new Notice("Ohitettavaa kappaletta ei ole.");
    const members=[...(i.guild.channels.cache.get(s.kanavaId)?.members?.values() ?? [])].filter(m=>!m.user?.bot);
    if (!s.ohitusAanestys || s.ohitusAanestys.sarja!==s.sarja) s.ohitusAanestys={sarja:s.sarja,aanet:new Set()};
    const votes=s.ohitusAanestys.aanet;
    votes.add(i.user.id);
    const audience = new Set(members.map(m=>m.id));
    const count=[...votes].filter(user=>audience.has(user)).length;
    const required=Math.max(1,Math.floor(audience.size/2)+1);
    if (count>=required) {
        s.ohita();
        s.paivitaPaneeli?.();
        void store.activity(i.guildId,i.user.id,0,1).catch(()=>{});
        return view("Kappale ohitettu",`Äänet ${count}/${required}.`);
    }
    return view("Ohitusäänestys",`Äänet ${count}/${required}.`);
}

async function handle(i) {
    const [ ,action,a,b ]=i.customId.split(":");
    if (action==="form") {
        const form=forms[a];
        if (!form) return;
        return i.showModal(modal(id("submit",a,b ?? ""),form[0],[["value",form[1],form[2]]]));
    }
    if (action==="submit" && ["haku","linkki"].includes(a)) {
        const value=i.fields.getTextInputValue("value");
        const url = a === "linkki" ? require("../lahteet").jasennaUrl(value) : null;
        if (a === "linkki" && !url) {
            return execute(i,()=>{throw new Notice("Anna kappaleen tai soittolistan linkki.");});
        }
        return require("../../../commands/musiikki/soita").execute(i,{ haku:url?.href ?? value });
    }
    const active=["panelctl","skipvote"].includes(action) ? haeSoitin(i.guildId) : null;
    const expected=active && { s:active, sarja:active.sarja, paused:active.nytTiedot().tauolla };
    return execute(i,async()=>{
        const value = i.values?.[0];
        if (action==="panelctl") {
            const s=current(i);
            const { samassaAaniKanavassa, saaOhjata } = require("../ohjain");
            if (!samassaAaniKanavassa(i,s) || !saaOhjata(i,s)) {
                throw new Notice("Liity botin äänikanavalle. DJ-tilassa tarvitset myös DJ-roolin.");
            }
            if (expected?.s!==s || expected.sarja!==s.sarja) throw new Notice("Kappale ehti vaihtua. Avaa ajantasainen soitin.");
            if (a==="tauko" && expected.paused!==s.nytTiedot().tauolla) return UI.soitinNakyma(s);
            if (a==="tauko" && !s.tauko()) throw new Notice("Kappaletta ei voi vielä tauottaa.");
            if (a==="ohita") {
                if (!s.ohita()) throw new Notice("Ohitettavaa kappaletta ei ole.");
                void store.activity(i.guildId,i.user.id,0,1).catch(()=>{});
            }
            if (a==="lopeta") s.lopeta();
            if (a==="sekoita") {
                if (s.jono.length<2) throw new Notice("Sekoittamiseen tarvitaan kaksi kappaletta jonossa.");
                s.sekoita();
            }
            if (a==="toisto") {
                const modes=require("../soitin").TOISTOTILAT;
                s.toisto(modes[(modes.indexOf(s.silmukka)+1)%modes.length]);
            }
            s.paivitaPaneeli?.();
            return UI.soitinNakyma(s);
        }
        const offset = x=>Math.max(0,Math.min(10000,Number(x)||0));
        if (action==="now" || action==="queueview") {
            const s=haeSoitin(i.guildId);
            return s && action==="now" ? UI.soitinNakyma(s) : UI.jonoNakyma(s);
        }
        if (action==="favorite") {
            const s=current(i);
            if (s.nakymaId!==a || s.sarja!==Number(b) || !s.nyt) throw new Notice("Kappale vaihtui. Käytä nykyisen kappaleen sydänpainiketta.");
            const added=await store.favorite(i.guildId,i.user.id,s.nyt);
            return view("Suosikit",added?"Kappale lisättiin suosikkeihin.":"Kappale poistettiin suosikeista.");
        }
        if (action==="fav" || action==="hist") return listTracks(i,action,offset(a));
        if (action==="pick") {
            const selection=choices.get(a);
            if (!selection || selection.expires<=Date.now() || selection.guild!==i.guildId || selection.user!==i.user.id) {
                throw new Notice("Valikko vanheni. Avaa suosikit tai historia uudelleen.");
            }
            const song=selection.songs[Number(value)];
            if (!song) throw new Notice("Kappaletta ei löydy.");
            return enqueue(i,[song]);
        }
        if (action==="favall" || action==="favrandom") {
            const songs=(await store.favorites(i.guildId,i.user.id)).map(x=>JSON.parse(x.track));
            const random=songs[Math.floor(Math.random()*songs.length)];
            return enqueue(i,action==="favrandom"?(random?[random]:[]):songs);
        }
        if (action==="lists") return listPlaylists(i,offset(a));
        if (action==="list") return onePlaylist(i,value ?? a,offset(b));
        if (action==="queue") {
            const p=await store.playlist(i.guildId,i.user.id,a);
            if (!p) throw new Notice("Soittolistaa ei löydy.");
            return enqueue(i,JSON.parse(p.tracks));
        }
        if (action==="share") {
            await store.editPlaylist(i.guildId,i.user.id,a,"jako");
            return onePlaylist(i,a);
        }
        if (["wrapped","png","period"].includes(action)) return wrapped(i,action==="period"?value:a,action==="period"?a:b,action==="png");
        if (action==="skipvote" && !expected) throw new Notice("Ohitettavaa kappaletta ei ollut äänestyshetkellä.");
        if (["autoplay","skipvote"].includes(action)) return control(i,action,null,expected);
        if (action==="submit") {
            const text=i.fields.getTextInputValue("value").trim();
            if (!text) throw new Notice("Kenttä ei voi olla tyhjä.");
            if (a==="volume") return control(i,a,text);
            if (["new","save"].includes(a)) {
                const s=a==="save"?current(i):null;
                const key=await store.addPlaylist(i.guildId,i.user.id,text.slice(0,60),false,s?[s.nyt,...s.jono].filter(Boolean):[]);
                return onePlaylist(i,key);
            }
            if (a==="remove" && (!/^\d{1,3}$/.test(text) || Number(text)<1)) throw new Notice("Anna poistettavan kappaleen numero.");
            if (a==="add") {
                if (!/^https?:\/\//i.test(text)) throw new Notice("Anna kappaleen julkinen linkki.");
                const s=require("../config").asetukset();
                const haku=await require("../lahteet").haeKappaleet(text,{ asetukset:s }).catch(err=>{throw new Notice(err.name==="MusiikkiVirhe"?err.message:"Linkkiä ei saatu avattua.");});
                const k=!haku.lista && store.track(haku.kappaleet[0] ?? {});
                if (!k) throw new Notice("Anna yhden toistokelpoisen kappaleen julkinen linkki.");
                await store.editPlaylist(i.guildId,i.user.id,b,"lisaa",k);
            } else if (a==="remove") await store.editPlaylist(i.guildId,i.user.id,b,"poista",Number(text)-1);
            else if (a==="rename") await store.editPlaylist(i.guildId,i.user.id,b,"nimi",text.slice(0,60));
            else throw new Notice("Tuntematon soittolistatoiminto.");
            return onePlaylist(i,b);
        }
        throw new Notice("Toiminto ei ole enää käytettävissä.");
    });
}

async function configure(i) {
    const action=i.options.getString("asetus");
    if (!action) {
        const response = await setupPanel(i,"music",persistentPanel());
        session.invalidate(i.guildId);
        const active = haeSoitin(i.guildId);
        if (active) active.musiikkiAsetukset={...active.musiikkiAsetukset,persistentPanel:true};
        return response;
    }
    if (!i.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) throw new Notice("Asetusten muuttamiseen tarvitaan palvelimen hallintaoikeus.");
    const role=i.options.getRole("rooli");
    const value=action==="dj"?(role?.id ?? null):(i.options.getBoolean("kaytossa")?1:0);
    await store.setSetting(i.guildId,action,value);
    session.invalidate(i.guildId);
    const s=haeSoitin(i.guildId);
    if (s) s.musiikkiAsetukset={...s.musiikkiAsetukset,[action]:value};
    const names={dj:"DJ-rooli",fair:"Reilu jono",autoplay:"Autoplay"};
    return view("Musiikkiasetus päivitetty",`${names[action]} · ${action==="dj"&&value?`<@&${value}>`:value?"Käytössä":"Pois käytöstä"}`);
}

module.exports={handle,configure,enqueue,listTracks,listPlaylists,wrapped,persistentPanel};
