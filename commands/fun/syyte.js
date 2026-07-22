const { SlashCommandBuilder } = require("discord.js");
const { warning } = require("../../utils/ui");
const { generoiSyyte } = require("../../utils/comedy");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("syyte")
        .setDescription("Nostaa virallisen syytteen kohdetta vastaan.")
        .addUserOption(option =>
            option.setName("kayttaja").setDescription("Syytetty").setRequired(true)
        ),

    async execute(interaction) {

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

        await interaction.reply({ embeds: [embed] });

    }
};
