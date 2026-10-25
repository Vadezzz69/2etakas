const { formatDuration } = require("../../ui");
const { satunnainen } = require("../../satunnainen");

const MARATHON = [
    stats => `vietti tänään ${formatDuration(stats.voice.todaySeconds)} äänikanavalla; kokoushuoneelle haetaan kohta vuokrasopimus`,
    stats => `oli tänään äänikanavalla ${formatDuration(stats.voice.todaySeconds)}, ja kanavan tuolit alkavat kuulua hänelle`,
    stats => `käytti tänään ${formatDuration(stats.voice.todaySeconds)} äänikanavalla; mikrofoni on jo lähes osa kättä`
];

const LONG = [
    stats => `on ollut tänään ${formatDuration(stats.voice.todaySeconds)} äänessä, mikä lasketaan jo läsnäoloksi`,
    stats => `vietti tänään ${formatDuration(stats.voice.todaySeconds)} äänikanavalla, joten komitea kirjaa hänet vakioasiakkaaksi`,
    stats => `puhui tänään ${formatDuration(stats.voice.todaySeconds)} äänikanavalla; hiljaisuus kiittää tauosta`
];

module.exports = [
    {
        id: "voice-marathon",
        category: "volume",
        score: stats => stats.voice.todaySeconds >= 4 * 60 * 60 ? 90 : 0,
        text: stats => satunnainen(MARATHON)(stats)
    },
    {
        id: "voice-long",
        category: "volume",
        score: stats => stats.voice.todaySeconds >= 60 * 60 ? 50 : 0,
        text: stats => satunnainen(LONG)(stats)
    }
];
