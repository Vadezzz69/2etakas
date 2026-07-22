const { SlashCommandBuilder } = require("discord.js");
const { report } = require("../../utils/ui");
const { generoiTakavarikko } = require("../../utils/comedy");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("takavarikko")
        .setDescription("Komitea takavarikoi kohteen omaisuutta ilman kunnollista perustetta.")
        .addUserOption(option =>
            option.setName("kayttaja").setDescription("Kenen omaisuus takavarikoidaan").setRequired(true)
        ),

    async execute(interaction) {

        const kohde = interaction.options.getUser("kayttaja");
        const esineet = generoiTakavarikko();

        const embed = report({
            title: `📦 TAKAVARIKKOPÖYTÄKIRJA — ${kohde.username}`,
            description: `Seuraava omaisuus on takavarikoitu toistaiseksi:`,
            thumbnail: kohde.displayAvatarURL(),
            fields: [
                { name: `Takavarikoitu (${esineet.length} kpl)`, value: esineet.map(e => `• ${e}`).join("\n") }
            ],
            footer: "Omaisuus palautetaan kun komitea muistaa minne se laitettiin."
        });

        await interaction.reply({ embeds: [embed] });

    }
};
