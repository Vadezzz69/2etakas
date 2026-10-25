const { satunnainen } = require("./satunnainen");

// Tilastopohjaiset roast-linjat — valitaan käyttäjän oikean datan perusteella,
// ei täysin satunnaisesti. Pidetään absurdin humoristisina, ei aidosti ilkeinä.

const ROAST_VAHAN_VIESTEJA = [
    "Kohde on niin hiljainen, että komitea epäilee tekoälyä tai kadonnutta näppäimistöä.",
    "Aktiivisuustaso: haamu. Nähty profiilikuvasta, muttei koskaan viesteistä.",
    "Komitea harkitsee kateeliseksi julistamista puuttuvan osallistumisen vuoksi.",
    "Tämä tili on joko erittäin viisas tai unohtanut palvelimen olemassaolon kokonaan.",
    "Viestimäärä on niin alhainen, että komitea epäilee kohteen olevan kuvitteellinen.",
    "Kohde on kirjoittanut vähemmän kuin kahvinkeittimen käyttöohje.",
    "Hiljaisuus on kultaa, mutta tämä on jo platinaa. Tai kuollutta.",
    "Komitea on alkanut seurata tätä tiliä kuin tosi-tv:tä, jossa ei tapahdu mitään.",
];

const ROAST_PALJON_VIESTEJA = [
    "Viestimäärä viittaa vakavaan riippuvuuteen tästä palvelimesta.",
    "Kohde on kirjaimellisesti palvelimen selkäranka. Tai sitten ei vain ole muuta tekemistä.",
    "Komitea suosittelee lyhyttä taukoa. Ehkä käy ulkona joskus.",
    "Tällä aktiivisuudella kohde ansaitsisi jo oman toimiston täältä ja eläkevakuutuksen.",
    "Kohde kirjoittaa niin paljon, että komitea harkitsee lisäpalkkaa arkistonhoitajalle.",
    "Viestimäärä on ylittänyt kaikki järkevät rajat ja jatkaa matkaa.",
    "Jos viestit olisivat rahaa, kohde olisi jo maksanut komitean sakot.",
    "Kohteen näppäimistö on pyytänyt siirtoa toiseen taloon.",
];

const ROAST_PALJON_AANTA = [
    "Kohde asuu käytännössä äänikanavalla. Postiosoitekin pitäisi vaihtaa sinne.",
    "Äänikanava-aika viittaa siihen, ettei kohteella ole muuta elämää. Komitea ymmärtää täysin.",
    "Mikrofoni on luultavasti jo hitsautunut kiinni kohteen käteen tässä vaiheessa.",
    "Kohteen äänikanava-aika ylittää useimpien ihmisten unimäärän. Huolestuttavaa omistautumista.",
    "Kohde oli äänikanavalla niin kauan, että komitea tarjosi jo vuokrasopimusta.",
    "Äänikanavan tuolit tuntevat kohteen etunimeltä.",
    "Tällä tuntimäärällä kohde olisi voinut oppia soittamaan sellon. Ei oppinut.",
    "Kohteen mikrofoni on paikalla jo ennen kuin kohde saapuu.",
];

const ROAST_EI_AANTA = [
    "Kohde ei ole koskaan käynyt äänikanavalla. Joko ujo tai erittäin ammattimainen agentti.",
    "Ääneton kohde. Komitea epäilee joko mykkyyttä tai vakavaa introverttiyttä.",
    "Nolla sekuntia äänikanavalla. Epäilyttävän täydellinen peittotarina.",
    "Kohde ei ole käynyt äänikanavalla. Komitea ei ole varma onko hän pelkuri vai viisas.",
    "Nolla minuuttia äänikanavalla. Joko erakko tai agentti. Molemmat kunnioitettavia.",
    "Äänikanavalla ei ole nähty. Komitea epäilee, että hän vain kuuntelee ovelta.",
    "Kohteen ääntä ei ole kuultu. Se on joko rauhoittava tai pelottava tieto.",
];

const ROAST_YLEINEN = [
    "Komitea muistuttaa: kaikki tämä tallennetaan ja käytetään kohdetta vastaan myöhemmin.",
    "Tämä tieto säilyy arkistoissa ikuisesti. Onnittelut siitä.",
    "Uhkatasoarvio on korkeampi kuin komitea haluaisi julkisesti myöntää.",
    "Kohde on virallisesti merkitty komitean 'pidä silmällä' -listalle.",
    "Tarkkailu jatkuu toistaiseksi. Kohde ei tiennyt olevansa seurattu ennen tätä.",
    "Komitean arkistojen mukaan tämä ei ole ensimmäinen kerta kun kohteesta kysytään.",
    "Komitea tallentaa kaiken. Silloinkin kun se ei kuulosta tallentamiselta.",
    "Kaikki on kirjattu, ja kirjaukset on kirjattu kirjauksiin.",
    "Komitean muistiinpanot kasvavat. Sinun kansiosi kasvaa nopeammin.",
    "Tämä tapaus saa oman kansion. Kansion nimi on häpeä.",
    "Komitea muistuttaa: ruutuaika on tilastoitu, eikä tilasto ole imarteleva.",
];

// Kun tutka käännetään takaisin komennon käyttäjään itseensä.
const ITSE_KAANNOS_KOMMENTIT = [
    "🔄 Yllätys! Komitea käänsi tutkan takaisin SINUUN. Ehkä kannattaisi katsoa peiliin ennen muiden tutkimista.",
    "🔄 Plot twist: tutkinnan kohteeksi valikoitui juuri sinä. Utelias kysyjä on usein syyllisin.",
    "🔄 Komitea päätti, ettei kukaan muu ole yhtä epäilyttävä kuin sinä juuri nyt.",
    "🔄 Miksi kyselet muista, kun oma tilastosi odottaa tutkintaa? Tässä se on, halusit tai et.",
    "🔄 Kohde vaihdettiin viime hetkellä. Komitea uskoo sinun ansaitsevan tämän enemmän.",
    "🔄 Ironista — juuri sinä kyselet tätä, kun sinulla on eniten selittämistä koko palvelimella.",
    "🔄 Tutka kääntyi. Syy: komitea huomasi, että katsoit liian innokkaasti.",
    "🔄 Käänsimme kohteen. Kohde on nyt sinä. Ilmoita kaikki valituksesi itsellesi.",
    "🔄 Komitea tarkisti taustat ja päätti, että tärkeämpi kohde istuu näppäimistön ääressä.",
    "🔄 Kysymys: kuka tarkkailee tarkkailijaa? Vastaus: me, ja se olet sinä.",
    "🔄 Komitea havaitsi ristiriidan ja ratkaisi sen osoittamalla sinua.",
    "🔄 Peruutus, kohde vaihdettu: syy \"mielenkiintoisempi\". Se olet sinä.",
    "🔄 Kohdetta ei voitu tavoittaa, joten otimme sinut. Hyödynnä tilaisuus.",
    "🔄 Salainen sääntö 17: kysyjä on aina myös kohde. Tämä oli sääntö 17.",
    "🔄 Yritys ohjata huomio muualle havaittiin ja torjuttiin. Huomio ohjattiin takaisin sinuun.",
    "🔄 Komitea ei ole kiinnostunut muista. Se on kiinnostunut sinusta. Aina.",
    "🔄 Oho. Tähtäin vaihtoi suuntaa. Katso peiliin, siellä se on.",
    "🔄 Kohdistus korjattu: kohteena sinä, tarkoituksena hauskuus, lopputuloksena pieni nolous.",
];

function valitseRoast({ viestitYhteensa, aaniSekunnitYhteensa }) {
    const linjat = [];

    if (viestitYhteensa < 10) linjat.push(...ROAST_VAHAN_VIESTEJA);
    if (viestitYhteensa > 300) linjat.push(...ROAST_PALJON_VIESTEJA);

    if (aaniSekunnitYhteensa === 0) linjat.push(...ROAST_EI_AANTA);
    if (aaniSekunnitYhteensa > 3600 * 5) linjat.push(...ROAST_PALJON_AANTA);

    linjat.push(...ROAST_YLEINEN);

    return satunnainen(linjat);
}

module.exports = { valitseRoast, ITSE_KAANNOS_KOMMENTIT };
