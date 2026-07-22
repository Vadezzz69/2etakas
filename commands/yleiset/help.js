const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { VARIT, BRANDI } = require("../../utils/tyyli");

const KATEGORIA_OTSIKOT = {
    yleiset: "📖 Yleiset",
    apuvalineet: "🛠️ Apuvälineet",
    moderointi: "🛡️ Moderointi",
    vakoilu: "🕵️ Vakoilu",
    komitea: "😂 Komitea & trollit",
    tutkinta: "📁 Tutkinnat & syyllisyys",
    hauskat: "🤕 Hauskat",
    fun: "🎭 Komitean ilveilyt",
    pelit: "🎮 Pelit",
    tilastot: "📊 Tilastot"
};

// Discordin embed-kenttäraja on 1024 merkkiä. Pidetään pieni marginaali
// (1000) jotta emojit/erikoismerkit eivät koskaan ylitä rajaa vahingossa.
const KENTAN_MAKSIMIPITUUS = 1000;

/**
 * Jakaa komentorivit useaan kenttään jos yhteispituus ylittäisi Discordin
 * rajan. Yhdenkin kategorian komentomäärä voi kasvaa ajan myötä, joten
 * tämä on parempi ratkaisu kuin kiinteä oletus "yksi kenttä per kategoria".
 */
function pilkoKentiksi(otsikko, rivit) {

    const kentat = [];
    let nykyinenPala = [];
    let nykyinenPituus = 0;

    for (const rivi of rivit) {
        if (nykyinenPituus + rivi.length + 1 > KENTAN_MAKSIMIPITUUS && nykyinenPala.length) {
            kentat.push(nykyinenPala.join("\n"));
            nykyinenPala = [];
            nykyinenPituus = 0;
        }
        nykyinenPala.push(rivi);
        nykyinenPituus += rivi.length + 1;
    }

    if (nykyinenPala.length) kentat.push(nykyinenPala.join("\n"));

    return kentat.map((value, i) => ({
        name: kentat.length > 1 ? `${otsikko} (${i + 1}/${kentat.length})` : otsikko,
        value
    }));

}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Listaa kaikki komennot kategorioittain."),

    async execute(interaction, client) {

        const ryhmat = new Map();

        for (const cmd of client.commands.values()) {
            const kategoria = cmd.kategoria ?? "muut";
            if (!ryhmat.has(kategoria)) ryhmat.set(kategoria, []);
            ryhmat.get(kategoria).push(cmd);
        }

        const embed = new EmbedBuilder()
            .setColor(VARIT.PERUS)
            .setTitle("📖 Komiteanvakoojabotin komennot")
            .setFooter({ text: `${BRANDI.FOOTER_ICON} ${BRANDI.FOOTER_TEKSTI}` });

        for (const [kategoria, komennot] of ryhmat) {

            const rivit = komennot.map(cmd => `\`/${cmd.data.name}\` — ${cmd.data.description}`);
            const otsikko = KATEGORIA_OTSIKOT[kategoria] ?? kategoria;

            embed.addFields(...pilkoKentiksi(otsikko, rivit));

        }

        await interaction.reply({ embeds: [embed] });

    }
};
