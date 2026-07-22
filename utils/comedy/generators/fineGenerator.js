const { RIKOKSET } = require("../data/rikokset");
const { SAKKO_YKSIKOT, satunnaisVali } = require("../../komiteadata");
const { satunnainen, taytaLukuPaikanvaraaja } = require("./random");

/**
 * /sakota on tarkoituksella eri komento kuin /sakko: tämä ei kirjaudu
 * tietokantaan eikä vaikuta kenenkään syyllisyysprosenttiin — pelkkä
 * tulostettavan näköinen "lappu" hetken huviksi.
 */
function generoiFeikkisakko() {
    return {
        syy: taytaLukuPaikanvaraaja(satunnainen(RIKOKSET)),
        summa: satunnaisVali(1, 250),
        yksikko: satunnainen(SAKKO_YKSIKOT),
        asianumero: satunnaisVali(10000, 99999)
    };
}

module.exports = { generoiFeikkisakko };
