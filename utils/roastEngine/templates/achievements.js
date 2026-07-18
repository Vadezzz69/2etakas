const { formatDuration, formatNumber } = require("../../ui");

module.exports = [
    {
        id: "achievement-messages",
        category: "record",
        score: stats => stats.messages.total >= 1000 ? 40 : 0,
        text: stats => `on ylittänyt ${formatNumber(stats.messages.total)} viestin rajapyykin; arkisto-osasto huomasi tämänkin`
    },
    {
        id: "achievement-voice",
        category: "record",
        score: stats => stats.voice.totalSeconds >= 24 * 60 * 60 ? 40 : 0,
        text: stats => `on viettänyt yhteensä ${formatDuration(stats.voice.totalSeconds)} äänessä, mikä täyttää jo kunniamaininnan ehdot`
    },
    {
        id: "achievement-commands",
        category: "record",
        score: stats => stats.commandUsage >= 100 ? 35 : 0,
        text: stats => `on käyttänyt ${formatNumber(stats.commandUsage)} komentoa; käyttöohje on selvästi tullut luetuksi`
    }
];
