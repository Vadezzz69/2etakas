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
    tilastot: "📊 Tilastot",
    musiikki: "🎵 Musiikki",
    cards: "Komitea Cards"
};

// Discordin embed-kenttäraja on 1024 merkkiä. Pidetään pieni marginaali
// (1000) jotta emojit/erikoismerkit eivät koskaan ylitä rajaa vahingossa.
const KENTAN_MAKSIMIPITUUS = 1000;

// Embedin tekstit yhteensä max 6000 merkkiä. Jätetään varaa otsikolle ja alatunnisteelle.
const EMBEDIN_TEKSTIRAJA = 5400;

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

        const kentat = [];

        for (const [kategoria, komennot] of ryhmat) {
            const rivit = komennot.map(cmd => `\`/${cmd.data.name}\` — ${cmd.data.description}`);
            const otsikko = KATEGORIA_OTSIKOT[kategoria] ?? kategoria;
            kentat.push(...pilkoKentiksi(otsikko, rivit));
        }

        // Discordin rajat: yhden embedin tekstit yhteensä max 6000 merkkiä ja
        // 25 kenttää. Kun komentoja tulee lisää, lista jatkuu seuraavaan
        // embediin sen sijaan että /help kaatuisi.
        const embedit = [];
        let nykyinen = [];
        let pituus = 0;

        for (const kentta of kentat) {
            const koko = kentta.name.length + kentta.value.length;
            if (nykyinen.length && (pituus + koko > EMBEDIN_TEKSTIRAJA || nykyinen.length >= 25)) {
                embedit.push(nykyinen);
                nykyinen = [];
                pituus = 0;
            }
            nykyinen.push(kentta);
            pituus += koko;
        }
        if (nykyinen.length) embedit.push(nykyinen);

        const viesti = embedit.map((kentatTassa, i) => {
            const embed = new EmbedBuilder()
                .setColor(VARIT.PERUS)
                .addFields(...kentatTassa);

            if (i === 0) embed.setTitle("📖 Komiteanvakoojabotin komennot");
            if (i === embedit.length - 1) embed.setFooter({ text: `${BRANDI.FOOTER_ICON} ${BRANDI.FOOTER_TEKSTI}` });

            return embed;
        });

        await interaction.reply({ embeds: viesti.slice(0, 1) });
        // Discordin 6000 merkin raja koskee viestin kaikkia embedejä yhteensä.
        for (const embed of viesti.slice(1)) await interaction.followUp({ embeds: [embed] });

    }
};
