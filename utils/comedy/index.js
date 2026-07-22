const { generoiRikoslause, generoiRikoslauseet, generoiPelkkaRikos, paivanRikos } = require("./generators/crimeGenerator");
const { generoiRatsiaSaalis, generoiTakavarikko } = require("./generators/objectGenerator");
const { generoiTekosyy } = require("./generators/excuseGenerator");
const { generoiTiedote, generoiPaatos, paivanPaatos } = require("./generators/announcementGenerator");
const { generoiPsykoanalyysi } = require("./generators/psychoGenerator");
const { generoiKamerat } = require("./generators/cameraGenerator");
const { generoiKuulustelu } = require("./generators/interrogationGenerator");
const { generoiTodiste } = require("./generators/evidenceGenerator");
const { generoiSyyte } = require("./generators/prosecutionGenerator");
const { generoiLasku } = require("./generators/invoiceGenerator");
const { generoiFeikkisakko } = require("./generators/fineGenerator");
const { generoiRikosrekisteri } = require("./generators/criminalRecordGenerator");
const { generoiVuodenRikollinen } = require("./generators/criminalOfYearGenerator");

module.exports = {
    generoiRikoslause,
    generoiRikoslauseet,
    generoiPelkkaRikos,
    paivanRikos,
    generoiRatsiaSaalis,
    generoiTakavarikko,
    generoiTekosyy,
    generoiTiedote,
    generoiPaatos,
    paivanPaatos,
    generoiPsykoanalyysi,
    generoiKamerat,
    generoiKuulustelu,
    generoiTodiste,
    generoiSyyte,
    generoiLasku,
    generoiFeikkisakko,
    generoiRikosrekisteri,
    generoiVuodenRikollinen
};
