const { satunnainen } = require("../../satunnainen");

const OPEN_MANY = [
    stats => `pitää yhtä aikaa auki ${stats.investigations.open} asiaa; komitea harkitsee omaa hyllyväliä`,
    stats => `on yhtä aikaa ${stats.investigations.open} tutkinnan kohteena, mikä on komitean mielestä jo harrastus`,
    stats => `selvittää ${stats.investigations.open} avointa asiaa samaan aikaan; pöytäkirja on pyytänyt lisää kansioita`
];

const RECENT = [
    stats => `on ehtinyt viimeisen 30 päivän aikana ${stats.recentInvestigations} tuoreeseen komitea-asiaan`,
    stats => `on joutunut kuukauden sisällä ${stats.recentInvestigations} uuden tutkinnan keskipisteeseen`,
    stats => `on viimeisen 30 päivän aikana herättänyt komitean kiinnostuksen ${stats.recentInvestigations} kertaa`
];

const OPEN_ONE = [
    "on edelleen yhden avoimen asian asialistalla",
    "kuuluu yhteen avoimeen tutkintaan, joka ei ole vielä päättynyt",
    "on yksittäisen avoimen asian pääosassa"
];

module.exports = [
    {
        id: "investigations-open-many",
        category: "legal",
        score: stats => stats.investigations.open >= 2 ? 100 : 0,
        text: stats => satunnainen(OPEN_MANY)(stats)
    },
    {
        id: "investigations-recent",
        category: "legal",
        score: stats => stats.recentInvestigations >= 1 ? 75 : 0,
        text: stats => satunnainen(RECENT)(stats)
    },
    {
        id: "investigations-open",
        category: "legal",
        score: stats => stats.investigations.open === 1 ? 65 : 0,
        text: () => satunnainen(OPEN_ONE)
    }
];
