const { SlashCommandBuilder } = require("discord.js");
const { report, warning } = require("../../utils/ui");
const { generoiSyyte, generoiTodiste, generoiLasku } = require("../../utils/comedy");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("oikeus")
        .setDescription("Komitean oikeudelliset toimet kohdetta vastaan.")
        .addSubcommand(sub =>
            sub.setName("syyte").setDescription("Nostaa virallisen syytteen kohdetta vastaan.")
                .addUserOption(option => option.setName("kayttaja").setDescription("Syytetty").setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName("todiste").setDescription("Esittää väärennetyn todisteen kohdetta vastaan.")
                .addUserOption(option => option.setName("kayttaja").setDescription("Ketä todiste koskee").setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName("lasku").setDescription("Lähettää kohteelle täysin kuvitteellisen laskun.")
                .addUserOption(option => option.setName("kayttaja").setDescription("Laskun saaja").setRequired(true))
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === "syyte") {
            const kohde = interaction.options.getUser("kayttaja");
            const syyte = generoiSyyte();

            const embed = warning({
                title: `⚖️ SYYTEASIAKIRJA — ${kohde.username}`,
                thumbnail: kohde.displayAvatarURL(),
                fields: [
                    { name: "Syyte", value: syyte.syyte },
                    { name: "Todistusaineisto", value: syyte.todiste },
                    { name: "Todistaja", value: `${syyte.todistaja} ${syyte.todistajaKommentti}` },
                    { name: "Rangaistussuositus", value: syyte.suositus }
                ]
            });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === "todiste") {
            const kohde = interaction.options.getUser("kayttaja");
            const todiste = generoiTodiste();

            const embed = report({
                title: "🗂️ Todistusaineisto",
                description: `Esitetään todisteena käyttäjää ${kohde} vastaan:`,
                fields: [{ name: "Todiste", value: todiste }],
                footer: "Todisteen alkuperää ei voida vahvistaa. Eikä sitä yritetä."
            });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === "lasku") {
            const kohde = interaction.options.getUser("kayttaja");
            const lasku = generoiLasku();
            const rivit = lasku.rivit.map(r => `${r.nimi} — ${r.summa} ${lasku.yksikko}`).join("\n");

            const embed = report({
                title: `🧾 LASKU — ${kohde.username}`,
                thumbnail: kohde.displayAvatarURL(),
                fields: [
                    { name: "Laskutettavat erät", value: rivit },
                    { name: "Yhteensä", value: `**${lasku.yhteensa} ${lasku.yksikko}**` }
                ],
                footer: "Eräpäivä: heti. Maksutapoja ei ole."
            });

            return interaction.reply({ embeds: [embed] });
        }
    }
};
