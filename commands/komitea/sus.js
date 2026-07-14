const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { satunnaisVali } = require("../../utils/komiteadata");
const { VARIT } = require("../../utils/tyyli");

function palkki(prosentti) {
    const tayta = Math.round(prosentti / 10);
    return "🟥".repeat(tayta) + "⬜".repeat(10 - tayta);
}

function kommentti(prosentti) {
    if (prosentti < 20) return "Puhtaampi kuin komitean pöytäkirja.";
    if (prosentti < 50) return "Vähän epäilyttävää, mutta ei mitään hälyttävää.";
    if (prosentti < 80) return "Komitea pitää silmällä.";
    return "Erittäin epäilyttävää. Suositellaan välitöntä valvontaa.";
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("sus")
        .setDescription("Mittaa käyttäjän epäilyttävyysprosentin.")
        .addUserOption(option =>
            option.setName("kayttaja").setDescription("Kuka mitataan").setRequired(true)
        ),

    async execute(interaction) {

        const kayttaja = interaction.options.getUser("kayttaja");
        const prosentti = satunnaisVali(0, 100);

        const embed = new EmbedBuilder()
            .setColor(prosentti > 70 ? VARIT.AKSENTTI : prosentti > 40 ? VARIT.HARMAA : VARIT.PERUS)
            .setTitle("🔍 Epäilymittari")
            .setDescription(
                `${kayttaja}\n\n` +
                `${palkki(prosentti)}  **${prosentti}%**\n\n` +
                `*${kommentti(prosentti)}*`
            );

        await interaction.reply({ embeds: [embed] });

    }
};
