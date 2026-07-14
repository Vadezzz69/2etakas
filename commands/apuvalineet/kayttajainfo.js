const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { VARIT } = require("../../utils/tyyli");
const {
    kayttajanViestitYhteensa,
    kayttajanViestitTanaan,
    kayttajanAaniYhteensaElavana,
    kayttajanKomentojaYhteensa,
    kayttajanSuosikkiKomento,
    kayttajanViestisija
} = require("../../utils/tilastot");
const { valitseRoast } = require("../../utils/roastdata");
const { ehkaKaannaKutsujaksi } = require("../../utils/trolli");

function muotoileAika(sekunnit) {
    const tunnit = Math.floor(sekunnit / 3600);
    const minuutit = Math.round((sekunnit % 3600) / 60);
    if (tunnit === 0) return `${minuutit} min`;
    return `${tunnit} h ${minuutit} min`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("kayttajainfo")
        .setDescription("Näyttää tietoa käyttäjästä — Discord-tiedot + oikea palvelinaktiivisuus.")
        .addUserOption(option =>
            option
                .setName("kayttaja")
                .setDescription("Käyttäjä jonka tiedot haetaan (oletus: sinä)")
                .setRequired(false)
        ),

    async execute(interaction) {

        await interaction.deferReply();

        const pyydetty = interaction.options.getUser("kayttaja") ?? interaction.user;

        // Komitea saattaa silloin tällöin kääntää tutkan takaisin kysyjään itseensä.
        const { kohde: user, kaannetty, kommentti } = ehkaKaannaKutsujaksi(interaction, pyydetty, 0.18);

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        const [viestitYhteensa, viestitTanaan, aaniYhteensa, komentojaYhteensa, suosikkiKomento, sijaTieto] =
            await Promise.all([
                kayttajanViestitYhteensa(interaction.guildId, user.id),
                kayttajanViestitTanaan(interaction.guildId, user.id),
                kayttajanAaniYhteensaElavana(interaction.guildId, user.id),
                kayttajanKomentojaYhteensa(interaction.guildId, user.id),
                kayttajanSuosikkiKomento(interaction.guildId, user.id),
                kayttajanViestisija(interaction.guildId, user.id)
            ]);

        const roast = valitseRoast({
            viestitYhteensa,
            aaniSekunnitYhteensa: aaniYhteensa
        });

        const roolit = member
            ? [...member.roles.cache.values()]
                .filter(r => r.id !== interaction.guild.id)
                .sort((a, b) => b.position - a.position)
            : [];

        const embed = new EmbedBuilder()
            .setColor(VARIT.PERUS)
            .setTitle(`🕵️ Salainen tiedosto — ${user.tag}`)
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                {
                    name: "Liittyi Discordiin",
                    value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`,
                    inline: true
                },
                {
                    name: "Liittyi palvelimelle",
                    value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>` : "Ei tiedossa",
                    inline: true
                },
                {
                    name: "Rooleja",
                    value: roolit.length ? `${roolit.length}` : "Ei yhtään",
                    inline: true
                },
                {
                    name: "💬 Viestejä yhteensä",
                    value: `${viestitYhteensa}`,
                    inline: true
                },
                {
                    name: "📅 Viestejä tänään",
                    value: `${viestitTanaan}`,
                    inline: true
                },
                {
                    name: "🔊 Aikaa äänikanavalla",
                    value: muotoileAika(aaniYhteensa),
                    inline: true
                },
                {
                    name: "⚙️ Komentoja käytetty",
                    value: `${komentojaYhteensa}`,
                    inline: true
                },
                {
                    name: "⭐ Suosikkikomento",
                    value: suosikkiKomento ? `/${suosikkiKomento.command} (${suosikkiKomento.count}x)` : "Ei vielä yhtään",
                    inline: true
                },
                {
                    name: "🏆 Sija viestitilastossa",
                    value: sijaTieto.sija ? `#${sijaTieto.sija} / ${sijaTieto.jasenmaara}` : "Ei sijoitusta vielä",
                    inline: true
                },
                {
                    name: "📁 Komitean huomio",
                    value: roast
                }
            )
            .setFooter({ text: "Kaikki tilastot perustuvat oikeaan palvelinaktiivisuuteen." })
            .setTimestamp();

        if (kaannetty) {
            embed.setDescription(`${kommentti}\n\n*(Pyysit tietoja käyttäjästä ${pyydetty}, mutta komitea päätti toisin.)*`);
        }

        await interaction.editReply({ embeds: [embed] });

    }
};
