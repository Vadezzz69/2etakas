const { satunnainen } = require("../../satunnainen");

const MESSAGES_FIRST = [
    "johtaa viestitilastoa, joten puheenjohtaja varasi jo ylimääräisen pöytäkirjasivun",
    "on viestitilaston ykkönen, ja komitea on alkanut kutsua häntä sihteeriksi",
    "istuu viestitilaston kärjessä, mikä on kunnia, jonka arvo on komitean mielestä epäselvä"
];

const VOICE_FIRST = [
    "pitää ääniaktiivisuuden ykkössijaa kuin kanavalla olisi oma nimikkotuoli",
    "hallitsee äänikanavatilaston kärkeä, joten komitea harkitsee hänelle omaa kanavaa",
    "on äänitilaston ykkönen, ja mikrofoni on jo tottunut hänen hengitysrytmiinsä"
];

const TOP_THREE = [
    position => `on jo tilastoissa sijalla ${position}, mikä ei jäänyt komitealta huomaamatta`,
    position => `on tilastoissa sijalla ${position}; komitea seuraa tilannetta kateellisena`,
    position => `pitää tilastoissa sijaa ${position}, ja arkisto kirjaa sen synkällä ilmeellä`
];

module.exports = [
    {
        id: "ranking-messages-first",
        category: "standing",
        score: stats => stats.rankings.messages?.position === 1 ? 80 : 0,
        text: () => satunnainen(MESSAGES_FIRST)
    },
    {
        id: "ranking-voice-first",
        category: "standing",
        score: stats => stats.rankings.voice?.position === 1 ? 80 : 0,
        text: () => satunnainen(VOICE_FIRST)
    },
    {
        id: "ranking-top-three",
        category: "standing",
        score: stats => {
            const positions = [stats.rankings.messages?.position, stats.rankings.voice?.position].filter(Boolean);
            return positions.some(position => position <= 3) ? 45 : 0;
        },
        text: stats => {
            const messageRank = stats.rankings.messages?.position;
            const voiceRank = stats.rankings.voice?.position;
            const position = [messageRank, voiceRank].filter(Boolean).sort((a, b) => a - b)[0];
            return satunnainen(TOP_THREE)(position);
        }
    }
];
