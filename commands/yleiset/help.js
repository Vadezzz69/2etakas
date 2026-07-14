const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { VARIT, BRANDI } = require("../../utils/tyyli");

const KATEGORIA_OTSIKOT = {
    yleiset: "📖 Yleiset",
    apuvalineet: "🛠️ Apuvälineet",
    moderointi: "🛡️ Moderointi",
    vakoilu: "🕵️ Vakoilu",
    komitea: "😂 Komitea & trollit",
    hauskat: "🤕 Hauskat",
    pelit: "🎮 Pelit",
    tilastot: "📊 Tilastot"
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Listaa kaikki komennot kategorioittain."),

    async execute(interaction, client) {

        const ryhmat = new Map();

        for (const cmd of client.commands.values()) {
            const kategoria = cmd.kategoria ?? "muut";
            if (!ryhmat.has(kategoria)) ryhmat.set(kategoria, []);
            ryhmat.get(kategoria).push(cmd);
        }

        const embed = new EmbedBuilder()
            .setColor(VARIT.PERUS)
            .setTitle("📖 Komiteanvakoojabotin komennot")
            .setFooter({ text: `${BRANDI.FOOTER_ICON} ${BRANDI.FOOTER_TEKSTI}` });

        for (const [kategoria, komennot] of ryhmat) {
            embed.addFields({
                name: KATEGORIA_OTSIKOT[kategoria] ?? kategoria,
                value: komennot
                    .map(cmd => `\`/${cmd.data.name}\` — ${cmd.data.description}`)
                    .join("\n")
            });
        }

        await interaction.reply({ embeds: [embed] });

    }
};
