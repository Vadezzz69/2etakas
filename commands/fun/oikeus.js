const { luoRyhmakomento } = require("../../utils/ryhmakomento");

module.exports = luoRyhmakomento({
    nimi: "oikeus",
    kuvaus: "Komitean oikeusosaston komennot.",
    alikomennot: {
        syyte:   { jasen: require("./syyte") },
        todiste: { jasen: require("./todiste") },
        lasku:   { jasen: require("./lasku") }
    }
});
