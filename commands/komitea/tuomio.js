const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { RANGAISTUKSET, satunnainen, satunnaisVali } = require("../../utils/komiteadata");
const { VARIT } = require("../../utils/tyyli");
const { kirjaaTuomio, lisaaSyyllisyytta } = require("../../utils/tutkintadata");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("tuomio")
        .setDescription("Komitea antaa virallisen tuomion.")
        .addUserOption(option =>
            option.setName("kayttaja").setDescription("Tuomittava käyttäjä").setRequired(true)
        ),

    async execute(interaction) {

        const kayttaja = interaction.options.getUser("kayttaja");
        const tuomio = satunnainen(RANGAISTUKSET);
        const asianumero = satunnaisVali(1000, 9999);

        await kirjaaTuomio(interaction.guildId, kayttaja.id, tuomio, "/tuomio", false);
        await lisaaSyyllisyytta(interaction.guildId, kayttaja.id, 3, `/tuomio: ${tuomio}`);

        const embed = new EmbedBuilder()
            .setColor(VARIT.AKSENTTI)
            .setTitle(`⚖️ Tuomio — asia nro ${asianumero}`)
            .setDescription(
                `${kayttaja} on todettu syylliseksi komitean silmissä.\n\n` +
                `**Tuomio:**\n${tuomio}`
            )
            .setFooter({ text: "Muutoksenhaku ei ole mahdollista. Valitettavasti." });

        await interaction.reply({ embeds: [embed] });

    }
};
