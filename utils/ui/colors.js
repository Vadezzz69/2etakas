/**
 * UI-värien yhteinen lähde.
 *
 * Värit tulevat vanhasta tyyli-utilitystä, joten uuden UI-kerroksen
 * käyttöönotto ei muuta botin nykyistä ilmettä.
 */
const { VARIT } = require("../tyyli");

const COLORS = Object.freeze({
    default: VARIT.PERUS,
    accent: VARIT.AKSENTTI,
    success: VARIT.ONNISTUI,
    warning: VARIT.VAROITUS,
    muted: VARIT.HARMAA
});

module.exports = { COLORS };
