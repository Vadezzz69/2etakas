const { SlashCommandBuilder } = require("discord.js");
const { report, warning, ranking, renderLeaderboard } = require("../../utils/ui");
const { SAKKO_YKSIKOT, satunnainen, satunnaisVali } = require("../../utils/komiteadata");
const { kirjaaSakko, haeSuurimmatSakot } = require("../../utils/tutkintadata");
const { generoiFeikkisakko } = require("../../utils/comedy");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("sakko")
        .setDescription("Sakkoihin liittyvät komennot.")
        .addSubcommand(sub =>
            sub.setName("anna").setDescription("Antaa käyttäjälle kuvitteellisen sakon. Kirjautuu sakkorekisteriin.")
                .addUserOption(option => option.setName("kayttaja").setDescription("Sakotettava käyttäjä").setRequired(true))
                .addStringOption(option => option.setName("syy").setDescription("Sakon syy").setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName("feikki").setDescription("Tulostaa täysin kuvitteellisen sakkolapun. EI kirjaudu sakkorekisteriin.")
                .addUserOption(option => option.setName("kayttaja").setDescription("Sakotettava").setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName("top").setDescription("Näyttää palvelimen eniten sakkoja saaneet käyttäjät.")
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === "anna") {
            const kayttaja = interaction.options.getUser("kayttaja");
            const syy = interaction.options.getString("syy") ?? "yleinen epäilyttävä käytös";
            const summa = satunnaisVali(5, 500);
            const yksikko = satunnainen(SAKKO_YKSIKOT);

            await kirjaaSakko(interaction.guildId, kayttaja.id, summa, yksikko, syy, interaction.user.id);

            const embed = report({
                title: "💸 Sakkolappu",
                description: `${kayttaja} on määrätty maksamaan sakkoa.\n\n**Summa:** ${summa} ${yksikko}\n**Syy:** ${syy}`,
                footer: "Maksu erääntyy heti. Maksutapoja ei valitettavasti ole."
            });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === "feikki") {
            const kohde = interaction.options.getUser("kayttaja");
            const sakko = generoiFeikkisakko();

            const embed = warning({
                title: "🎫 SAKKOLAPPU — ei virallinen",
                description: `Asianumero: **#${sakko.asianumero}**`,
                fields: [
                    { name: "Kohde", value: `${kohde}`, inline: true },
                    { name: "Summa", value: `${sakko.summa} ${sakko.yksikko}`, inline: true },
                    { name: "Syy", value: sakko.syy }
                ],
                footer: "Tämä lappu ei ole oikea sakko eikä vaikuta syyllisyysprosenttiin. Käytä /sakko anna oikeaan."
            });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === "top") {
            const lista = await haeSuurimmatSakot(interaction.guildId, 10);

            if (!lista.length) {
                return interaction.reply("💸 Sakkoja ei ole vielä annettu.");
            }

            const embed = ranking({
                title: "💸 Komitean sakkotilasto",
                description: renderLeaderboard(lista, r => `**${r.sakkoja} sakkoa**`)
            });

            return interaction.reply({ embeds: [embed] });
        }
    }
};
