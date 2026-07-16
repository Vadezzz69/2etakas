const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const {
    kayttajanViestitYhteensa,
    kayttajanAaniYhteensaElavana,
    kayttajanKomentojaYhteensa
} = require("../../utils/tilastot");
const { haeSyyllisyysprosentti, haeAktiivisetEpaillyt, haeTuomioidenMaara } = require("../../utils/tutkintadata");
const { laajaRoast } = require("../../utils/roastdata");
const { VARIT } = require("../../utils/tyyli");
const { ehkaKaannaKutsujaksi } = require("../../utils/trolli");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("roast")
        .setDescription("Komitean tekoälyavusteinen roast-generaattori analysoi kohteen koko historian.")
        .addUserOption(option =>
            option.setName("kayttaja").setDescription("Kuka roastataan").setRequired(true)
        ),

    async execute(interaction) {

        await interaction.deferReply();

        const pyydetty = interaction.options.getUser("kayttaja");
        const { kohde, kaannetty, kommentti } = ehkaKaannaKutsujaksi(interaction, pyydetty, 0.15);

        const [viestitYhteensa, aaniYhteensa, komentojaYhteensa, syyllisyysprosentti, epaillyt, tuomioita] =
            await Promise.all([
                kayttajanViestitYhteensa(interaction.guildId, kohde.id),
                kayttajanAaniYhteensaElavana(interaction.guildId, kohde.id),
                kayttajanKomentojaYhteensa(interaction.guildId, kohde.id),
                haeSyyllisyysprosentti(interaction.guildId, kohde.id),
                haeAktiivisetEpaillyt(interaction.guildId),
                haeTuomioidenMaara(interaction.guildId, kohde.id)
            ]);

        const onEpailty = epaillyt.some(e => e.userId === kohde.id);

        const havainnot = laajaRoast({
            viestitYhteensa,
            aaniSekunnitYhteensa: aaniYhteensa,
            komentojaYhteensa,
            syyllisyysprosentti,
            onEpailty,
            tuomioita
        });

        const embed = new EmbedBuilder()
            .setColor(VARIT.AKSENTTI)
            .setTitle(`🔥 AI-ROAST — ${kohde.username}`)
            .setThumbnail(kohde.displayAvatarURL())
            .setDescription(
                (kaannetty ? `${kommentti}\n\n` : "") +
                havainnot.map(h => `• ${h}`).join("\n")
            )
            .addFields(
                { name: "💬 Viestejä", value: `${viestitYhteensa}`, inline: true },
                { name: "🔊 Äänikanavalla", value: `${Math.round(aaniYhteensa / 60)} min`, inline: true },
                { name: "⚖️ Syyllisyys", value: `${syyllisyysprosentti}%`, inline: true }
            )
            .setFooter({ text: "Analyysi perustuu koko tallennettuun palvelinhistoriaan." })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    }
};
