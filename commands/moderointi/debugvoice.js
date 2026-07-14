const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require("discord.js");

const {
    haeKaikkiAktiivisetSessiot,
    kayttajanAaniTanaan
} = require("../../utils/tilastot");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("debugvoice")
        .setDescription("Näyttää aktiiviset äänisessiot.")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        ),

    async execute(interaction) {

        const sessiot = await haeKaikkiAktiivisetSessiot();

        if (!sessiot.length) {

            return interaction.reply({

                content: "❌ Aktiivisia äänisessioita ei löytynyt.",

                ephemeral: true

            });

        }

        const embed = new EmbedBuilder()

            .setTitle("🎤 Aktiiviset äänisessiot")

            .setColor("Blue");

        for (const sessio of sessiot) {

            const member =
                await interaction.guild.members
                    .fetch(sessio.userId)
                    .catch(() => null);

            const nimi =
                member
                    ? member.user.tag
                    : sessio.userId;

            const sekunnit =
                Math.floor(
                    (Date.now() - sessio.joinedAt) / 1000
                );

            const tallennettu =
                await kayttajanAaniTanaan(
                    sessio.guildId,
                    sessio.userId
                );

            embed.addFields({

                name: nimi,

                value:
                    `🟢 Käynnissä: ${sekunnit}s\n` +
                    `💾 Tallennettu tänään: ${tallennettu}s`

            });

        }

        await interaction.reply({

            embeds: [embed],

            ephemeral: true

        });

    }

};