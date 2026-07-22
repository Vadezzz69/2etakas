const { run, get, all } = require("./db");

/**
 * Avainsanat tallennetaan ja haetaan aina pienaakkosin, jotta "!Housu" ja
 * "!housu" osoittavat samaan komentoon.
 */
function normalisoiAvainsana(avainsana) {
    return avainsana.trim().toLowerCase();
}

/**
 * Lisää uuden mukautetun komennon. Palauttaa false eikä tee mitään, jos
 * samanniminen komento on jo olemassa tällä palvelimella — olemassa olevaa
 * komentoa ei koskaan ylikirjoiteta tämän funktion kautta.
 */
async function lisaaMukautettuKomento(guildId, avainsana, vastaus, luoja) {
    const normalisoitu = normalisoiAvainsana(avainsana);

    const olemassa = await haeMukautettuKomento(guildId, normalisoitu);
    if (olemassa) return false;

    await run(
        `INSERT INTO custom_commands (guildId, keyword, response, createdBy, timestamp) VALUES (?, ?, ?, ?, ?)`,
        [guildId, normalisoitu, vastaus, luoja, Date.now()]
    );

    return true;
}

async function haeMukautettuKomento(guildId, avainsana) {
    return get(
        `SELECT * FROM custom_commands WHERE guildId = ? AND keyword = ?`,
        [guildId, normalisoiAvainsana(avainsana)]
    );
}

async function poistaMukautettuKomento(guildId, avainsana) {
    const tulos = await run(
        `DELETE FROM custom_commands WHERE guildId = ? AND keyword = ?`,
        [guildId, normalisoiAvainsana(avainsana)]
    );
    return tulos.changes > 0;
}

async function haeKaikkiMukautetutKomennot(guildId) {
    return all(
        `SELECT * FROM custom_commands WHERE guildId = ? ORDER BY keyword ASC`,
        [guildId]
    );
}

const LISAYS_ETULIITE = "!add ";

/**
 * Jäsentää "!add !avainsana = vastaus" -muotoisen viestin.
 * Palauttaa { keyword, response } tai null jos muoto ei täsmää.
 * Puhdas funktio — ei tietokantaa, helppo testata erikseen.
 */
function jasennaLisayskomento(sisalto) {
    if (!sisalto.toLowerCase().startsWith(LISAYS_ETULIITE)) return null;

    const loppuosa = sisalto.slice(LISAYS_ETULIITE.length);
    const yhtasuuriIndeksi = loppuosa.indexOf("=");
    if (yhtasuuriIndeksi === -1) return null;

    let avainOsa = loppuosa.slice(0, yhtasuuriIndeksi).trim();
    const vastaus = loppuosa.slice(yhtasuuriIndeksi + 1).trim();

    if (avainOsa.startsWith("!")) avainOsa = avainOsa.slice(1);

    if (!avainOsa || !vastaus) return null;
    if (avainOsa.includes(" ")) return null; // avainsana ei saa sisältää välilyöntejä

    return { keyword: avainOsa, response: vastaus };
}

module.exports = {
    lisaaMukautettuKomento,
    haeMukautettuKomento,
    poistaMukautettuKomento,
    haeKaikkiMukautetutKomennot,
    normalisoiAvainsana,
    jasennaLisayskomento
};
