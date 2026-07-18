const { formatDuration } = require("../../ui");

module.exports = [
    {
        id: "voice-marathon",
        category: "volume",
        score: stats => stats.voice.todaySeconds >= 4 * 60 * 60 ? 90 : 0,
        text: stats => `vietti tänään ${formatDuration(stats.voice.todaySeconds)} äänikanavalla; kokoushuoneelle haetaan kohta vuokrasopimus`
    },
    {
        id: "voice-long",
        category: "volume",
        score: stats => stats.voice.todaySeconds >= 60 * 60 ? 50 : 0,
        text: stats => `on ollut tänään ${formatDuration(stats.voice.todaySeconds)} äänessä, mikä lasketaan jo läsnäoloksi`
    }
];
