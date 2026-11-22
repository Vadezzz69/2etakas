const { SlashCommandBuilder } = require("discord.js");
const { haeKappaleet, MusiikkiVirhe } = require("../../utils/musiikki/lahteet");
const { asetukset } = require("../../utils/musiikki/config");
const { valmisteleSoitto, haeTaiLuoSoitin } = require("../../utils/musiikki/ohjain");
const { lisattyEmbed } = require("../../utils/musiikki/muotoilu");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("soita")
        .setDescription("Soittaa musiikkia äänikanavalla: hakusana tai linkki (YouTube, SoundCloud, Spotify ym.).")
        .addStringOption(option =>
            option
                .setName("haku")
                .setDescription("Kappaleen nimi tai linkki")
                .setRequired(true)
                .setMaxLength(500)
        )
        .addStringOption(option =>
            option
                .setName("lahde")
                .setDescription("Mistä nimihaku tehdään (oletus: palvelimen oletus)")
                .setRequired(false)
                .addChoices(
                    { name: "YouTube", value: "youtube" },
                    { name: "SoundCloud", value: "soundcloud" }
                )
        ),

async execute(interaction) {

    // Kuitataan komento heti, ennen mahdollisia API-pyyntöjä.
    await interaction.deferReply();

    const valmis = await valmisteleSoitto(interaction);
    if (!valmis) return;

    const { kanava } = valmis;

        try {
            const haku = await haeKappaleet(interaction.options.getString("haku"), {
                pyytaja: interaction.user.id,
                hakulahde: interaction.options.getString("lahde") ?? undefined,
                asetukset: asetukset()
            });

            if (!haku.kappaleet.length) {
                const syy = haku.hylatty
                    ? "Kaikki löydetyt kappaleet olivat suoria lähetyksiä tai liian pitkiä."
                    : "Mitään ei löytynyt tällä haulla.";
                return interaction.editReply(syy);
            }

            // Soitin haetaan vasta nyt: haun aikana toinen käyttäjä on voinut luoda sen.
            const soitin = haeTaiLuoSoitin(interaction.guildId);
            soitin.tekstikanava = interaction.channel;

            try {
                await soitin.yhdista(kanava);
            } catch (err) {
                if (!soitin.nyt && soitin.jono.length === 0) soitin.lopeta();
                throw err;
            }

            const tulos = soitin.lisaa(haku.kappaleet);

            await interaction.editReply({
                embeds: [lisattyEmbed({
                    ...tulos,
                    hylatty: haku.hylatty,
                    lahde: haku.lahde,
                    jonoPituus: soitin.jono.length + (soitin.nyt ? 1 : 0)
                })]
            });

        } catch (err) {
            if (err instanceof MusiikkiVirhe) {
                return interaction.editReply(`⚠️ ${err.message}`);
            }
            throw err;
        }

    }
};
