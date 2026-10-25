const { luoRyhmakomento } = require("../../utils/ryhmakomento");
const { satunnainen } = require("../../utils/satunnainen");
const { VAKOILURAPORTIT } = require("../../utils/vakoiludata");
const { ehkaKaannaKutsujaksi } = require("../../utils/trolli");
const { BOTTI_ESTOT } = require("../../utils/comedy/data/viestit");

// "nopea" on ryhmän oma kevyt toiminto: pelkkä yhden rivin havainto ilman
// embediä. Sillä ei ole omaa slash-komentoa, joten se on määritelty tässä.
const nopea = {
    data: {
        toJSON: () => ({
            name: "nopea",
            description: "Nopea vakoiluhavainto tägätystä käyttäjästä. (Suppeampi versio)",
            options: [
                { type: 6, name: "kohde", description: "Kuka vakoillaan", required: true }
            ]
        })
    },

    async execute(interaction) {
        const pyydetty = interaction.options.getUser("kohde");

        if (pyydetty.id === interaction.client.user.id) {
            return interaction.reply({ content: satunnainen(BOTTI_ESTOT), ephemeral: true });
        }

        const { kohde, kaannetty, kommentti } = ehkaKaannaKutsujaksi(interaction, pyydetty);
        const havainto = satunnainen(VAKOILURAPORTIT);
        const viesti = `👁️ **Havainto kohteesta** ${kohde}:\n> ${havainto}`;

        return interaction.reply(kaannetty ? `${kommentti}\n\n${viesti}` : viesti);
    }
};

// alikomento -> toiminto (sama kuin ennen: tarkkaile = valvontaraportti,
// raportti = komitean raportti, etsintakuulutus = etsintäkuulutus jne.)
module.exports = luoRyhmakomento({
    nimi: "vakoilu",
    kuvaus: "Komitean vakoiluosaston komennot.",
    alikomennot: {
        tarkkaile:       { jasen: require("./vakoile") },
        nopea:           { jasen: nopea },
        raportti:        { jasen: require("./report") },
        etsintakuulutus: { jasen: require("./wanted") },
        tehtava:         { jasen: require("./tehtava") },
        koodinimi:       { jasen: require("./koodinimi") },
        salaisuus:       { jasen: require("./salaisuus") },
        itsetuho:        { jasen: require("./itsetuho") }
    }
});
