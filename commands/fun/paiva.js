const { SlashCommandBuilder } = require("discord.js");
const { report, info } = require("../../utils/ui");
const { paivanRikos, paivanPaatos, generoiTekosyy, generoiTiedote, generoiVuodenRikollinen } = require("../../utils/comedy");
const { tanaanHelsingissa } = require("../../utils/time");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("paiva")
        .setDescription("Päivittäiset ja satunnaiset komitea-julkaisut.")
        .addSubcommand(sub => sub.setName("rikos").setDescription("Näyttää päivän virallisen rikoksen (sama koko päivän ajan)."))
        .addSubcommand(sub => sub.setName("paatos").setDescription("Näyttää päivän virallisen komiteapäätöksen (sama koko päivän ajan)."))
        .addSubcommand(sub => sub.setName("tekosyy").setDescription("Generoi käyttökelpoisen (?) tekosyyn."))
        .addSubcommand(sub => sub.setName("tiedote").setDescription("Komitean satunnainen (ja täysin merkityksetön) tiedote."))
        .addSubcommand(sub => sub.setName("vuodenrikollinen").setDescription("Julkistaa palvelimen vuoden rikollisen — lasketaan oikeasta datasta.")),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === "rikos") {
            const pvm = tanaanHelsingissa();
            const rikos = paivanRikos(pvm);

            const embed = report({
                title: "🗓️ Päivän rikos",
                description: `Tänään (${pvm}) rekisteröity rikos:\n\n**"...${rikos}."**`,
                footer: "Sama rikos koko päivän — vaihtuu huomenna Suomen ajassa."
            });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === "paatos") {
            const pvm = tanaanHelsingissa();
            const paatos = paivanPaatos(pvm);

            const embed = report({
                title: "⚖️ Päivän päätös",
                description: `Voimassa tänään (${pvm}):\n\n**${paatos}**`,
                footer: "Sama päätös koko päivän — vaihtuu huomenna Suomen ajassa."
            });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === "tekosyy") {
            const embed = info({ title: "🎭 Virallinen tekosyy", description: generoiTekosyy() });
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === "tiedote") {
            const embed = info({ title: "📢 Komitean tiedote", description: generoiTiedote() });
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === "vuodenrikollinen") {
            await interaction.deferReply();
            const tulos = await generoiVuodenRikollinen(interaction.guildId);

            if (!tulos) {
                return interaction.editReply("Ei tarpeeksi dataa palkintogaalaan vielä. Komitea odottaa lisää rikkeitä.");
            }

            const embed = report({
                title: "🏆 VUODEN RIKOLLINEN",
                description:
                    `Komitea on tutkinut kaiken saatavilla olevan datan — syyllisyyden, sakot, tutkinnat, äänikanava-ajan ja viestimäärän — ja julistaa voittajan.\n\n## 🥇 <@${tulos.voittaja}>`,
                fields: [
                    { name: "Yhdistetty pistemäärä", value: `${tulos.pistemaara} / 100`, inline: true },
                    { name: "Ehdokkaita yhteensä", value: `${tulos.ehdokkaidenMaara}`, inline: true },
                    ...(tulos.toiseksiTullut ? [{ name: "Kunniamaininta (2. sija)", value: `<@${tulos.toiseksiTullut}>` }] : [])
                ],
                footer: "Palkintoseremonia järjestetään heti kun joku muistaa varata tilan."
            });

            return interaction.editReply({ embeds: [embed] });
        }
    }
};
