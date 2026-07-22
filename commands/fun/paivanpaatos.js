const { SlashCommandBuilder } = require("discord.js");
const { report } = require("../../utils/ui");
const { paivanPaatos } = require("../../utils/comedy");
const { tanaanHelsingissa } = require("../../utils/time");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("paivanpaatos")
        .setDescription("Näyttää päivän virallisen komiteapäätöksen (sama koko päivän ajan)."),

    async execute(interaction) {

        const pvm = tanaanHelsingissa();
        const paatos = paivanPaatos(pvm);

        const embed = report({
            title: "⚖️ Päivän päätös",
            description: `Voimassa tänään (${pvm}):\n\n**${paatos}**`,
            footer: "Sama päätös koko päivän — vaihtuu huomenna Suomen ajassa."
        });

        await interaction.reply({ embeds: [embed] });

    }
};
