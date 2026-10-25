const { satunnainen } = require("../../satunnainen");

const HEAVY = [
    stats => `on kerännyt ${stats.fines} sakkoriviä; komitean kassanhoitaja tervehtii jo etunimellä`,
    stats => `omistaa ${stats.fines} sakkoriviä, ja kassanhoitajalla on kuulemma jo oma kansio hänelle`,
    stats => `on maksanut ${stats.fines} sakkoa; komitea harkitsee kanta-asiakaskorttia`
];

const PRESENT = [
    stats => `löytyy sakkorekisteristä ${stats.fines} merkinnällä`,
    stats => `on kirjattu sakkorekisteriin ${stats.fines} kertaa, eikä syytä ole vielä unohdettu`,
    stats => `on sakkorekisterissä ${stats.fines} rivillä, ja jokainen rivi on tallennettu rakkaudella`
];

module.exports = [
    {
        id: "fines-heavy",
        category: "legal",
        score: stats => stats.fines >= 5 ? 95 : 0,
        text: stats => satunnainen(HEAVY)(stats)
    },
    {
        id: "fines-present",
        category: "legal",
        score: stats => stats.fines >= 1 ? 55 : 0,
        text: stats => satunnainen(PRESENT)(stats)
    }
];
