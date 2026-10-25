const { luoFeikkiKomento } = require("../../utils/feikkitoiminto");
const { FEIKKI_BANNAA } = require("../../utils/comedy/data/viestit");

module.exports = luoFeikkiKomento({
    nimi: "bannaa",
    kuvaus: "\"Bannaa\" käyttäjän palvelimelta. (Pelkkä trolli — ei tee oikeasti mitään.)",
    kohdeKuvaus: "Bannattava käyttäjä",
    syyKuvaus: "Syy bannille",
    data: FEIKKI_BANNAA,
    viiveMs: 3000
});
