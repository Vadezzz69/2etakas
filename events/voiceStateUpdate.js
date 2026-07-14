const { Events } = require("discord.js");
const { lisaaAanaikaa } = require("../utils/tilastot");

// Muistinvarainen kartta käynnissä olevista äänisessioista.
// Nollautuu botin uudelleenkäynnistyksessä — hyväksyttävä kompromissi.
const aktiivisetSessiot = new Map(); // "guildId:userId" -> liittymisaika (ms)

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {

        const userId = newState.id ?? oldState.id;
        const guildId = newState.guild.id;
        const avain = `${guildId}:${userId}`;

        const oliAanessa = Boolean(oldState.channelId);
        const onAanessa = Boolean(newState.channelId);

        if (!oliAanessa && onAanessa) {
            // Liittyi äänikanavaan
            aktiivisetSessiot.set(avain, Date.now());
            return;
        }

        if (oliAanessa && !onAanessa) {
            // Poistui äänikanavasta kokonaan
            const liittymisaika = aktiivisetSessiot.get(avain);
            if (liittymisaika) {
                const sekunnit = Math.floor((Date.now() - liittymisaika) / 1000);
                aktiivisetSessiot.delete(avain);
                try {
                    await lisaaAanaikaa(guildId, userId, sekunnit);
                } catch (err) {
                    console.error("❌ Äänitilaston kirjaus epäonnistui:", err);
                }
            }
        }

        // Kanavan vaihto (oliAanessa && onAanessa) ei katkaise sessiota.
    }
};
