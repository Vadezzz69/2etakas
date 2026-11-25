const { ButtonStyle }=require("discord.js");
const { view,button,row,failure,Notice,privateReply }=require("../community");
const { palkki }=require("../tyyli");
const { skills,labels }=require("./combat");
const battles=require("./battles");

function duel(record) {
    const data=JSON.parse(record.data);
    const key=(action,label,style,disabled)=>button(`kc:duel:${record.id}:${record.rev}:${action}`,label,style,disabled);
    const components=[];
    let title="Komitea Cards · Servumatsi";
    let status="";
    if(record.state==="pending") {
        title="Tuuks ykköst servul?";
        status=`<@${record.p1}> haastaa käyttäjän <@${record.p2}>. Hyväksy haaste ennen <t:${Math.floor(record.expires/1000)}:t>.`;
        components.push(row(key("accept","Tuun",ButtonStyle.Primary),key("decline","En tuu",ButtonStyle.Secondary)));
    } else if(record.state==="playing"){
        const p=data.players[data.turn];
        status=`Kierros ${1+Math.floor(data.step/2)} · <@${p.user}> on vuorossa.`;
        components.push(row(key("attack",skills.attack,ButtonStyle.Primary),key("special",p.card.ability,ButtonStyle.Primary,p.cooldown>0),
            key("defend",skills.defend,ButtonStyle.Secondary),key("heal",skills.heal,ButtonStyle.Secondary,p.hp===p.card.hp)));
        components.push(row(key("burst",skills.burst,ButtonStyle.Secondary,p.card.level<(p.card.burstLevel ?? 10)||p.cooldown>0),key("retreat",skills.retreat,ButtonStyle.Danger)));
    } else {
        status=record.state==="finished"?(record.winner?`GG. Voittaja <@${record.winner}> · ${record.ranked?"sijoituspalkinto kirjattu":"harjoitusottelu"}`:"Tasapeli. Kumpikaan ei saanu klippiä."):
            record.state==="declined"?"Haaste peruutettiin. Lobby jäi tyhjäks.":"Taistelu vanheni. Kaikki oli AFK.";
    }
    const fields=data.players.map(p=>({name:`Taso ${p.card.level} · ${p.card.name}`,
        value:`<@${p.user}> · ${p.card.element}\n${palkki(100*p.hp/p.card.hp,8)} ${p.hp}/${p.card.hp} HP\n${Object.keys(p.status).map(x=>labels[x]).concat(p.guard?["Puolustus"]:[],p.cooldown?[`Lataus ${p.cooldown}`]:[]).join(" · ")||"Valmis"}`,
        inline:true}));
    return view(title,[status,...data.events].join("\n"),components,{
        fields,
        ...(data.players[0].image ? { author:{name:"Haastaja",iconURL:data.players[0].image} } : {}),
        ...(data.players[1].image ? { thumbnail:data.players[1].image } : {})
    });
}

function publicDuel(record,i) {
    return Object.assign(duel(record),{afterReply:message=>message?.id ? battles.bind(record,i.channelId,message.id) : undefined});
}

async function interaction(i,id,rev,action) {
    await i.deferUpdate();
    try {
        const record=await battles.move(i.guildId,id,i.user.id,Number(rev),action);
        await i.editReply(duel(record));
        if(record.tournament && record.state==="finished") {
            const cups=require("./cups");
            await cups.sync(await cups.get(i.guildId,record.tournament)).catch(()=>{});
        }
    } catch(err) {
        if([10008,10062,40060].includes(Number(err.code))) return;
        const current = await battles.get(i.guildId,id).catch(()=>null);
        if (current && current.rev !== Number(rev) && [current.p1,current.p2].includes(i.user.id) &&
            current.message && current.message === i.message?.id) {
            await i.editReply(duel(current)).catch(()=>{});
        }
        const text=err instanceof Notice?err.message:"Siirtoa ei saatu käsiteltyä. Yritä uudelleen.";
        await i.followUp({...failure(text),...privateReply});
    }
}

module.exports={duel,publicDuel,interaction};
