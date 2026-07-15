const { Events, ActivityType } = require("discord.js");
const { aloitaAaniSessio, haeAaniSessio } = require("../utils/tilastot");

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {

        console.log(`✅ Kirjauduttu sisään käyttäjänä ${client.user.tag}`);

        client.user.setPresence({
            activities: [{ name: "Tapaamassa äitiäsi", type: ActivityType.Custom }],
            status: "idle"
        });

        // Täydennetään äänisessiot niille jotka olivat jo äänikanavalla
        // ENNEN kuin botti käynnistyi. Discord ei lähetä VoiceStateUpdate-
        // eventtiä heistä, koska mikään ei "muutu" botin näkökulmasta —
        // ilman tätä täydennystä heidän aikansa ei koskaan alkaisi laskea.
        let taydennetty = 0;

        for (const guild of client.guilds.cache.values()) {
            for (const channel of guild.channels.cache.values()) {

                if (!channel.isVoiceBased?.()) continue;

                for (const member of channel.members.values()) {

                    if (member.user.bot) continue;

                    const olemassaOleva = await haeAaniSessio(guild.id, member.id);

                    if (!olemassaOleva) {
                        await aloitaAaniSessio(guild.id, member.id, Date.now());
                        taydennetty++;
                    }

                }

            }
        }

        if (taydennetty > 0) {
            console.log(`🎤 Täydennettiin ${taydennetty} jo käynnissä ollutta äänisessiota.`);
        }

    }
};
