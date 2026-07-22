const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { haeSuurimmatSakot } = require("../../utils/tutkintadata");
const { VARIT } = require("../../utils/tyyli");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("sakkotilasto")
        .setDescription("Näyttää palvelimen eniten sakkoja saaneet käyttäjät."),

    async execute(interaction) {

        const lista = await haeSuurimmatSakot(interaction.guildId, 10);

        if (!lista.length) {
            return interaction.reply("💸 Sakkoja ei ole vielä annettu.");
        }

        const rivit = lista.map((rivi, i) => {

            let sija = `${i + 1}.`;

            if (i === 0) sija = "🥇";
            if (i === 1) sija = "🥈";
            if (i === 2) sija = "🥉";

            return `${sija} <@${rivi.userId}> — **${rivi.sakkoja} sakkoa**`;
        });

        const embed = new EmbedBuilder()
            .setColor(VARIT.AKSENTTI)
            .setTitle("💸 Komitean sakkotilasto")
            .setDescription(rivit.join("\n"))
            .setTimestamp();

        await interaction.reply({
            embeds: [embed]
        });

    }
};
