module.exports = [
    {
        id: "activity-none",
        category: "state",
        score: stats => stats.messages.today === 0 && stats.voice.todaySeconds === 0 && stats.commandUsage === 0 ? 70 : 0,
        text: () => "ei ole jättänyt tänään mitattavaa jälkeä; pöytäkirjaan kirjattiin poikkeuksellinen rauha"
    },
    {
        id: "activity-low",
        category: "state",
        score: stats => {
            const activity = stats.messages.today + stats.commandUsage + stats.voice.todaySeconds;
            return activity > 0 && stats.messages.today + stats.commandUsage <= 3 && stats.voice.todaySeconds < 300 ? 35 : 0;
        },
        text: () => "on osallistunut niin varovasti, että aktiivisuusmittari pyysi suurennuslasia"
    }
];
