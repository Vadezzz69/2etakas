// Todistajapooli. Sisältää sekä nimettyjä "vakiotodistajia" (jotka
// esiintyvät toistuvasti komitean pöytäkirjoissa, tuttuja hahmoja
// palvelimen omasta huumorista) että yleisiä anonyymejä todistajatyyppejä.
// Jaettu /syyte ja /kuulustelu -komentojen kesken.

const NIMETYT_TODISTAJAT = [
    "MasanGulli",
    "Maire",
    "Shellin juorukerho",
    "Booboo",
    "Mummot"
];

const YLEISET_TODISTAJAT = [
    "Anonyymi naapuri",
    "Ohikulkija joka ei halunnut nimeään julki",
    "Toinen komitean jäsen, joka ei muista yksityiskohtia",
    "Kassajonossa seissyt vieras henkilö",
    "Joku joka \"vain sattui olemaan paikalla\"",
    "Kahvikoneen ääressä seissyt työtoveri",
    "Naapurin kissa, epäluotettava mutta läsnä",
    "Ryhmächatissa hiljaa seurannut jäsen",
    "Bussipysäkillä odottanut silminnäkijä",
    "Joku joka kuuli asiasta \"luotettavalta taholta\"",
    "Aiempi epäilty, joka nyt todistaa muita vastaan",
    "Someen kuvan ladannut anonyymi käyttäjä",
    "Ravintolan tarjoilija, joka muisti tilauksen muttei tapahtumaa",
    "Naapuriston valvontakamera (ei virallisesti todistaja, mutta yritti)",
    "Joku joka väittää nähneensä \"kaiken\"",
    "Toimistotyöntekijä joka oli \"vain kahvitauolla\"",
    "Puiston penkillä istunut vanhus, ei liity Mummot-ryhmään",
    "Discordin #yleinen-kanavan hiljainen tarkkailija",
    "Joku joka muisti asian väärin mutta varmasti",
    "Kaupan kassajonossa seissyt silminnäkijä",
    "Ex-kumppani joka \"ei halua sekaantua, mutta silti kertoo kaiken\"",
    "Naapurin lapsi joka näki kaiken ikkunasta",
    "Bussikuski joka huomasi jotain epäilyttävää reitillä",
    "Joku joka oli paikalla \"ihan sattumalta\" kolmatta kertaa tällä viikolla",
    "Kirjaston hiljainen kulma, jolla oli yllättäen näkyvyys tapahtumapaikalle"
];

const TODISTAJAT = [...NIMETYT_TODISTAJAT, ...YLEISET_TODISTAJAT];

/** Lyhyt, vaihteleva "todistajan kommentti" jota generaattorit voivat liittää nimen perään. */
const TODISTAJAKOMMENTIT = [
    "kertoi nähneensä kaiken, muttei suostunut tarkentamaan.",
    "vahvisti tapahtuman, muttei muistanut yksityiskohtia.",
    "kieltäytyi kommentoimasta, mikä tulkittiin myöntämiseksi.",
    "antoi ristiriitaisen mutta vakuuttavan lausunnon.",
    "oli paikalla \"ihan sattumalta\".",
    "vaati nimettömyyttä, sai sen osittain.",
    "kertoi tarinan kolme kertaa, joka kerta hieman eri tavalla.",
    "vahvisti asian nyökkäämällä merkitsevästi.",
    "totesi vain: \"en ole yllättynyt\".",
    "kieltäytyi allekirjoittamasta lausuntoa, mutta seisoi sen takana suullisesti.",
    "kertoi kuulleensa asiasta \"luotettavalta taholta\".",
    "vahvisti tapahtuma-ajan, muttei paikkaa.",
    "totesi nähneensä \"jotain vastaavaa\" aiemminkin."
];

module.exports = { TODISTAJAT, NIMETYT_TODISTAJAT, YLEISET_TODISTAJAT, TODISTAJAKOMMENTIT };
