const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { report, formatDuration } = require("../../utils/ui");
const { VARIT } = require("../../utils/tyyli");
const { odota } = require("../../utils/async");
const { satunnainen, VAKOILURAPORTIT, TEHTAVAT, SALAISUUDET, hashKoodinimi } = require("../../utils/vakoiludata");
const { RIKOKSET, satunnaisVali } = require("../../utils/komiteadata");
const { analyzeUserStats } = require("../../utils/statsEngine");
const { analyzeRoastFromStats } = require("../../utils/roastEngine");
const { ehkaKaannaKutsujaksi } = require("../../utils/trolli");

function estaBotinVakoilu(interaction, pyydetty) {
    if (pyydetty.id === interaction.client.user.id) {
        return "Et voi vakoilla minua. Minä vakoilen sinua. 👁️";
    }
    return null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("vakoilu")
        .setDescription("Komitean vakoiluosaston komennot.")
        .addSubcommand(sub =>
            sub.setName("tarkkaile").setDescription("Käynnistää valvontaoperaation valittua käyttäjää vastaan. (Kattava versio)")
                .addUserOption(option => option.setName("kohde").setDescription("Kuka asetetaan valvontaan").setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName("nopea").setDescription("Nopea vakoiluhavainto tägätystä käyttäjästä. (Suppeampi versio)")
                .addUserOption(option => option.setName("kohde").setDescription("Kuka vakoillaan").setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName("raportti").setDescription("Luo palvelinaktiivisuuteen perustuvan komitearaportin. (Oikea data)")
                .addUserOption(option => option.setName("kohde").setDescription("Kenestä raportoidaan").setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName("etsintakuulutus").setDescription("Julkaisee virallisen etsintäkuulutuksen.")
                .addUserOption(option => option.setName("kohde").setDescription("Etsintäkuulutettava henkilö").setRequired(true))
        )
        .addSubcommand(sub => sub.setName("tehtava").setDescription("Arpoo sinulle salaisen komiteatehtävän."))
        .addSubcommand(sub =>
            sub.setName("koodinimi").setDescription("Paljastaa sinun (tai jonkun muun) virallisen vakoojan koodinimen.")
                .addUserOption(option => option.setName("kayttaja").setDescription("Kenen koodinimi paljastetaan (oletus: sinä)").setRequired(false))
        )
        .addSubcommand(sub => sub.setName("salaisuus").setDescription("Paljastaa yhden komitean tiukasti vartioiduista salaisuuksista."))
        .addSubcommand(sub =>
            sub.setName("itsetuho").setDescription("Käynnistää dramaattisen (ja täysin harmittoman) itsetuholaskennan.")
                .addStringOption(option => option.setName("viesti").setDescription("Viimeiset sanasi").setRequired(false))
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === "tarkkaile") {
            const pyydetty = interaction.options.getUser("kohde");
            const esto = estaBotinVakoilu(interaction, pyydetty);
            if (esto) return interaction.reply({ content: esto, ephemeral: true });

            const { kohde, kaannetty, kommentti } = ehkaKaannaKutsujaksi(interaction, pyydetty);
            const raportti = satunnainen(VAKOILURAPORTIT);
            const koodinimi = hashKoodinimi(kohde.id);

            const embed = new EmbedBuilder()
                .setColor(VARIT.AKSENTTI)
                .setTitle("📡 Valvontaraportti")
                .setThumbnail(kohde.displayAvatarURL())
                .addFields(
                    { name: "Kohde", value: `${kohde} (koodinimi: "${koodinimi}")` },
                    { name: "Havainto", value: raportti },
                    { name: "Raportoija", value: `${interaction.user}`, inline: true },
                    { name: "Luottamustaso", value: `${Math.floor(Math.random() * 41) + 60}%`, inline: true }
                )
                .setFooter({ text: "TÄYSIN SALAINEN — ei jaettavaksi eteenpäin" })
                .setTimestamp();

            if (kaannetty) embed.setDescription(kommentti);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === "nopea") {
            const pyydetty = interaction.options.getUser("kohde");
            const esto = estaBotinVakoilu(interaction, pyydetty);
            if (esto) return interaction.reply({ content: esto, ephemeral: true });

            const { kohde, kaannetty, kommentti } = ehkaKaannaKutsujaksi(interaction, pyydetty);
            const havainto = satunnainen(VAKOILURAPORTIT);
            const viesti = kaannetty
                ? `${kommentti}\n\n👁️ **Havainto kohteesta** ${kohde}:\n> ${havainto}`
                : `👁️ **Havainto kohteesta** ${kohde}:\n> ${havainto}`;

            return interaction.reply(viesti);
        }

        if (sub === "raportti") {
            await interaction.deferReply();

            const pyydetty = interaction.options.getUser("kohde");
            const esto = estaBotinVakoilu(interaction, pyydetty);
            if (esto) return interaction.editReply(esto);

            const { kohde: user, kaannetty, kommentti } = ehkaKaannaKutsujaksi(interaction, pyydetty);
            const analysis = await analyzeUserStats(interaction.guildId, user.id);
            const userStats = analysis.roastContext;
            const roast = analyzeRoastFromStats(analysis.roastContext);

            const embed = report({
                title: "📄 Komitean raportti",
                thumbnail: user.displayAvatarURL(),
                description: kaannetty ? kommentti : analysis.summary,
                fields: [
                    { name: "Kohde", value: `${user} ("${hashKoodinimi(user.id)}")` },
                    { name: "Viestejä tänään", value: `${userStats.messages.today}`, inline: true },
                    { name: "Äänikanavalla", value: formatDuration(userStats.voice.todaySeconds), inline: true },
                    { name: "Riskitaso", value: analysis.risk, inline: true },
                    { name: "Komitean huomio", value: roast.text },
                    { name: "Merkinnät", value: analysis.badges.join(" • ") || "Ei erityisiä merkintöjä" }
                ]
            });

            return interaction.editReply({ embeds: [embed] });
        }

        if (sub === "etsintakuulutus") {
            const pyydetty = interaction.options.getUser("kohde");
            const esto = estaBotinVakoilu(interaction, pyydetty);
            if (esto) return interaction.reply({ content: esto, ephemeral: true });

            const { kohde, kaannetty, kommentti } = ehkaKaannaKutsujaksi(interaction, pyydetty);
            const koodinimi = hashKoodinimi(kohde.id);
            const rikos = satunnainen(RIKOKSET);
            const palkkio = satunnaisVali(50, 5000);

            const embed = new EmbedBuilder()
                .setColor(VARIT.PERUS)
                .setTitle("🚨 ETSINTÄKUULUTUS 🚨")
                .setThumbnail(kohde.displayAvatarURL())
                .setDescription(
                    (kaannetty ? `${kommentti}\n\n` : "") +
                    `**Nimi:** ${kohde.username}\n**Koodinimi:** "${koodinimi}"\n**Epäilty rikos:** ${rikos}\n\n` +
                    `💰 **Palkkio:** ${palkkio} komitea-kolikkoa (elävänä tai — mieluummin — kahvikupposen kanssa)`
                )
                .setFooter({ text: "Vihjeet vastaanotetaan mielellään yksityisviestillä komitealle." });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === "tehtava") {
            const tehtava = satunnainen(TEHTAVAT);
            const koodinimi = hashKoodinimi(interaction.user.id);

            const embed = new EmbedBuilder()
                .setColor(VARIT.AKSENTTI)
                .setTitle("📋 Uusi tehtävä vastaanotettu")
                .setDescription(`Agentti **${koodinimi}**, komitea on hyväksynyt sinulle seuraavan operaation:`)
                .addFields(
                    { name: "Operaation nimi", value: tehtava.nimi },
                    { name: "Vaikeustaso", value: tehtava.vaikeus, inline: true },
                    { name: "Palkkio onnistumisesta", value: tehtava.palkkio, inline: true }
                )
                .setFooter({ text: "Tämä viesti tuhoutuu itsestään... teoriassa." });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === "koodinimi") {
            const user = interaction.options.getUser("kayttaja") ?? interaction.user;
            const koodinimi = hashKoodinimi(user.id);

            const embed = new EmbedBuilder()
                .setColor(VARIT.PERUS)
                .setTitle("🕵️ Salainen tiedosto")
                .setDescription(
                    `**${user.username}** tunnetaan komiteassa koodinimellä:\n\n## "${koodinimi}"\n\n` +
                    `*Tämä tieto on luokiteltu. Sen paljastaminen ulkopuolisille on vastoin komitean sääntöjä.*`
                )
                .setThumbnail(user.displayAvatarURL());

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === "salaisuus") {
            const salaisuus = satunnainen(SALAISUUDET);

            const embed = new EmbedBuilder()
                .setColor(VARIT.PERUS)
                .setTitle("🔓 LUOKITELTU — Taso Omega")
                .setDescription(`||${salaisuus}||`)
                .setFooter({ text: "Klikkaa paljastaaksesi. Unohda heti lukemisen jälkeen." });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === "itsetuho") {
            const viimeisetSanat = interaction.options.getString("viesti");

            await interaction.reply("🚨 **ITSETUHOMEKANISMI AKTIVOITU** 🚨");
            await odota(1200);

            for (let i = 5; i >= 1; i--) {
                await interaction.editReply(`🚨 **ITSETUHO: ${i}...** 🚨`);
                await odota(1000);
            }

            return interaction.editReply(
                `💥 **PUM!** 💥\n\nOnneksi tämä oli vain simulaatio. Komitea ei ole (vielä) valmis menettämään tätä kanavaa.` +
                (viimeisetSanat ? `\n\n*Viimeiset sanat: "${viimeisetSanat}"*` : "")
            );
        }
    }
};
