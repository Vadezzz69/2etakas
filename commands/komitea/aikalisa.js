const { luoFeikkiKomento } = require("../../utils/feikkitoiminto");
const { FEIKKI_AIKALISA } = require("../../utils/comedy/data/viestit");

module.exports = luoFeikkiKomento({
    nimi: "aikalisa",
    kuvaus: "Antaa käyttäjälle \"aikalisän\". (Pelkkä trolli — ei tee oikeasti mitään.)",
    kohdeKuvaus: "Käyttäjä",
    syyKuvaus: "Syy",
    data: FEIKKI_AIKALISA,
    viiveMs: 2000,
    minuutit: true
});
