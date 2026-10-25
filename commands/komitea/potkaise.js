const { luoFeikkiKomento } = require("../../utils/feikkitoiminto");
const { FEIKKI_POTKAISE } = require("../../utils/comedy/data/viestit");

module.exports = luoFeikkiKomento({
    nimi: "potkaise",
    kuvaus: "\"Potkaisee\" käyttäjän palvelimelta. (Pelkkä trolli — ei tee oikeasti mitään.)",
    kohdeKuvaus: "Potkaistava käyttäjä",
    syyKuvaus: "Syy potkulle",
    data: FEIKKI_POTKAISE,
    viiveMs: 2500
});
