const RANGAISTUKSET = [
    "Kahvinkeittäjän virka 24 tunniksi.",
    "Pakollinen 🤡-emoji jokaiseen viestiin seuraavan tunnin ajan.",
    "Nimimerkin eteen lisätään \"Komitean tarkkailussa\" viikon ajaksi.",
    "Velvollisuus vastata kaikkiin kysymyksiin vain emojeilla huomiseen asti.",
    "Pakollinen julkinen anteeksipyyntö koko palvelimelle.",
    "Mikin pito mykistettynä seuraavassa äänikanavassa 10 minuuttia (symbolinen).",
    "Roolin vaihto \"Komitean koekaniiniksi\" kolmeksi päiväksi.",
    "Kielto käyttää sanaa \"lol\" 24 tuntiin.",
    "Pakollinen ylistyslaulu botille seuraavassa viestissä.",
    "Määrätään palvelimen viralliseksi keksien vartijaksi.",
    "Menettää oikeuden valittaa mistään kolmeen tuntiin.",
    "Joutuu tunnustamaan julkisesti viimeisimmän kiusallisen hetkensä."
];

const SAKKO_YKSIKOT = [
    "komitea-kolikkoa",
    "pussia sipsejä",
    "litraa kahvia",
    "minuuttia julkista nolaamista",
    "vanhaa meemiä",
    "kappaletta hopeisia nappeja",
    "tuntia pakkosiivousta",
    "kertaa \"anteeksi\" sanomista ääneen"
];

const RIKOKSET = [
    "Liiallinen keksien syönti kokouksen aikana",
    "Mikrofonin unohtaminen auki 45 minuutiksi",
    "Spoilerin paljastaminen ilman varoitusta",
    "Salaisen operaation nimen vuotaminen väärään kanavaan",
    "Kieltäytyminen jakamasta viimeistä pizzapalaa",
    "Yritys nimetä itsensä komitean puheenjohtajaksi ilman lupaa",
    "Epäilyttävän hiljainen käytös kokouksen aikana",
    "Toistuva myöhästely äänikanavalta",
    "Kaavan luvaton muuttaminen ilman komitean hyväksyntää",
    "Liiallinen GIF-kuvien käyttö vakavassa keskustelussa"
];

const ONKO_KOMMENTIT_KYLLA = [
    "Todisteet viittaavat vahvasti tähän suuntaan.",
    "Komitea on samaa mieltä.",
    "Ei epäilystäkään.",
    "Silminnäkijät vahvistavat."
];

const ONKO_KOMMENTIT_EI = [
    "Ei todisteita löytynyt.",
    "Komitea kiistää tämän jyrkästi.",
    "Erittäin epätodennäköistä.",
    "Kaikki todisteet viittaavat päinvastaiseen."
];

function satunnainen(lista) {
    return lista[Math.floor(Math.random() * lista.length)];
}

function satunnaisVali(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
    RANGAISTUKSET,
    SAKKO_YKSIKOT,
    RIKOKSET,
    ONKO_KOMMENTIT_KYLLA,
    ONKO_KOMMENTIT_EI,
    satunnainen,
    satunnaisVali
};
