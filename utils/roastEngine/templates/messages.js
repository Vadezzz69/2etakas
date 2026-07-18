const { formatNumber } = require("../../ui");

module.exports = [
    {
        id: "messages-flood",
        category: "volume",
        score: stats => stats.messages.today >= 100 ? 85 : 0,
        text: stats => `kirjoitti tänään ${formatNumber(stats.messages.today)} viestiä, joten näppäimistö haki jo työehtosopimusta`
    },
    {
        id: "messages-active",
        category: "volume",
        score: stats => stats.messages.today >= 30 ? 50 : 0,
        text: stats => `on lähettänyt tänään ${formatNumber(stats.messages.today)} viestiä ja pitänyt keskustelun virallisesti käynnissä`
    }
];
