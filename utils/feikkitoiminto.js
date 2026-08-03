const { EmbedBuilder } = require("discord.js");
const { VARIT } = require("./tyyli");
const { odota } = require("./async");

/**
 * Suorittaa "feikkitoiminnon": näyttää dramaattisen embed-viestin, odottaa
 * hetken, ja paljastaa sitten ettei mitään oikeasti tapahtunut. Käytössä
 * /komitea aikalisä/bannaa/potkaise -komennoissa, jotka olivat aiemmin
 * kolme lähes identtistä komentotiedostoa.
 */
async function suoritaFeikkiToiminto(interaction, { kuvaus, paljastus, viiveMs = 2500 }) {
    const embed = new EmbedBuilder()
        .setColor(VARIT.AKSENTTI)
        .setDescription(kuvaus);

    await interaction.reply({ embeds: [embed] });
    await odota(viiveMs);
    await interaction.followUp(paljastus);
}

module.exports = { suoritaFeikkiToiminto };
