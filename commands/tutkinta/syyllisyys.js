const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { haeSyyllisyysprosentti, haeSyyllisyysHistoria, haeSyyllisinLista, haeTuomioidenMaara } = require("../../utils/tutkintadata");
const { VARIT } = require("../../utils/tyyli");

function palkki(prosentti) {
    const tayta = Math.round(prosentti / 10);
    return "🟥".repeat(tayta) + "⬜".repeat(10 - tayta);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("syyllisyys")
        .setDescription("Näyttää käyttäjän pysyvän syyllisyysprosentin (kertyy koko historian ajalta).")
        .addUserOption(option =>
            option.setName("kayttaja").setDescription("Kenen syyllisyys tarkistetaan (jätä tyhjäksi = koko listan kärki)").setRequired(false)
        ),

    async execute(interaction) {

        const kayttaja = interaction.options.getUser("kayttaja");

        if (!kayttaja) {

            const lista = await haeSyyllisinLista(interaction.guildId);

            if (!lista.length) {
                return interaction.reply("Kukaan ei ole vielä kerännyt syyllisyyttä. Epäilyttävän puhdas palvelin.");
            }

            const MITALIT = ["🥇", "🥈", "🥉"];

            const embed = new EmbedBuilder()
                .setColor(VARIT.AKSENTTI)
                .setTitle("⚖️ Syyllisimmät — koko historia")
                .setDescription(
                    lista
                        .map((r, i) => `${MITALIT[i] ?? `${i + 1}.`} <@${r.userId}> — **${Math.max(0, Math.min(100, r.summa))}%**`)
                        .join("\n")
                );

            return interaction.reply({ embeds: [embed] });

        }

        const [prosentti, historia, tuomioita] = await Promise.all([
            haeSyyllisyysprosentti(interaction.guildId, kayttaja.id),
            haeSyyllisyysHistoria(interaction.guildId, kayttaja.id, 5),
            haeTuomioidenMaara(interaction.guildId, kayttaja.id)
        ]);

        const embed = new EmbedBuilder()
            .setColor(prosentti > 60 ? VARIT.AKSENTTI : prosentti > 30 ? VARIT.HARMAA : VARIT.PERUS)
            .setTitle(`⚖️ ${kayttaja.username}n syyllisyysprosentti`)
            .setThumbnail(kayttaja.displayAvatarURL())
            .addFields(
                { name: "Syyllisyys", value: `${palkki(prosentti)}  **${prosentti}%**` },
                { name: "Tuomioita yhteensä", value: `${tuomioita}`, inline: true }
            );

        if (historia.length) {
            embed.addFields({
                name: "Viimeisimmät tapahtumat",
                value: historia
                    .map(h => `${h.delta >= 0 ? "🔺" : "🔻"} ${h.delta >= 0 ? "+" : ""}${h.delta} — ${h.syy}`)
                    .join("\n")
            });
        }

        embed.setFooter({ text: "Syyllisyysprosentti kertyy tutkinnoista, äänestyksistä ja tuomioista — pysyvästi." });

        await interaction.reply({ embeds: [embed] });

    }
};
