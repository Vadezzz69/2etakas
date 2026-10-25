const { satunnainen } = require("../../satunnainen");

const NONE = [
    "ei ole jättänyt tänään mitattavaa jälkeä; pöytäkirjaan kirjattiin poikkeuksellinen rauha",
    "on ollut tänään niin hiljaa, että komitea tarkisti onko tili edelleen elossa",
    "ei ole tehnyt tänään mitään tilastoitavaa; komitea ei tiedä pitääkö kiittää vai huolestua"
];

const LOW = [
    "on osallistunut niin varovasti, että aktiivisuusmittari pyysi suurennuslasia",
    "on ilmaantunut tilastoihin niin vähän, että mittari epäilee häiriötä",
    "on pitänyt matalaa profiilia, jonka syvyys on komitean mielestä jo ammattimaista"
];

module.exports = [
    {
        id: "activity-none",
        category: "state",
        score: stats => stats.messages.today === 0 && stats.voice.todaySeconds === 0 && stats.commandUsage === 0 ? 70 : 0,
        text: () => satunnainen(NONE)
    },
    {
        id: "activity-low",
        category: "state",
        score: stats => {
            const activity = stats.messages.today + stats.commandUsage + stats.voice.todaySeconds;
            return activity > 0 && stats.messages.today + stats.commandUsage <= 3 && stats.voice.todaySeconds < 300 ? 35 : 0;
        },
        text: () => satunnainen(LOW)
    }
];
