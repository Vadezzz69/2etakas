/**
 * Musiikkikomentojen yhteinen ennakkotarkistus: onko käyttäjä äänikanavalla,
 * toimiiko musiikkimoduuli ja onko soitin olemassa. Vastaa käyttäjälle itse
 * kun jokin ei täyty ja palauttaa silloin null.
 */

const { PermissionFlagsBits } = require("discord.js");
const { satunnainen } = require("../satunnainen");
const { lataaAaniKirjasto } = require("./config");
const { haeSoitin, luoSoitin } = require("./soitin");
const { ilmoitus } = require("./muotoilu");
const V = require("./viestit");

function piilotettuVastaus(interaction, sisalto) {
    return interaction.deferred || interaction.replied
        ? interaction.editReply({ content: sisalto, embeds: [], components: [] })
        : interaction.reply({ content: sisalto, ephemeral: true });
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
        await piilotettuVastaus(interaction, satunnainen(V.KANAVALLE_PAKKO));
        return null;
    }

    // Kieltäydytään vain jos puute on varmasti tiedossa; jos botin omaa
    // jäsentietoa ei saada, yritetään liittyä ja liittymisvirhe käsitellään myöhemmin.
    const minaItse = interaction.guild.members.me ?? await interaction.guild.members.fetchMe?.().catch(() => null);
    const oikeudet = minaItse ? kanava.permissionsFor(minaItse) : null;
    if (oikeudet && (!oikeudet.has(PermissionFlagsBits.Connect) || !oikeudet.has(PermissionFlagsBits.Speak))) {
        await piilotettuVastaus(interaction, V.tayta(satunnainen(V.EI_OIKEUKSIA_KANAVALLE), { kanava: `${kanava}` }));
        return null;
    }

    const soitin = haeSoitin(interaction.guildId);

    // Toisella kanavalla oleva botti saa siirtyä vain jos se ei soita mitään.
    if (soitin && soitin.kanavaId && soitin.kanavaId !== kanava.id && (soitin.nyt || soitin.jono.length)) {
        await piilotettuVastaus(interaction, V.tayta(satunnainen(V.TOISELLA_KANAVALLA), { kanava: `<#${soitin.kanavaId}>` }));
        return null;
    }

    return { kanava, soitin };
}

/**
 * Tarkistukset ohjauskomennoille (/ohita, /tauko, /lopeta ...). Pelkkä
 * katselu (/jono, /nyt) onnistuu myös ilman samaa äänikanavaa.
 * @returns {Promise<object|null>} soitin
 */
async function valmisteleOhjaus(interaction, { vaatiiKanavan = true } = {}) {
    if (!interaction.inGuild()) {
        await piilotettuVastaus(interaction, "Musiikki toimii vain palvelimilla.");
        return null;
    }

    const soitin = haeSoitin(interaction.guildId);
    if (!soitin) {
        await piilotettuVastaus(interaction, satunnainen(V.EI_SOI));
        return null;
    }

    if (vaatiiKanavan && interaction.member?.voice?.channelId !== soitin.kanavaId) {
        await piilotettuVastaus(interaction, V.tayta(satunnainen(V.TOISELLA_KANAVALLA), { kanava: `<#${soitin.kanavaId}>` }));
        return null;
    }

    return soitin;
}

/**
 * Palauttaa palvelimen soittimen tai luo uuden. Soittimen automaattiset
 * ilmoitukset (nyt soi, virhe, poistuminen) menevät kanavalle jossa
 * /soita viimeksi käytettiin.
 */
function haeTaiLuoSoitin(guildId) {
    const olemassa = haeSoitin(guildId);
    if (olemassa) return olemassa;

    const soitin = luoSoitin(guildId, {
        ilmoita: tapahtuma => {
            const viesti = ilmoitus(tapahtuma, soitin);
            if (!viesti) return;
            return soitin.tekstikanava?.send({ ...viesti, allowedMentions: { parse: [] } });
        }
    });

    return soitin;
}

module.exports = { valmisteleSoitto, valmisteleOhjaus, haeTaiLuoSoitin };
