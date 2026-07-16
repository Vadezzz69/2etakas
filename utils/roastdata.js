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

// =====================================================
// LAAJA "AI-ROAST" — /roast-komentoa varten.
// Yhdistää useamman datapisteen yhtä aikaa yhdeksi
// moniosaiseksi, "tekoälyavusteiselta" vaikuttavalta roastilta.
// Rule-based, ei oikeaa LLM-kutsua — mutta rakennettu niin että
// jokainen kohde saa juuri omaan dataansa sopivan tuloksen.
// =====================================================

function laajaRoast({
    viestitYhteensa = 0,
    aaniSekunnitYhteensa = 0,
    komentojaYhteensa = 0,
    syyllisyysprosentti = 0,
    onEpailty = false,
    tuomioita = 0
}) {

    const havainnot = [];

    if (viestitYhteensa === 0) {
        havainnot.push("Kohde ei ole kirjoittanut yhtään viestiä koko historian aikana. Joko botti tai valistunut mykkä.");
    } else if (viestitYhteensa < 10) {
        havainnot.push(satunnainen(ROAST_VAHAN_VIESTEJA));
    } else if (viestitYhteensa > 300) {
        havainnot.push(satunnainen(ROAST_PALJON_VIESTEJA));
    }

    if (aaniSekunnitYhteensa === 0) {
        havainnot.push(satunnainen(ROAST_EI_AANTA));
    } else if (aaniSekunnitYhteensa > 3600 * 5) {
        havainnot.push(satunnainen(ROAST_PALJON_AANTA));
    }

    if (komentojaYhteensa > 100) {
        havainnot.push("Komentojen käyttömäärä viittaa siihen, ettei kohteella ole enää mitään elämää tämän botin ulkopuolella.");
    } else if (komentojaYhteensa === 0) {
        havainnot.push("Kohde ei ole koskaan käyttänyt yhtäkään komentoa. Epäilyttävän varovaista.");
    }

    if (syyllisyysprosentti > 70) {
        havainnot.push(`Syyllisyysprosentti ${syyllisyysprosentti}% on niin korkea, että komitea harkitsee jo oman selliosaston perustamista.`);
    } else if (syyllisyysprosentti === 0) {
        havainnot.push("Syyllisyysprosentti on tasan 0%. Joko täysin viaton, tai erittäin taitava peittelemään jälkensä.");
    }

    if (onEpailty) {
        havainnot.push("Kohde on jo valmiiksi komitean epäiltyjen listalla. Tämä ei tullut yllätyksenä kenellekään.");
    }

    if (tuomioita > 3) {
        havainnot.push(`${tuomioita} aiempaa tuomiota puhuu puolestaan — tämä ei ole ensikertalainen.`);
    }

    havainnot.push(...ROAST_YLEINEN.slice(0, 1).map(l => satunnainen(ROAST_YLEINEN)));

    // Poistetaan mahdolliset duplikaatit ja rajataan pituus siedettäväksi.
    return [...new Set(havainnot)].slice(0, 4);

}

module.exports = { valitseRoast, laajaRoast, satunnainen, ITSE_KAANNOS_KOMMENTIT };
