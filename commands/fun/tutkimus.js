const { luoRyhmakomento } = require("../../utils/ryhmakomento");

module.exports = luoRyhmakomento({
    nimi: "tutkimus",
    kuvaus: "Komitean tutkimusosaston komennot.",
    alikomennot: {
        ratsia:        { jasen: require("./ratsia") },
        takavarikko:   { jasen: require("./takavarikko") },
        kuulustelu:    { jasen: require("./kuulustelu") },
        rikosrekisteri:{ jasen: require("./rikosrekisteri") },
        kamerat:       { jasen: require("./kamerat") },
        psykoanalyysi: { jasen: require("./psykoanalyysi") }
    }
});
