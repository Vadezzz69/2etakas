const { formatNumber } = require("../../ui");
const { satunnainen } = require("../../satunnainen");

const FLOOD = [
    stats => `kirjoitti tänään ${formatNumber(stats.messages.today)} viestiä, joten näppäimistö haki jo työehtosopimusta`,
    stats => `lähetti tänään ${formatNumber(stats.messages.today)} viestiä, ja enter-näppäin pyysi lomaa`,
    stats => `tuotti tänään ${formatNumber(stats.messages.today)} viestiä, mikä rasittaa komitean arkistoa ja mielenrauhaa`
];

const ACTIVE = [
    stats => `on lähettänyt tänään ${formatNumber(stats.messages.today)} viestiä ja pitänyt keskustelun virallisesti käynnissä`,
    stats => `kirjoitti tänään ${formatNumber(stats.messages.today)} viestiä; keskustelu hengittää vielä, kiitos hänen`,
    stats => `on tänään jakanut ${formatNumber(stats.messages.today)} viestiä, joista osa on jopa luettu`
];

module.exports = [
    {
        id: "messages-flood",
        category: "volume",
        score: stats => stats.messages.today >= 100 ? 85 : 0,
        text: stats => satunnainen(FLOOD)(stats)
    },
    {
        id: "messages-active",
        category: "volume",
        score: stats => stats.messages.today >= 30 ? 50 : 0,
        text: stats => satunnainen(ACTIVE)(stats)
    }
];
