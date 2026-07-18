// Yhtenäinen tumma väripaletti koko botille — musta + veren punainen,
// minimalistinen "OPIUM"-henkinen ilme.

const VARIT = {
    PERUS: 0x0A0A0A,        // lähes musta - oletusväri infopohjaisille embedeille
    AKSENTTI: 0x8B0000,      // veren punainen - varoitukset, tuomiot, rangaistukset
    ONNISTUI: 0x1A1A1A,      // tumma harmaa - positiiviset/neutraalit tapahtumat
    VAROITUS: 0xB80F0A,      // hieman kirkkaampi punainen - moderointitoimet
    HARMAA: 0x2C2C2C         // vaihtoehtoinen neutraali tumma sävy
};

const BRANDI = {
    FOOTER_TEKSTI: "𝗞𝗢𝗠𝗜𝗧𝗘𝗔",
    FOOTER_ICON: "🖤"
};

/**
 * Piirtää yhtenäisen tyylisen progress barin täysillä/tyhjillä lohkoilla.
 * Tämä on koko projektin ainoa paikka joka tietää miltä "palkki" näyttää —
 * `utils/ui/format.js`:n `formatProgressBar` kutsuu tätä sen sijaan että
 * piirtäisi lohkot itse.
 *
 * @param {number} prosentti 0-100
 * @param {number} pituus lohkojen määrä (oletus 12)
 * @returns {string} esim. "████████░░░░"
 */
function palkki(prosentti, pituus = 12) {
    const p = Math.max(0, Math.min(100, prosentti));
    const tayta = Math.round((p / 100) * pituus);
    return "█".repeat(tayta) + "░".repeat(Math.max(0, pituus - tayta));
}

module.exports = { VARIT, BRANDI, palkki };
