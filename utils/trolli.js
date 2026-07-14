const { satunnainen, ITSE_KAANNOS_KOMMENTIT } = require("./roastdata");

/**
 * Päättää, käännetäänkö vakoilun kohde takaisin komennon käyttäjään itseensä.
 * Jos kohde on jo sama kuin käyttäjä, ei tehdä mitään erikoista.
 *
 * @param {import("discord.js").ChatInputCommandInteraction} interaction
 * @param {import("discord.js").User} alkuperainenKohde
 * @param {number} todennakoisyys - 0-1, oletus 0.2 (20 %)
 * @returns {{ kohde: import("discord.js").User, kaannetty: boolean, kommentti: string|null }}
 */
function ehkaKaannaKutsujaksi(interaction, alkuperainenKohde, todennakoisyys = 0.2) {

    if (alkuperainenKohde.id === interaction.user.id) {
        return { kohde: alkuperainenKohde, kaannetty: false, kommentti: null };
    }

    if (alkuperainenKohde.bot) {
        return { kohde: alkuperainenKohde, kaannetty: false, kommentti: null };
    }

    if (Math.random() < todennakoisyys) {
        return {
            kohde: interaction.user,
            kaannetty: true,
            kommentti: satunnainen(ITSE_KAANNOS_KOMMENTIT)
        };
    }

    return { kohde: alkuperainenKohde, kaannetty: false, kommentti: null };
}

module.exports = { ehkaKaannaKutsujaksi };
