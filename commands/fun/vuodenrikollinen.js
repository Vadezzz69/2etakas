const { SlashCommandBuilder } = require("discord.js");
const { report } = require("../../utils/ui");
const { generoiVuodenRikollinen } = require("../../utils/comedy");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("vuodenrikollinen")
        .setDescription("Julkistaa palvelimen vuoden rikollisen — lasketaan oikeasta datasta."),

    async execute(interaction) {

        await interaction.deferReply();

        const tulos = await generoiVuodenRikollinen(interaction.guildId);

        if (!tulos) {
            return interaction.editReply(
                "Ei tarpeeksi dataa palkintogaalaan vielä. Komitea odottaa lisää rikkeitä."
            );
        }

        const embed = report({
            title: "🏆 VUODEN RIKOLLINEN",
            description:
                `Komitea on tutkinut kaiken saatavilla olevan datan — syyllisyyden, sakot, ` +
                `tutkinnat, äänikanava-ajan ja viestimäärän — ja julistaa voittajan.\n\n` +
                `## 🥇 <@${tulos.voittaja}>`,
            fields: [
                { name: "Yhdistetty pistemäärä", value: `${tulos.pistemaara} / 100`, inline: true },
                { name: "Ehdokkaita yhteensä", value: `${tulos.ehdokkaidenMaara}`, inline: true },
                ...(tulos.toiseksiTullut
                    ? [{ name: "Kunniamaininta (2. sija)", value: `<@${tulos.toiseksiTullut}>` }]
                    : [])
            ],
            footer: "Palkintoseremonia järjestetään heti kun joku muistaa varata tilan."
        });

        await interaction.editReply({ embeds: [embed] });

    }
};
