module.exports = [
    {
        id: "fines-heavy",
        category: "legal",
        score: stats => stats.fines >= 5 ? 95 : 0,
        text: stats => `on kerännyt ${stats.fines} sakkoriviä; komitean kassanhoitaja tervehtii jo etunimellä`
    },
    {
        id: "fines-present",
        category: "legal",
        score: stats => stats.fines >= 1 ? 55 : 0,
        text: stats => `löytyy sakkorekisteristä ${stats.fines} merkinnällä`
    }
];
