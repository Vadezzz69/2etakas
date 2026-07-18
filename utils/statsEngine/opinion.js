/**
 * A short, deterministic "verdict" sentence describing the combination of
 * risk and activity — distinct from `summary` (a data recap) and from the
 * Roast Engine's paragraph (which explains *why*). This is the Committee's
 * one-line bottom-line opinion.
 */
const OPINIONS = {
    "high|high": "Komitea seuraa tilannetta tiiviisti ja suosittelee lisätoimia.",
    "high|moderate": "Komitea on huolissaan, vaikka aktiivisuus vaikuttaa muuten tavanomaiselta.",
    "high|low": "Komitea pitää riskitasoa korkeana huolimatta vähäisestä näkyvästä aktiivisuudesta.",
    "high|inactive": "Komitea pitää hiljaisuutta itsessään epäilyttävänä tässä tapauksessa.",
    "medium|high": "Komitea kirjaa aktiivisen mutta tarkkailua vaativan jäsenen.",
    "medium|moderate": "Komitea pitää tilannetta maininnan arvoisena, muttei vielä hälyttävänä.",
    "medium|low": "Komitea merkitsee lievän huomautuksen ja jatkaa seurantaa.",
    "medium|inactive": "Komitea odottaa lisää dataa ennen lopullista arviota.",
    "low|high": "Komitea pitää kohdetta esimerkillisen aktiivisena ja ongelmattomana.",
    "low|moderate": "Komitea ei löytänyt huomautettavaa — tilanne on hallinnassa.",
    "low|low": "Komitea toteaa tilanteen olevan tavanomainen.",
    "low|inactive": "Komitea ei ole löytänyt mitään huomautettavaa — eikä juuri mitään muutakaan."
};

const DEFAULT_OPINION = "Komitea toteaa tilanteen olevan tavanomainen.";

function getCommitteeOpinion(riskLevel, activityLevel) {
    return OPINIONS[`${riskLevel}|${activityLevel}`] ?? DEFAULT_OPINION;
}

module.exports = { getCommitteeOpinion };
