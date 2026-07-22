// Etuliitteet joilla rikoslauseet aloitetaan. Yhdistettynä rikokset.js:n
// noin 60 merkintään tämä antaa jo yksin ~20 x 60 = 1200 erilaista
// yhdistelmää — ei tarvitse kirjoittaa satoja täysin uniikkeja lauseita
// käsin, ja poolit pysyvät helposti ylläpidettävinä.

const TODISTUSETULIITTEET = [
    "Pöytäkirjaan merkittiin, että epäilty",
    "Valvontakameran mukaan epäilty",
    "Todistajanlausunnon mukaan epäilty",
    "Naapurit vahvistavat, että epäilty",
    "Komitea havaitsi, että epäilty",
    "On virallisesti vahvistettu, että epäilty",
    "Silminnäkijän mukaan epäilty",
    "Arkistojen mukaan epäilty",
    "Tutkinnan yhteydessä selvisi, että epäilty",
    "Anonyymi vihje kertoo, että epäilty",
    "Kuulusteluissa kävi ilmi, että epäilty",
    "Tekninen tutkinta osoittaa, että epäilty",
    "Yleisesti tiedetään, että epäilty",
    "Ei kiistetä sitä tosiasiaa, että epäilty",
    "Komitean arkistojen mukaan epäilty",
    "Todistusaineisto vahvistaa, että epäilty",
    "Ilmoituksen tehnyt naapuri kertoo, että epäilty",
    "Sisäinen muistio paljastaa, että epäilty",
    "Havaintoraportin mukaan epäilty",
    "On dokumentoitu, että epäilty"
];

module.exports = { TODISTUSETULIITTEET };
