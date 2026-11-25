const { render,label }=require("../renderPng");
const { labels, skills }=require("./combat");
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
        const ink = "#e6e0e2";
        const muted = "#aca2ac";
        const crimson = "#dd365e";
        const rule = "#37252f";
        const panel = ctx.createRadialGradient(381,244,15,370,248,400);
        panel.addColorStop(0,stats.equipped === "tausta" ? "#1f2638" : "#25111b");
        panel.addColorStop(0.62,"#100c12");
        panel.addColorStop(1,"#08070a");
        ctx.fillStyle = panel;
        ctx.fillRect(0,0,560,800);

        ctx.strokeStyle = rule;
        ctx.lineWidth = 1;
        ctx.strokeRect(20.5,20.5,519,759);
        ctx.strokeStyle = color;
        for (const [x,y,dx,dy] of [[20,20,1,1],[540,20,-1,1],[20,780,1,-1],[540,780,-1,-1]]) {
            ctx.beginPath();
            ctx.moveTo(x+dx*26,y);
            ctx.lineTo(x,y);
            ctx.lineTo(x,y+dy*26);
            ctx.stroke();
        }

        ctx.save();
        ctx.beginPath();
        ctx.rect(22,131,516,228);
        ctx.clip();
        ctx.strokeStyle = crimson;
        ctx.globalAlpha = 0.46;
        for (let i=0;i<5;i++) {
            ctx.beginPath();
            ctx.ellipse(281,242,118+i*24,30+i*10,-0.47,0.15*i,Math.PI*1.82+0.15*i);
            ctx.stroke();
        }
        ctx.globalAlpha = 0.22;
        for (let i=0;i<85;i++) {
            const x=24+(i*83)%510;
            const y=137+(i*53)%218;
            ctx.fillStyle = i%3===0 ? crimson : ink;
            ctx.fillRect(x,y,i%9===0?3:1,1);
        }
        if (stats.rarity>=3 || stats.equipped==="holo") {
            const foil=ctx.createLinearGradient(24,130,540,342);
            foil.addColorStop(0,"#88b8ff00");
            foil.addColorStop(0.55,"#bd75ff");
            foil.addColorStop(1,"#f988b700");
            ctx.globalAlpha=0.18;
            ctx.fillStyle=foil;
            ctx.fillRect(24,130,512,220);
        }
        ctx.restore();

        label(ctx,"KOMITEA / CARDS",42,55,350,12,muted,true);
        ctx.fillStyle=crimson;
        ctx.fillRect(42,68,25,2);
        label(ctx,name,42,102,476,27,ink,true);
        label(ctx,`${rarity.name.toUpperCase()}  /  ${stats.name}  /  ${stats.element}`,42,125,476,12,color);
        const img=avatarUrl?await avatar(canvas,avatarUrl).catch(()=>null):null;
        downloaded = !avatarUrl || Boolean(img);

        const portrait = new canvas.Path2D();
        portrait.moveTo(235,153);
        portrait.lineTo(347,153);
        portrait.lineTo(369,175);
        portrait.lineTo(369,320);
        portrait.lineTo(325,350);
        portrait.lineTo(212,350);
        portrait.lineTo(190,328);
        portrait.lineTo(190,183);
        portrait.closePath();
        ctx.save();
        ctx.clip(portrait);
        ctx.fillStyle="#231b26";
        ctx.fillRect(190,153,179,197);
        if (img) {
            const size=Math.min(img.width,img.height);
            ctx.drawImage(img,(img.width-size)/2,(img.height-size)/2,size,size,179,153,201,201);
        } else {
            label(ctx,name.slice(0,2).toUpperCase(),249,263,110,34,ink,true);
        }
        ctx.restore();
        ctx.strokeStyle=color;
        ctx.stroke(portrait);
        ctx.fillStyle=crimson;
        ctx.fillRect(42,353,53,2);
        ctx.fillStyle=rule;
        ctx.fillRect(95,353,423,1);

        label(ctx,`LV ${stats.level}  /  ${stats.equipped==="titteli"?"Pykälämestari":stats.stage}`,42,386,476,16,ink,true);
        label(ctx,`${stats.xp} / ${stats.next} XP`,42,411,476,12,muted);
        ctx.fillStyle=rule;
        ctx.fillRect(42,423,476,3);
        ctx.fillStyle=crimson;
        ctx.fillRect(42,423,476*Math.min(1,stats.xp/stats.next),3);

        [[ "HP",stats.hp ],["ISKU",stats.attack],["SUOJAT",stats.defense],["SPIDI",stats.speed],["RNG",stats.luck]].forEach(([n,v],i)=>{
            const x=42+96*i;
            ctx.fillStyle="#181117";
            ctx.fillRect(x,448,92,54);
            ctx.fillStyle=rule;
            ctx.fillRect(x,448,92,1);
            label(ctx,n,x+7,466,78,10,muted);
            label(ctx,v,x+7,491,78,18,ink,true);
        });

        label(ctx,"KUULUISIN TEMPPU",42,533,476,10,crimson,true);
        label(ctx,stats.ability,42,555,476,16,ink,true);
        label(ctx,labels[stats.move?.status] ?? "Isku",42,574,476,12,muted);
        label(ctx,"AUTOMAATTISESTI PÄÄLLÄ",42,605,476,10,crimson,true);
        label(ctx,stats.passive,42,627,476,16,ink,true);
        label(ctx,passives[stats.passiveId],42,646,476,12,muted);
        label(ctx,stats.level>=stats.burstLevel?`${skills.burst} avattu`:`${skills.burst} avautuu tasolla ${stats.burstLevel}`,42,674,476,12,muted);
        label(ctx,stats.description,42,709,476,13,ink);
        ctx.fillStyle=rule;
        ctx.fillRect(42,728,476,1);
        label(ctx,`DROP ${edition}  /  #${stats.id}  /  ARVO ${rarity.value}`,42,752,476,11,color);
        return c.encode("png");
    }, () => downloaded);
}

module.exports={card};
