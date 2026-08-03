const { SlashCommandBuilder } = require("discord.js");
const { report, formatNumber, formatDuration } = require("../../utils/ui");
const {
    generoiRatsiaSaalis, generoiTakavarikko, generoiKuulustelu,
    generoiRikosrekisteri, generoiKamerat, generoiPsykoanalyysi
} = require("../../utils/comedy");
const { ehkaKaannaKutsujaksi } = require("../../utils/trolli");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("tutkimus")
        .setDescription("Komitean tutkintatoimet kohdetta vastaan.")
        .addSubcommand(sub =>
            sub.setName("ratsia").setDescription("Komitea suorittaa yllätysratsian kohteen omaisuuteen.")
                .addUserOption(option => option.setName("kayttaja").setDescription("Ratsian kohde").setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName("takavarikko").setDescription("Komitea takavarikoi kohteen omaisuutta ilman kunnollista perustetta.")
                .addUserOption(option => option.setName("kayttaja").setDescription("Kenen omaisuus takavarikoidaan").setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName("kuulustelu").setDescription("Komitea kuulustelee kohdetta virallisen näköisesti.")
                .addUserOption(option => option.setName("kayttaja").setDescription("Kuulusteltava").setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName("rikosrekisteri").setDescription("Näyttää kohteen rikosrekisterin — oikea data + keksityt rikokset.")
                .addUserOption(option => option.setName("kayttaja").setDescription("Kenen rekisteri haetaan").setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName("kamerat").setDescription("Näyttää kuvitteellisen valvontakameroiden aikajanan kohteesta.")
                .addUserOption(option => option.setName("kayttaja").setDescription("Kenen aikajana näytetään").setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName("psykoanalyysi").setDescription("Komitea laatii täysin epätieteellisen psykologisen arvion kohteesta.")
                .addUserOption(option => option.setName("kayttaja").setDescription("Analyysin kohde").setRequired(true))
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === "ratsia") {
            const kohde = interaction.options.getUser("kayttaja");
            const saalis = generoiRatsiaSaalis();

            const embed = report({
                title: "🚨 RATSIAPÖYTÄKIRJA",
                description: `Komitea suoritti yllätysratsian kohteeseen ${kohde}.`,
                thumbnail: kohde.displayAvatarURL(),
                fields: [
                    { name: "Takavarikoitu omaisuus", value: saalis.map(esine => `• ${esine}`).join("\n") },
                    { name: "Ratsian tulos", value: "Epäilyttävää, mutta ei riittävää näyttöä tuomioon." }
                ]
            });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === "takavarikko") {
            const kohde = interaction.options.getUser("kayttaja");
            const esineet = generoiTakavarikko();

            const embed = report({
                title: `📦 TAKAVARIKKOPÖYTÄKIRJA — ${kohde.username}`,
                description: `Seuraava omaisuus on takavarikoitu toistaiseksi:`,
                thumbnail: kohde.displayAvatarURL(),
                fields: [{ name: `Takavarikoitu (${esineet.length} kpl)`, value: esineet.map(e => `• ${e}`).join("\n") }],
                footer: "Omaisuus palautetaan kun komitea muistaa minne se laitettiin."
            });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === "kuulustelu") {
            const kohde = interaction.options.getUser("kayttaja");
            const kuulustelu = generoiKuulustelu();

            const fields = kuulustelu.parit.map((pari, i) => ({
                name: `Kysymys ${i + 1}: ${pari.kysymys}`,
                value: `*${kohde.username}: "${pari.vastaus}"*`
            }));
            fields.push({ name: "Komitean johtopäätös", value: kuulustelu.johtopaatos });

            const embed = report({ title: `🎙️ KUULUSTELUPÖYTÄKIRJA — ${kohde.username}`, thumbnail: kohde.displayAvatarURL(), fields });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === "rikosrekisteri") {
            await interaction.deferReply();

            const pyydetty = interaction.options.getUser("kayttaja");
            const { kohde, kaannetty, kommentti } = ehkaKaannaKutsujaksi(interaction, pyydetty, 0.15);

            const rekisteri = await generoiRikosrekisteri(interaction.guildId, kohde.id);
            const d = rekisteri.oikeaData;

            const embed = report({
                title: `📁 RIKOSREKISTERI — ${kohde.username}`,
                description: (kaannetty ? `${kommentti}\n\n` : "") + rekisteri.komitean_mielipide,
                thumbnail: kohde.displayAvatarURL(),
                fields: [
                    { name: "💬 Viestejä yhteensä", value: formatNumber(d.viestitYhteensa), inline: true },
                    { name: "🔊 Äänikanavalla", value: formatDuration(d.aaniSekunnitYhteensa), inline: true },
                    { name: "💸 Sakkoja", value: `${d.sakkoja}`, inline: true },
                    { name: "⚖️ Syyllisyys", value: `${d.syyllisyysprosentti}%`, inline: true },
                    { name: "📁 Avoimia tutkintoja", value: `${d.avoimiaTutkintoja}`, inline: true },
                    { name: "🧾 Tuomioita", value: `${d.tuomioitaYhteensa}`, inline: true },
                    { name: "Lisäksi rekisteröidyt teot", value: rekisteri.keksitytRikokset.map(r => `• ${r}`).join("\n") }
                ]
            });

            return interaction.editReply({ embeds: [embed] });
        }

        if (sub === "kamerat") {
            const pyydetty = interaction.options.getUser("kayttaja");
            const { kohde, kaannetty, kommentti } = ehkaKaannaKutsujaksi(interaction, pyydetty, 0.15);

            const aikajana = generoiKamerat();
            const rivit = aikajana.map(r => `\`${r.time}\`  ${r.event}`).join("\n");

            const embed = report({
                title: `📹 VALVONTAKAMEROIDEN AIKAJANA — ${kohde.username}`,
                description: (kaannetty ? `${kommentti}\n\n` : "") + rivit,
                thumbnail: kohde.displayAvatarURL(),
                footer: "Kamerat eivät ole oikeita. Toivottavasti."
            });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === "psykoanalyysi") {
            const pyydetty = interaction.options.getUser("kayttaja");
            const { kohde, kaannetty, kommentti } = ehkaKaannaKutsujaksi(interaction, pyydetty, 0.15);

            const analyysi = generoiPsykoanalyysi();

            const embed = report({
                title: `🧠 PSYKOANALYYSI — ${kohde.username}`,
                description: kaannetty ? kommentti : undefined,
                thumbnail: kohde.displayAvatarURL(),
                fields: [
                    ...analyysi.palkit.map(rivi => ({ name: "\u200B", value: rivi, inline: false })),
                    { name: "Diagnoosi", value: analyysi.diagnoosi },
                    { name: "Riskiluokka", value: analyysi.riskiluokka }
                ]
            });

            return interaction.reply({ embeds: [embed] });
        }
    }
};
