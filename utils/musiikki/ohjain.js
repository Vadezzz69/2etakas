/**
 * Musiikkikomentojen yhteinen ennakkotarkistus: onko käyttäjä äänikanavalla,
 * toimiiko musiikkimoduuli ja onko soitin olemassa. Vastaa käyttäjälle itse
 * kun jokin ei täyty ja palauttaa silloin null.
 */

const { PermissionFlagsBits } = require("discord.js");
const { lataaAaniKirjasto } = require("./config");
const { haeSoitin, luoSoitin } = require("./soitin");
const { virhe } = require("./muotoilu");
const { liitaPaneeli } = require("./paneeli");
const session = require("./yhteiso/session");

function piilotettuVastaus(interaction, sisalto) {
    const vastaus = virhe(sisalto);
    return interaction.deferred || interaction.replied
        ? interaction.editReply(vastaus)
        : interaction.reply({ ...vastaus, ephemeral: true });
}

/**
 * Tarkistukset ennen /soita-komentoa (soitinta ei vielä luoda).
 * @returns {Promise<{ kanava: object, soitin: object|null } | null>}
 */
async function valmisteleSoitto(interaction) {
    if (!interaction.inGuild()) {
        await piilotettuVastaus(interaction, "Musiikki toimii vain palvelimilla.");
        return null;
    }

    const kirjasto = lataaAaniKirjasto();
    if (!kirjasto.ok) {
        await piilotettuVastaus(interaction, `🔇 ${kirjasto.syy} Ylläpito: katso README, kohta *Musiikki*.`);
        return null;
    }

    const kanava = interaction.member?.voice?.channel;
    if (!kanava) {
        await piilotettuVastaus(interaction, "Liity äänikanavalle ja käytä komentoa uudelleen.");
        return null;
    }

    // Kieltäydytään vain jos puute on varmasti tiedossa; jos botin omaa
    // jäsentietoa ei saada, yritetään liittyä ja liittymisvirhe käsitellään myöhemmin.
    const minaItse = interaction.guild.members.me;
    const oikeudet = minaItse ? kanava.permissionsFor(minaItse) : null;
    if (oikeudet && (!oikeudet.has(PermissionFlagsBits.Connect) || !oikeudet.has(PermissionFlagsBits.Speak))) {
        await piilotettuVastaus(interaction, `Botti tarvitsee yhdistämis- ja puheoikeudet kanavalla ${kanava}.`);
        return null;
    }

    const soitin = haeSoitin(interaction.guildId);

    // Toisella kanavalla oleva botti saa siirtyä vain jos se ei soita mitään.
    if (soitin && soitin.kanavaId && soitin.kanavaId !== kanava.id && (soitin.nyt || soitin.jono.length)) {
        await piilotettuVastaus(interaction, `Liity botin äänikanavalle <#${soitin.kanavaId}> käyttääksesi ohjaimia.`);
        return null;
    }

    return { kanava, soitin };
}

/**
 * Tarkistukset ohjauskomennoille (/ohita, /tauko, /lopeta ...). Pelkkä
 * katselu (/jono, /nyt) onnistuu myös ilman samaa äänikanavaa.
 * @returns {Promise<object|null>} soitin
 */
function kayttajanAaniKanavaId(interaction) {
    const cache = interaction.guild?.voiceStates?.cache;
    return cache ? cache.get(interaction.user.id)?.channelId : interaction.member?.voice?.channelId;
}

function samassaAaniKanavassa(interaction, soitin) {
    return Boolean(soitin.kanavaId && kayttajanAaniKanavaId(interaction) === soitin.kanavaId);
}

function saaOhjata(interaction, soitin) {
    if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return true;
    if (soitin.musiikkiAsetuksiaLadataan) return false;
    if (soitin.musiikkiAsetuksetPuuttuvat) {
        if (soitin.musiikkiAsetuksetUudelleen <= Date.now()) lataaSoittimenAsetukset(soitin);
        return false;
    }
    const role = soitin.musiikkiAsetukset?.dj;
    return !role || (Array.isArray(interaction.member?.roles) ? interaction.member.roles.includes(role) : interaction.member?.roles?.cache?.has(role));
}

async function valmisteleOhjaus(interaction, { vaatiiKanavan = true } = {}) {
    if (!interaction.inGuild()) {
        await piilotettuVastaus(interaction, "Musiikki toimii vain palvelimilla.");
        return null;
    }

    const soitin = haeSoitin(interaction.guildId);
    if (!soitin) {
        await piilotettuVastaus(interaction, "Musiikkia ei soi. Lisää kappale komennolla /soita.");
        return null;
    }

    if (vaatiiKanavan && !samassaAaniKanavassa(interaction, soitin)) {
        await piilotettuVastaus(interaction, `Liity botin äänikanavalle <#${soitin.kanavaId}> käyttääksesi ohjaimia.`);
        return null;
    }

    if (vaatiiKanavan && !saaOhjata(interaction,soitin)) {
        await piilotettuVastaus(interaction,"DJ-tila on käytössä. Pyydä DJ:tä ohjaamaan toistoa.");
        return null;
    }

    return soitin;
}

function lataaSoittimenAsetukset(soitin) {
    soitin.musiikkiAsetuksiaLadataan = true;
    soitin.musiikkiAsetuksetValmis = session.load(soitin.guildId).then(asetukset => {
        if (asetukset) {
            soitin.musiikkiAsetukset = { ...asetukset,...soitin.musiikkiAsetukset };
            soitin.musiikkiAsetuksetPuuttuvat = false;
        } else {
            soitin.musiikkiAsetuksetPuuttuvat = Boolean(process.env.D1_API_URL && process.env.D1_API_KEY);
            soitin.musiikkiAsetuksetUudelleen = Date.now() + 60_000;
        }
        soitin.musiikkiAsetuksiaLadataan = false;
    });
}

/**
 * Palauttaa palvelimen soittimen tai luo uuden. Soittimen automaattiset
 * ilmoitukset (nyt soi, virhe, poistuminen) menevät kanavalle jossa
 * /soita viimeksi käytettiin.
 */
function haeTaiLuoSoitin(guildId, guild) {
    const olemassa = haeSoitin(guildId);
    if (olemassa) return olemassa;

    let ilmoita;
    const soitin = luoSoitin(guildId, { ilmoita: tapahtuma => ilmoita(tapahtuma) });
    ilmoita = liitaPaneeli(soitin);
    session.attach(soitin,guild);
    lataaSoittimenAsetukset(soitin);
    return soitin;
}

module.exports = { saaOhjata, kayttajanAaniKanavaId, samassaAaniKanavassa, valmisteleSoitto, valmisteleOhjaus, haeTaiLuoSoitin };
