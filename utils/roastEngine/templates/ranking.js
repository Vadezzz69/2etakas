module.exports = [
    {
        id: "ranking-messages-first",
        category: "standing",
        score: stats => stats.rankings.messages?.position === 1 ? 80 : 0,
        text: () => "johtaa viestitilastoa, joten puheenjohtaja varasi jo ylimääräisen pöytäkirjasivun"
    },
    {
        id: "ranking-voice-first",
        category: "standing",
        score: stats => stats.rankings.voice?.position === 1 ? 80 : 0,
        text: () => "pitää ääniaktiivisuuden ykkössijaa kuin kanavalla olisi oma nimikkotuoli"
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
            return `on jo tilastoissa sijalla ${position}, mikä ei jäänyt komitealta huomaamatta`;
        }
    }
];
