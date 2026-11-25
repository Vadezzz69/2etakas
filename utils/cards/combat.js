const { randomInt }=require("node:crypto");
const { advantage }=require("./catalog");

function fighter(user,profile,image) {
    const c=profile.stats;
    return { user,image,card:c,rating:profile.rating,hp:c.hp,status:{},guard:false,cooldown:0,damageDone:0 };
}

function start(players,rng=randomInt) {
    const initiative = p => p.card.speed+(p.card.passiveId==="initiative"?3:0)+rng(4);
    return { players,turn:initiative(players[0])>=initiative(players[1])?0:1,
        step:0,events:["Nyt mennää. Mikit kii."],winner:null,eloGain:0 };
}

const labels={palo:"Kärtsää",heikko:"Voimat narikassa",hidas:"Lagaa"};
const skills={attack:"Tökkää",special:"Erikoishyökkäys",burst:"Servun viimeinen braincell",defend:"Kädet ylös",heal:"Puhalla pipiin",retreat:"GG meen nukkuu"};

function move(data,action,rng=randomInt) {
    const next=structuredClone(data);
    const actor=next.players[next.turn];
    const target=next.players[1-next.turn];
    const log=[];
    next.healed = false;
    const note=(player,msg)=>log.push(`<@${player.user}> ${msg}`);
    if (action==="retreat") {
        note(actor,"laitto GG ja lähti lobbyyn.");
        next.winner=target.user;
    } else {
        if (!Object.hasOwn(skills, action)) throw new Error("Tuntematon siirto.");
        if (["special","burst"].includes(action) && actor.cooldown>0) throw new Error("Erikoisisku latautuu vielä. Oota vuoro.");
        const burstLevel = actor.card.burstLevel ?? 10;
        if (action==="burst" && actor.card.level<burstLevel) throw new Error(`${skills.burst} avautuu tasolla ${burstLevel}.`);
        const active={...actor.status};
        for(const key of Object.keys(actor.status)) if(--actor.status[key]<1) delete actor.status[key];
        if (active.palo) {
            actor.hp=Math.max(0,actor.hp-5);
            note(actor,"kärtsäs taas. −5 HP.");
        }
        if (actor.hp===0) next.winner=target.user;
        else {
            if (actor.card.passiveId==="regen") actor.hp=Math.min(actor.card.hp,actor.hp+2);
            if (action==="defend") {
                actor.guard=true;note(actor,"veti suojat päälle.");
            } else if (action==="heal") {
                if (actor.hp===actor.card.hp) throw new Error("Täydet HP:t jo. Säästä laastari.");
                actor.hp=Math.min(actor.card.hp,actor.hp+24);
                next.healed = true;
                note(actor,"puhals pipiin. Ensiapulaukku käytetty.");
            } else {
                const special=action==="special"?actor.card.move:action==="burst"?{power:1.35,status:"heikko"}:null;
                const ability=action==="special"?actor.card.ability:skills[action];
                const dodge=Math.max(0,Math.min(18,4+target.card.speed-actor.card.speed+
                    (target.card.passiveId==="dodge"?5:0)+(active.hidas?5:0)));
                const critical=Math.min(26,5+actor.card.luck+(actor.card.passiveId==="critical"?6:0));
                if(rng(100)<dodge) note(target,`väisti **${ability}**. Ei osunu.`);
                else {
                    const crit=rng(100)<critical;
                    const elemental=advantage(actor.card.element,target.card.element)?1.18:
                        advantage(target.card.element,actor.card.element)?0.88:1;
                    const damage=Math.max(4,Math.round((actor.card.attack*1.15-target.card.defense*.42+rng(5)-2)
                        *(special?.power??1)*elemental*(crit?1.45:1)*(target.guard?.52:1)
                        *(target.card.passiveId==="armor"?.91:1)*(active.heikko?.78:1)));
                    actor.damageDone=(actor.damageDone ?? 0)+Math.min(target.hp,damage);
                    target.hp=Math.max(0,target.hp-damage);
                    note(actor,`pisti menemään **${ability}** · ${damage} HP${crit?" (kriittinen, ihan clean)":""}.`);
                    if (special?.status) target.status[special.status]=2;
                    if (actor.card.passiveId==="drain") actor.hp=Math.min(actor.card.hp,actor.hp+2);
                    if (target.hp===0) next.winner=actor.user;
                }
                target.guard=false;
                if (special) actor.cooldown=action==="burst"?3:2;
            }
            if (!["special","burst"].includes(action)) actor.cooldown=Math.max(0,actor.cooldown-1);
        }
        next.step++;
        next.turn=1-next.turn;
        if (!next.winner && next.step>=60) {
            const a=next.players[0].hp/next.players[0].card.hp;
            const b=next.players[1].hp/next.players[1].card.hp;
            if(a!==b) next.winner=next.players[a>b?0:1].user;
            else next.draw=true;
        }
    }
    if (next.winner) {
        const winner=next.players.find(p=>p.user===next.winner);
        const loser=next.players.find(p=>p.user!==next.winner);
        next.eloGain=Math.max(1,Math.round(28*(1-1/(1+10**((loser.rating-winner.rating)/400)))));
    }
    next.events=[...next.events,...log].slice(-5);
    return next;
}

module.exports={fighter,start,move,labels,skills};
