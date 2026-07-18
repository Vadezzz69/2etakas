module.exports = [
    {
        id: "investigations-open-many",
        category: "legal",
        score: stats => stats.investigations.open >= 2 ? 100 : 0,
        text: stats => `pitää yhtä aikaa auki ${stats.investigations.open} asiaa; komitea harkitsee omaa hyllyväliä`
    },
    {
        id: "investigations-recent",
        category: "legal",
        score: stats => stats.recentInvestigations >= 1 ? 75 : 0,
        text: stats => `on ehtinyt viimeisen 30 päivän aikana ${stats.recentInvestigations} tuoreeseen komitea-asiaan`
    },
    {
        id: "investigations-open",
        category: "legal",
        score: stats => stats.investigations.open === 1 ? 65 : 0,
        text: () => "on edelleen yhden avoimen asian asialistalla"
    }
];
