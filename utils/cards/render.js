const { render,label }=require("../renderPng");
const { labels }=require("./combat");
const { rarities,passives }=require("./catalog");

async function avatar(canvas, address) {
    const url=new URL(address);
    if (url.protocol!=="https:" || !["cdn.discordapp.com","media.discordapp.net"].includes(url.hostname)) return null;
    const response=await fetch(url,{signal:AbortSignal.timeout(2500),redirect:"error"});
    if (!response.ok || Number(response.headers.get("content-length"))>512_000) return null;
    const chunks=[];
    let length=0;
    for await (const chunk of response.body) {
        length+=chunk.length;
        if (length>512_000) return null;
        chunks.push(chunk);
    }
    return canvas.loadImage(Buffer.concat(chunks));
}

function card(user,stats,edition=stats.edition) {
    const avatarUrl=user.displayAvatarURL?.({extension:"png",size:256});
    const name=String(user.globalName ?? user.username ?? "Komitean jäsen").slice(0,64);
    const key=JSON.stringify([stats.id,stats.xp,stats.equipped,avatarUrl,name,edition,stats.rarity,stats.color,stats.stage,stats.burstLevel]);
    let downloaded = !avatarUrl;
    return render(key,async canvas=>{
        const c=canvas.createCanvas(560,800);
        const ctx=c.getContext("2d");
        const rarity=rarities[stats.rarity];
        const color=stats.color ?? (stats.equipped==="kehys"?"#ffc468":rarity.color);
        const panel=ctx.createLinearGradient(0,0,560,800);
        panel.addColorStop(0,stats.equipped==="tausta"?"#153351":rarity.background);
        panel.addColorStop(1,"#080d18");
        ctx.fillStyle=panel;ctx.fillRect(0,0,560,800);
        ctx.strokeStyle=color;ctx.lineWidth=8;ctx.strokeRect(14,14,532,772);
        ctx.lineWidth=1;ctx.globalAlpha=0.34;
        for(let x=-220;x<740;x+=Math.max(14,35-stats.rarity*3)){
            ctx.beginPath();ctx.moveTo(x,38);ctx.lineTo(x+220,510);ctx.stroke();
        }
        if(stats.rarity>=3||stats.equipped==="holo"){
            const foil=ctx.createLinearGradient(20,40,520,390);
            foil.addColorStop(0,"#6affcf30");foil.addColorStop(.5,"#ff8cc680");foil.addColorStop(1,"#769aff20");
            ctx.fillStyle=foil;ctx.fillRect(25,28,510,360);
        }
        ctx.globalAlpha=1;
        label(ctx,"KOMITEA CARDS",40,61,480,20,color,true);
        label(ctx,name,40,108,480,35,"#fff",true);
        label(ctx,`${rarity.name.toUpperCase()} · ${stats.name} · ${stats.element}`,40,138,480,18,color,true);
        const img=avatarUrl?await avatar(canvas,avatarUrl).catch(()=>null):null;
        downloaded = !avatarUrl || Boolean(img);
        ctx.save();ctx.beginPath();ctx.arc(280,250,89,0,Math.PI*2);ctx.clip();
        ctx.fillStyle="#273559";ctx.fillRect(190,160,180,180);
        if(img) ctx.drawImage(img,190,160,180,180);
        else label(ctx,name.slice(0,2).toUpperCase(),232,270,110,52,color,true);
        ctx.restore();
        ctx.beginPath();ctx.arc(280,250,91,0,Math.PI*2);ctx.strokeStyle=color;ctx.lineWidth=3;ctx.stroke();
        label(ctx,`LV ${stats.level}  ·  ${stats.equipped==="titteli"?"Pykälämestari":stats.stage}`,40,378,480,24,"#fff",true);
        label(ctx,`${stats.xp} XP  /  ${stats.next} XP`,40,408,480,18,color);
        ctx.fillStyle="#293249";ctx.fillRect(40,424,480,7);
        ctx.fillStyle=color;ctx.fillRect(40,424,480*Math.min(1,stats.xp/stats.next),7);
        [[ "HP",stats.hp ],["HYÖKKÄYS",stats.attack],["PUOLUSTUS",stats.defense],["NOPEUS",stats.speed],["ONNI",stats.luck]].forEach(([n,v],i)=>{
            const x=40+98*i;
            ctx.fillStyle="#232d43";ctx.fillRect(x,451,88,65);
            label(ctx,n,x+5,469,80,11,color,true);label(ctx,v,x+5,501,80,23,"#fff",true);
        });
        label(ctx,"ERIKOISLIIKE",40,552,480,14,color,true);
        label(ctx,`${stats.ability} · ${labels[stats.move?.status] ?? "Isku"}`,40,581,480,22,"#fff",true);
        label(ctx,"PASSIIVINEN KYKY",40,617,480,14,color,true);
        label(ctx,`${stats.passive} · ${passives[stats.passiveId]}`,40,644,480,19,"#fff",true);
        label(ctx,stats.level>=stats.burstLevel?"Arkistomyrsky avattu":`Arkistomyrsky avautuu tasolla ${stats.burstLevel}`,40,679,480,17,color);
        label(ctx,stats.description,40,719,480,16);
        label(ctx,`PAINOS ${edition}  ·  #${stats.id}  ·  ARVO ${rarity.value}`,40,755,480,15,color,true);
        return c.encode("png");
    }, () => downloaded);
}

module.exports={card};
