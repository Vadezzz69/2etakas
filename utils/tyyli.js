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

module.exports = { VARIT, BRANDI };
