const { SlashCommandBuilder } = require("discord.js");
const { report } = require("../../utils/ui");
const { paivanRikos } = require("../../utils/comedy");
const { tanaanHelsingissa } = require("../../utils/time");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("paivanrikos")
        .setDescription("Näyttää päivän virallisen rikoksen (sama koko päivän ajan)."),

    async execute(interaction) {

        const pvm = tanaanHelsingissa();
        const rikos = paivanRikos(pvm);

        const embed = report({
            title: "🗓️ Päivän rikos",
            description: `Tänään (${pvm}) rekisteröity rikos:\n\n**"...${rikos}."**`,
            footer: "Sama rikos koko päivän — vaihtuu huomenna Suomen ajassa."
        });

        await interaction.reply({ embeds: [embed] });

    }
};
