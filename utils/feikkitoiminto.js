const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { VARIT } = require("./tyyli");
const { odota } = require("./async");
const { satunnainen } = require("./satunnainen");
const { tayta } = require("./comedy/data/viestit");

/**
 * Suorittaa "feikkitoiminnon": näyttää dramaattisen embed-viestin, odottaa
 * hetken, ja paljastaa sitten ettei mitään oikeasti tapahtunut. Käytössä
 * /aikalisa-, /bannaa- ja /potkaise-komennoissa, jotka jakavat tämän rungon
 * kolmen lähes identtisen toteutuksen sijaan.
 */
async function suoritaFeikkiToiminto(interaction, { kuvaus, paljastus, viiveMs = 2500 }) {
    const embed = new EmbedBuilder()
        .setColor(VARIT.AKSENTTI)
        .setDescription(kuvaus);

    await interaction.reply({ embeds: [embed] });
    await odota(viiveMs);
    await interaction.followUp(paljastus);
}

/**
 * Rakentaa feikkikomennon (/bannaa, /potkaise, /aikalisa). Ne olivat aiemmin
 * kolme tiedostoa, joissa ~14 riviä oli sana sanalta samaa.
 *
 * @param {object} a
 * @param {string} a.nimi
 * @param {string} a.kuvaus
 * @param {string} a.kohdeKuvaus   "kayttaja"-valinnan kuvaus
 * @param {string} a.syyKuvaus     "syy"-valinnan kuvaus
 * @param {{kuvaukset: string[], paljastukset: string[]}} a.data  viestipooli
 * @param {number} a.viiveMs       kuinka kauan dramatiikkaa venytetään
 * @param {boolean} [a.minuutit]   lisää pakollinen "minuutit"-valinta (/aikalisa)
 */
function luoFeikkiKomento({ nimi, kuvaus, kohdeKuvaus, syyKuvaus, data, viiveMs, minuutit = false }) {
    const builder = new SlashCommandBuilder()
        .setName(nimi)
        .setDescription(kuvaus)
        .addUserOption(option =>
            option.setName("kayttaja").setDescription(kohdeKuvaus).setRequired(true)
        );

    // Pakolliset valinnat täytyy rekisteröidä ennen valinnaisia.
    if (minuutit) {
        builder.addIntegerOption(option =>
            option.setName("minuutit").setDescription("Kesto minuutteina").setMinValue(1).setMaxValue(40320).setRequired(true)
        );
    }

    builder.addStringOption(option =>
        option.setName("syy").setDescription(syyKuvaus).setRequired(false).setMaxLength(300)
    );

    return {
        data: builder,

        async execute(interaction) {
            const user = interaction.options.getUser("kayttaja");
            const syy = interaction.options.getString("syy") ?? "Syytä ei annettu";
            const arvot = { tag: user.tag, syy };

            if (minuutit) arvot.min = interaction.options.getInteger("minuutit");

            await suoritaFeikkiToiminto(interaction, {
                kuvaus: tayta(satunnainen(data.kuvaukset), arvot),
                paljastus: tayta(satunnainen(data.paljastukset), { k: `${user}` }),
                viiveMs
            });
        }
    };
}

module.exports = { suoritaFeikkiToiminto, luoFeikkiKomento };
