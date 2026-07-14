// Tilastopohjaiset roast-linjat — valitaan käyttäjän oikean datan perusteella,
// ei täysin satunnaisesti. Pidetään absurdin humoristisina, ei aidosti ilkeinä.

const ROAST_VAHAN_VIESTEJA = [
    "Kohde on niin hiljainen, että komitea epäilee tekoälyä tai kadonnutta näppäimistöä.",
    "Aktiivisuustaso: haamu. Nähty profiilikuvasta, muttei koskaan viesteistä.",
    "Komitea harkitsee kateeliseksi julistamista puuttuvan osallistumisen vuoksi.",
    "Tämä tili on joko erittäin viisas tai unohtanut palvelimen olemassaolon kokonaan."
];

const ROAST_PALJON_VIESTEJA = [
    "Viestimäärä viittaa vakavaan riippuvuuteen tästä palvelimesta.",
    "Kohde on kirjaimellisesti palvelimen selkäranka. Tai sitten ei vain ole muuta tekemistä.",
    "Komitea suosittelee lyhyttä taukoa. Ehkä käy ulkona joskus.",
    "Tällä aktiivisuudella kohde ansaitsisi jo oman toimiston täältä ja eläkevakuutuksen."
];

const ROAST_PALJON_AANTA = [
    "Kohde asuu käytännössä äänikanavalla. Postiosoitekin pitäisi vaihtaa sinne.",
    "Äänikanava-aika viittaa siihen, ettei kohteella ole muuta elämää. Komitea ymmärtää täysin.",
    "Mikrofoni on luultavasti jo hitsautunut kiinni kohteen käteen tässä vaiheessa.",
    "Kohteen äänikanava-aika ylittää useimpien ihmisten unimäärän. Huolestuttavaa omistautumista."
];

const ROAST_EI_AANTA = [
    "Kohde ei ole koskaan käynyt äänikanavalla. Joko ujo tai erittäin ammattimainen agentti.",
    "Ääneton kohde. Komitea epäilee joko mykkyyttä tai vakavaa introverttiyttä.",
    "Nolla sekuntia äänikanavalla. Epäilyttävän täydellinen peittotarina."
];

const ROAST_YLEINEN = [
    "Komitea muistuttaa: kaikki tämä tallennetaan ja käytetään kohdetta vastaan myöhemmin.",
    "Tämä tieto säilyy arkistoissa ikuisesti. Onnittelut siitä.",
    "Uhkatasoarvio on korkeampi kuin komitea haluaisi julkisesti myöntää.",
    "Kohde on virallisesti merkitty komitean 'pidä silmällä' -listalle.",
    "Tarkkailu jatkuu toistaiseksi. Kohde ei tiennyt olevansa seurattu ennen tätä.",
    "Komitean arkistojen mukaan tämä ei ole ensimmäinen kerta kun kohteesta kysytään."
];

// Kun tutka käännetään takaisin komennon käyttäjään itseensä.
const ITSE_KAANNOS_KOMMENTIT = [
    "🔄 Yllätys! Komitea käänsi tutkan takaisin SINUUN. Ehkä kannattaisi katsoa peiliin ennen muiden tutkimista.",
    "🔄 Plot twist: tutkinnan kohteeksi valikoitui juuri sinä. Utelias kysyjä on usein syyllisin.",
    "🔄 Komitea päätti, ettei kukaan muu ole yhtä epäilyttävä kuin sinä juuri nyt.",
    "🔄 Miksi kyselet muista, kun oma tilastosi odottaa tutkintaa? Tässä se on, halusit tai et.",
    "🔄 Kohde vaihdettiin viime hetkellä. Komitea uskoo sinun ansaitsevan tämän enemmän.",
    "🔄 Ironista — juuri sinä kyselet tätä, kun sinulla on eniten selittämistä koko palvelimella."
];

function satunnainen(lista) {
    return lista[Math.floor(Math.random() * lista.length)];
}

function valitseRoast({ viestitYhteensa, aaniSekunnitYhteensa }) {
    const linjat = [];

    if (viestitYhteensa < 10) linjat.push(...ROAST_VAHAN_VIESTEJA);
    if (viestitYhteensa > 300) linjat.push(...ROAST_PALJON_VIESTEJA);

    if (aaniSekunnitYhteensa === 0) linjat.push(...ROAST_EI_AANTA);
    if (aaniSekunnitYhteensa > 3600 * 5) linjat.push(...ROAST_PALJON_AANTA);

    linjat.push(...ROAST_YLEINEN);

    return satunnainen(linjat);
}

module.exports = { valitseRoast, satunnainen, ITSE_KAANNOS_KOMMENTIT };
