const { formatDuration, formatNumber } = require("../../ui");
const { satunnainen } = require("../../satunnainen");

const MESSAGES = [
    stats => `on ylittänyt ${formatNumber(stats.messages.total)} viestin rajapyykin; arkisto-osasto huomasi tämänkin`,
    stats => `on kirjoittanut yhteensä ${formatNumber(stats.messages.total)} viestiä, ja jokainen niistä on tallessa`,
    stats => `on rikkonut ${formatNumber(stats.messages.total)} viestin rajan, jonka komitea oli tarkoittanut ylittämättömäksi`
];

const VOICE = [
    stats => `on viettänyt yhteensä ${formatDuration(stats.voice.totalSeconds)} äänessä, mikä täyttää jo kunniamaininnan ehdot`,
    stats => `on äänikanavalla ollut kaikkiaan ${formatDuration(stats.voice.totalSeconds)}; komitea ei halua tietää mitä niissä puhuttiin`,
    stats => `on tallentanut äänikanavalle ${formatDuration(stats.voice.totalSeconds)} elämästään, ja arkisto kiittää`
];

const COMMANDS = [
    stats => `on käyttänyt ${formatNumber(stats.commandUsage)} komentoa; käyttöohje on selvästi tullut luetuksi`,
    stats => `on painanut komentoja ${formatNumber(stats.commandUsage)} kertaa, ja botti alkaa jo tuntea hänet`,
    stats => `on ajanut ${formatNumber(stats.commandUsage)} komentoa; komitea on alkanut epäillä, että hän pitää tästä`
];

module.exports = [
    {
        id: "achievement-messages",
        category: "record",
        score: stats => stats.messages.total >= 1000 ? 40 : 0,
        text: stats => satunnainen(MESSAGES)(stats)
    },
    {
        id: "achievement-voice",
        category: "record",
        score: stats => stats.voice.totalSeconds >= 24 * 60 * 60 ? 40 : 0,
        text: stats => satunnainen(VOICE)(stats)
    },
    {
        id: "achievement-commands",
        category: "record",
        score: stats => stats.commandUsage >= 100 ? 35 : 0,
        text: stats => satunnainen(COMMANDS)(stats)
    }
];
