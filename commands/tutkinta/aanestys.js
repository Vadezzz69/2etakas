const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");
const {
    aloitaAanestys,
    annaAani,
    haeAanestysTulos,
    suljeAanestys,
    lisaaSyyllisyytta,
    kirjaaTuomio
} = require("../../utils/tutkintadata");
const { VARIT } = require("../../utils/tyyli");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("aanestys")
        .setDescription("Käynnistää komitean syyllisyysäänestyksen kohteesta.")
        .addUserOption(option =>
            option.setName("kayttaja").setDescription("Kenestä äänestetään").setRequired(true)
        )
        .addStringOption(option =>
            option.setName("kysymys").setDescription("Mistä äänestetään").setRequired(false)
        )
        .addIntegerOption(option =>
            option
                .setName("kesto_sekuntia")
                .setDescription("Äänestyksen kesto sekunteina (oletus 60, max 600)")
                .setMinValue(15)
                .setMaxValue(600)
                .setRequired(false)
        ),

    async execute(interaction) {

        const kohde = interaction.options.getUser("kayttaja");
        const kysymys = interaction.options.getString("kysymys") ?? "Onko kohde syyllinen?";
        const kestoSekuntia = interaction.options.getInteger("kesto_sekuntia") ?? 60;

        const voteId = await aloitaAanestys(
            interaction.guildId,
            kohde.id,
            interaction.user.id,
            kysymys,
            kestoSekuntia * 1000
        );

        const rivi = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`aanestys_syyllinen_${voteId}`).setLabel("Syyllinen").setStyle(ButtonStyle.Danger).setEmoji("⚖️"),
            new ButtonBuilder().setCustomId(`aanestys_viaton_${voteId}`).setLabel("Viaton").setStyle(ButtonStyle.Success).setEmoji("🕊️")
        );

        const embed = new EmbedBuilder()
            .setColor(VARIT.VAROITUS)
            .setTitle(`⚖️ Äänestys #${voteId} käynnissä`)
            .setDescription(`**Kohde:** ${kohde}\n**Kysymys:** ${kysymys}\n\nÄänestysaikaa: ${kestoSekuntia} sekuntia.`)
            .setFooter({ text: "Yksi ääni per henkilö. Voit vaihtaa ääntäsi äänestyksen aikana." });

        const viesti = await interaction.reply({ embeds: [embed], components: [rivi], fetchReply: true });

        const kerays = viesti.createMessageComponentCollector({ time: kestoSekuntia * 1000 });

        kerays.on("collect", async (napinPainaja) => {

            const valinta = napinPainaja.customId.startsWith("aanestys_syyllinen_") ? "syyllinen" : "viaton";

            await annaAani(voteId, napinPainaja.user.id, valinta);

            const tulokset = await haeAanestysTulos(voteId);
            const syyllisia = tulokset.find(t => t.choice === "syyllinen")?.maara ?? 0;
            const viattomia = tulokset.find(t => t.choice === "viaton")?.maara ?? 0;

            await napinPainaja.reply({
                content: `Äänesi (**${valinta}**) rekisteröitiin. Tilanne juuri nyt: ⚖️ ${syyllisia} — 🕊️ ${viattomia}`,
                ephemeral: true
            });

        });

        kerays.on("end", async () => {

            const tulokset = await haeAanestysTulos(voteId);
            const syyllisia = tulokset.find(t => t.choice === "syyllinen")?.maara ?? 0;
            const viattomia = tulokset.find(t => t.choice === "viaton")?.maara ?? 0;

            await suljeAanestys(voteId);

            let lopputulos;
            let deltaSyyllisyys;

            if (syyllisia === 0 && viattomia === 0) {
                lopputulos = "Kukaan ei äänestänyt. Komitea pitää tätä itsessään epäilyttävänä.";
                deltaSyyllisyys = 3;
            } else if (syyllisia > viattomia) {
                lopputulos = `Komitea äänesti: **SYYLLINEN** (${syyllisia} vs ${viattomia}).`;
                deltaSyyllisyys = 12;
            } else if (viattomia > syyllisia) {
                lopputulos = `Komitea äänesti: **VIATON** (${viattomia} vs ${syyllisia}).`;
                deltaSyyllisyys = -8;
            } else {
                lopputulos = `Tasapeli (${syyllisia} vs ${syyllisia}). Komitea ei saanut päätöstä aikaan.`;
                deltaSyyllisyys = 5;
            }

            await lisaaSyyllisyytta(
                interaction.guildId,
                kohde.id,
                deltaSyyllisyys,
                `Äänestys #${voteId}: ${kysymys}`
            );

            await kirjaaTuomio(interaction.guildId, kohde.id, lopputulos, `äänestys #${voteId}`, false);

            const lopetusEmbed = new EmbedBuilder()
                .setColor(VARIT.AKSENTTI)
                .setTitle(`⚖️ Äänestys #${voteId} päättyi`)
                .setDescription(
                    `**Kohde:** ${kohde}\n**Kysymys:** ${kysymys}\n\n` +
                    `⚖️ Syyllinen: **${syyllisia}**\n🕊️ Viaton: **${viattomia}**\n\n` +
                    `**Lopputulos:** ${lopputulos}`
                )
                .setFooter({ text: `Syyllisyysprosentti muuttui: ${deltaSyyllisyys >= 0 ? "+" : ""}${deltaSyyllisyys}` });

            const suljetutNapit = new ActionRowBuilder().addComponents(
                ButtonBuilder.from(rivi.components[0]).setDisabled(true),
                ButtonBuilder.from(rivi.components[1]).setDisabled(true)
            );

            await interaction.editReply({ embeds: [lopetusEmbed], components: [suljetutNapit] });

        });

    }
};
