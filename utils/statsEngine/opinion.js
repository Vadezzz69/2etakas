const { satunnainen } = require("../satunnainen");

/**
 * A short "verdict" sentence describing the combination of risk and
 * activity — distinct from `summary` (a data recap) and from the Roast
 * Engine's paragraph (which explains *why*). This is the Committee's
 * one-line bottom-line opinion.
 *
 * The combination (risk|activity) fully decides the *meaning*; each
 * combination has a few interchangeable wordings so repeated lookups for
 * the same member do not read identically.
 */
const OPINIONS = {
    "high|high": [
        "Komitea seuraa tilannetta tiiviisti ja suosittelee lisätoimia.",
        "Komitea on asettunut tarkkailupisteeseen ja tilannut pizzaa pitkää iltaa varten.",
        "Tämä on komitean mielestä jo harrastus, ja siksi lisätoimet ovat paikallaan."
    ],
    "high|moderate": [
        "Komitea on huolissaan, vaikka aktiivisuus vaikuttaa muuten tavanomaiselta.",
        "Riskitaso on korkea, vaikka kohde esittää olevansa täysin tavallinen. Se on jo epäilyttävää.",
        "Pinta on rauhallinen, pohja ei. Komitea on huolissaan."
    ],
    "high|low": [
        "Komitea pitää riskitasoa korkeana huolimatta vähäisestä näkyvästä aktiivisuudesta.",
        "Vähän näkyvyyttä, paljon merkintöjä. Komitea katsoo tätä kulmakarvat koholla.",
        "Kohde ei näy, mutta pöytäkirjassa kyllä. Se on pahin yhdistelmä."
    ],
    "high|inactive": [
        "Komitea pitää hiljaisuutta itsessään epäilyttävänä tässä tapauksessa.",
        "Ei aktiivisuutta, paljon merkintöjä. Komitea epäilee piilottelua.",
        "Hiljaisuus on korkean riskin kanssa kuin kahvi ilman maitoa: pelottavan suora."
    ],
    "medium|high": [
        "Komitea kirjaa aktiivisen mutta tarkkailua vaativan jäsenen.",
        "Aktiivinen ja seurattava: komitea nyökkää hyväksyvästi ja kirjoittaa muistiin.",
        "Paljon tekemistä ja jokunen merkintä. Komitea pitää kynän valmiina."
    ],
    "medium|moderate": [
        "Komitea pitää tilannetta maininnan arvoisena, muttei vielä hälyttävänä.",
        "Keskitasoa kaikin puolin. Komitea mainitsee asian ja jatkaa kahvin juontia.",
        "Ei hätää, mutta kyllä komitea huomasi. Komitea aina huomaa."
    ],
    "medium|low": [
        "Komitea merkitsee lievän huomautuksen ja jatkaa seurantaa.",
        "Vähän tekemistä, vähän merkintöjä. Komitea laittaa muistilapun ja unohtaa sen.",
        "Pieni huomautus kirjataan. Pieni, mutta komitea muistaa pienet."
    ],
    "medium|inactive": [
        "Komitea odottaa lisää dataa ennen lopullista arviota.",
        "Kohteesta ei kuulu mitään. Komitea odottaa ja tuijottaa.",
        "Arviota ei voi antaa, koska kohde ei ole tehnyt mitään. Siinäkin on tyyliä."
    ],
    "low|high": [
        "Komitea pitää kohdetta esimerkillisen aktiivisena ja ongelmattomana.",
        "Aktiivinen eikä sotke. Komitea ei tiedä miten suhtautua, kun kaikki on kunnossa.",
        "Paljon puhetta ja ei yhtään ongelmaa. Komitea epäilee, että tässä on jokin juju."
    ],
    "low|moderate": [
        "Komitea ei löytänyt huomautettavaa — tilanne on hallinnassa.",
        "Kaikki kunnossa. Komitea ihmettelee tätä hiljaa itsekseen.",
        "Puhdasta jälkeä, kohtuullista aktiivisuutta. Komitea on lähes pettynyt."
    ],
    "low|low": [
        "Komitea toteaa tilanteen olevan tavanomainen.",
        "Täysin tavallista menoa. Komitea haukottelee.",
        "Ei mitään erityistä. Erityisyys on tällä kertaa sen puute."
    ],
    "low|inactive": [
        "Komitea ei ole löytänyt mitään huomautettavaa — eikä juuri mitään muutakaan.",
        "Ei merkintöjä, ei aktiivisuutta. Komitea tarkistaa onko kohde edelleen olemassa.",
        "Hiljaisuus ja puhtaus kulkevat käsi kädessä. Komitea nyökkää, tai ei."
    ]
};

const DEFAULT_OPINION = "Komitea toteaa tilanteen olevan tavanomainen.";

function getCommitteeOpinion(riskLevel, activityLevel) {
    const variants = OPINIONS[`${riskLevel}|${activityLevel}`];
    return variants ? satunnainen(variants) : DEFAULT_OPINION;
}

module.exports = { getCommitteeOpinion };
