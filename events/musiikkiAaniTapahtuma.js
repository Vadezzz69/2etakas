const { Events } = require("discord.js");
const { haeSoitin } = require("../utils/musiikki/soitin");

/**
 * Pitää musiikkisoittimen siistinä äänikanavatapahtumissa:
 *  - botti potkittu/katkaistu kanavalta -> soitin siivotaan pois
 *  - botti siirretty toiselle kanavalle -> soitin seuraa mukana
 *  - viimeinen ihminen lähtee -> poistumisajastin käynnistyy (peruuntuu jos joku palaa)
 *
 * Erillinen tiedosto, jotta äänitilastojen oma käsittelijä (voiceStateUpdate.js)
 * pysyy koskemattomana. Ei vaikutusta jos palvelimella ei soi musiikkia.
 */
module.exports = {
    name: Events.VoiceStateUpdate,

    async execute(vanha, uusi, client) {
        const guild = uusi.guild ?? vanha.guild;
        const soitin = haeSoitin(guild.id);
        if (!soitin) return;

        const omaMuutos = (uusi.id ?? vanha.id) === client.user.id;

        if (omaMuutos) {
            if (!uusi.channelId) {
                soitin.lopeta();
                return;
            }

            if (uusi.channelId !== soitin.kanavaId) soitin.kanavaId = uusi.channelId;
        }

        const kanava = guild.channels.cache.get(soitin.kanavaId);
        if (!kanava) return;

        const ihmisia = [...(kanava.members?.values() ?? [])].filter(m => !m.user?.bot).length;
        soitin.kanavaMuuttui(ihmisia);
    }
};
