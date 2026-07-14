const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { ONKO_KOMMENTIT_KYLLA, ONKO_KOMMENTIT_EI, satunnainen, satunnaisVali } = require("../../utils/komiteadata");
const { VARIT } = require("../../utils/tyyli");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("onko")
        .setDescription("Kysy komitealta kysymys tägätystä käyttäjästä.")
        .addUserOption(option =>
            option.setName("kayttaja").setDescription("Kenestä kysytään").setRequired(true)
        )
        .addStringOption(option =>
            option.setName("kysymys").setDescription("Mitä kysytään (esim. \"syypää tähän kaikkeen\")").setRequired(false)
        ),

    async execute(interaction) {

        const kayttaja = interaction.options.getUser("kayttaja");
        const kysymys = interaction.options.getString("kysymys") ?? "epäilyttävä";

        const kylla = Math.random() < 0.5;
        const todennakoisyys = satunnaisVali(51, 99);
        const kommentti = satunnainen(kylla ? ONKO_KOMMENTIT_KYLLA : ONKO_KOMMENTIT_EI);

        const embed = new EmbedBuilder()
            .setColor(kylla ? VARIT.ONNISTUI : VARIT.AKSENTTI)
            .setTitle("🎱 Komitean vastaus")
            .setDescription(
                `**Kysymys:** Onko ${kayttaja} ${kysymys}?\n\n` +
                `**Vastaus:** ${kylla ? "KYLLÄ ✅" : "EI ❌"} (${todennakoisyys}% varmuudella)\n` +
                `*${kommentti}*`
            );

        await interaction.reply({ embeds: [embed] });

    }
};
