const { MessageFlags } = require("discord.js");
const { haeSoitin, TOISTOTILAT } = require("./soitin");
const UI = require("./muotoilu");

function laheta(soitin, viesti) {
    return Promise.resolve().then(() => soitin.tekstikanava?.send(viesti)).catch(() => {});
}

function liitaPaneeli(soitin) {
    let viesti, ajastin, paivittaa, seuraavaPaivitys = 0;
    let avattu = false;
    let etenemisAjastin;
    let muutoksia = false;
    let virheita = 0;
    const esimerkit = [];
    let koosteAjastin, koosteViesti, koostePaivitys = Promise.resolve();
    let ilmoitettuVirheita = 0;

    function lahetaKooste() {
        clearTimeout(koosteAjastin);
        koosteAjastin = null;
        if (virheita === ilmoitettuVirheita) return;
        ilmoitettuVirheita = virheita;
        const nakyma = UI.virheKooste(virheita, esimerkit);
        koostePaivitys = koostePaivitys.then(async () => {
            if (koosteViesti?.edit) await koosteViesti.edit(nakyma);
            else if (!koosteViesti) koosteViesti = await laheta(soitin, nakyma) ?? true;
        }).catch(() => {});
    }

    function paivita() {
        muutoksia = true;
        if (paivittaa || ajastin || !avattu) return;
        const viive = Math.max(0, seuraavaPaivitys - Date.now());
        if (viive) {
            ajastin = setTimeout(() => {
                ajastin = null;
                paivita();
            }, viive);
            ajastin.unref();
            return;
        }

        muutoksia = false;
        seuraavaPaivitys = Date.now() + 1200;
        paivittaa = Promise.resolve().then(async () => {
            await soitin.musiikkiAsetuksetValmis;
            if (!viesti && soitin.musiikkiAsetukset?.persistentPanel) return;
            const nakyma = UI.soitinNakyma(soitin);
            try {
                if (viesti?.edit) await viesti.edit(nakyma);
                else if (!soitin.lopetettu) viesti = await soitin.tekstikanava?.send(nakyma);
            } catch (err) {
                const koodi = Number(err?.code);
                // Poistetun paneelin tilalle voidaan lähettää uusi seuraavalla tapahtumalla.
                if (koodi === 10008) viesti = null;
                if (koodi === 50001 || koodi === 50013) seuraavaPaivitys = Date.now() + 30_000;
            }
        }).finally(() => {
            paivittaa = null;
            if (muutoksia) paivita();
        });
        paivittaa.catch(() => {});
    }

    function kaynnistaEtenemispaivitykset() {
        if (etenemisAjastin) return;
        etenemisAjastin = setInterval(() => {
            if (viesti && soitin.soiNykyista && !soitin.nytTiedot().tauolla) paivita();
        }, 30_000);
        etenemisAjastin.unref();
    }

    soitin.paivitaPaneeli = paivita;
    soitin.paneeliViestiId = () => viesti?.id;
    return tapahtuma => {
        if (tapahtuma.tyyppi === "soi") {
            avattu = true;
            kaynnistaEtenemispaivitykset();
        }
        if (tapahtuma.tyyppi === "virhe") {
            if (tapahtuma.kappale.soittolista && !tapahtuma.listaEstetty) {
                virheita++;
                if (esimerkit.length < 3) esimerkit.push(tapahtuma);
                if (!koosteAjastin) {
                    koosteAjastin = setTimeout(lahetaKooste, 15_000);
                    koosteAjastin.unref();
                }
            } else {
                void laheta(soitin, UI.virhe(tapahtuma.viesti, tapahtuma.kappale, "Toisto epäonnistui"));
            }
        }
        if (tapahtuma.tyyppi === "suljettu") {
            clearInterval(etenemisAjastin);
            lahetaKooste();
        }
        paivita();
    };
}

function musiikkiPainike(interaction) {
    return interaction.isButton?.() && interaction.customId?.startsWith("musiikki:");
}

async function kasittelePainike(interaction) {
    const [, id, toiminto, arvo, tila] = interaction.customId.split(":");
    const soitin = haeSoitin(interaction.guildId);
    const ilmoita = viesti => interaction.reply({ ...UI.virhe(viesti), flags: MessageFlags.Ephemeral });
    if (!soitin || soitin.nakymaId !== id) {
        await interaction.deferUpdate();
        await interaction.editReply({ components: [] }).catch(() => {});
        await interaction.followUp({ ...UI.virhe("Painikkeet ovat vanhentuneet. Avaa uusi näkymä komennolla /nyt tai /jono."), flags: MessageFlags.Ephemeral });
        return;
    }

    if (toiminto === "jono") {
        await interaction.reply({ ...UI.jonoNakyma(soitin), flags: MessageFlags.Ephemeral });
        return;
    }
    if (toiminto === "sivu") {
        await interaction.update(UI.jonoNakyma(soitin, Number.parseInt(arvo, 10) || 0));
        return;
    }
    if (!["tauko", "ohita", "lopeta", "sekoita", "toisto"].includes(toiminto)) return;
    const { samassaAaniKanavassa, saaOhjata } = require("./ohjain");
    const samassaKanavassa = () => samassaAaniKanavassa(interaction, soitin);
    if (!samassaKanavassa()) {
        await ilmoita("Liity botin äänikanavalle käyttääksesi ohjaimia.");
        return;
    }

    if (!saaOhjata(interaction,soitin)) {
        await ilmoita("DJ-tila on käytössä. Pyydä DJ:tä ohjaamaan toistoa.");
        return;
    }
    await interaction.deferUpdate();
    if (haeSoitin(interaction.guildId) !== soitin || !samassaKanavassa() || !saaOhjata(interaction,soitin)) {
        await interaction.followUp({ ...UI.virhe("Soitin tai äänikanava vaihtui. Avaa näkymä uudelleen."), flags: MessageFlags.Ephemeral });
        return;
    }
    const samaKappale = Number(arvo) === soitin.sarja;
    if (toiminto === "tauko" && samaKappale && Number(tila) === Number(soitin.nytTiedot().tauolla)) soitin.tauko();
    if (toiminto === "ohita" && samaKappale && soitin.ohita()) {
        void require("./yhteiso/store").activity(interaction.guildId,interaction.user.id,0,1).catch(()=>{});
    }
    if (toiminto === "lopeta") soitin.lopeta();
    if (toiminto === "sekoita" && soitin.jono.length > 1) soitin.sekoita();
    if (toiminto === "toisto") {
        soitin.toisto(TOISTOTILAT[(TOISTOTILAT.indexOf(soitin.silmukka) + 1) % TOISTOTILAT.length]);
    }
    soitin.paivitaPaneeli?.();
    if (!soitin.paneeliViestiId?.() || interaction.message?.id !== soitin.paneeliViestiId()) {
        await interaction.editReply(UI.soitinNakyma(soitin));
    }
}

module.exports = { liitaPaneeli, musiikkiPainike, kasittelePainike };
