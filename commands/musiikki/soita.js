const { ActionRowBuilder, ComponentType, SlashCommandBuilder, StringSelectMenuBuilder } = require("discord.js");
const { randomUUID } = require("node:crypto");
const { haeKappaleet, MusiikkiVirhe } = require("../../utils/musiikki/lahteet");
const { asetukset } = require("../../utils/musiikki/config");
const { valmisteleSoitto, haeTaiLuoSoitin } = require("../../utils/musiikki/ohjain");
const { lisattyEmbed } = require("../../utils/musiikki/muotoilu");

const VALINTA_AIKARAJA_MS = 60_000;

function rajaa(teksti, max) {
    const siisti = String(teksti ?? "").replace(/\s+/g, " ").trim();
    return siisti.length > max ? `${siisti.slice(0, max - 1)}…` : siisti;
}

function kappaleenValinta(kappaleet, customId) {
    const valinnat = kappaleet.map((kappale, indeksi) => ({
        label: rajaa([kappale.artisti, kappale.otsikko].filter(Boolean).join(" - "), 100) || `Kappale ${indeksi + 1}`,
        description: rajaa(`${kappale.lahde} - ${kappale.kesto === null ? "kesto tuntematon" : `${Math.floor(kappale.kesto / 60)}:${String(kappale.kesto % 60).padStart(2, "0")}`}`, 100),
        value: String(indeksi)
    }));

    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder("Valitse soitettava versio")
            .addOptions(valinnat)
    );
}

async function valitseHakutulos(interaction, haku) {
    if (haku.kappaleet.length === 1) return haku.kappaleet[0];

    const customId = `musiikki-haku-${randomUUID()}`;
    await interaction.editReply({
        content: "Valitse soitettava versio:",
        embeds: [],
        components: [kappaleenValinta(haku.kappaleet, customId)]
    });

    const viesti = await interaction.fetchReply();
    const kerain = viesti.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        filter: valinta => valinta.customId === customId && valinta.user.id === interaction.user.id,
        time: VALINTA_AIKARAJA_MS,
        max: 1
    });

    return new Promise((resolve, reject) => {
        let valmis = false;
        const aseta = tulos => {
            if (valmis) return;
            valmis = true;
            resolve(tulos);
        };

        kerain.on("collect", async valinta => {
            try {
                const indeksi = Number(valinta.values[0]);
                if (!Number.isInteger(indeksi) || indeksi < 0 || indeksi >= haku.kappaleet.length) {
                    await valinta.deferUpdate();
                    await interaction.editReply({ content: "Valittua hakutulosta ei löytynyt.", components: [] });
                    aseta(null);
                    return;
                }

                await valinta.deferUpdate();
                await interaction.editReply({ content: null, components: [] });
                console.info(`[musiikki-haku] ${JSON.stringify({ hakuId: haku.hakuId, vaihe: "tulos-valittu", lahde: haku.kappaleet[indeksi].lahde, tulos: indeksi + 1 })}`);
                aseta(haku.kappaleet[indeksi]);
            } catch (err) {
                if (!valmis) {
                    valmis = true;
                    reject(err);
                }
            }
        });

        kerain.on("end", (keratyt, syy) => {
            if (valmis || syy !== "time" || keratyt.size > 0) return;
            interaction.editReply({ content: "Hakutuloksen valinta vanheni. Suorita /soita uudelleen.", components: [] })
                .then(() => aseta(null), reject);
        });
    });
}

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

            const valittu = haku.valittavat ? await valitseHakutulos(interaction, haku) : null;
            if (haku.valittavat && !valittu) return;
            const kappaleet = haku.valittavat ? [valittu] : haku.kappaleet;

            // Soitin haetaan vasta nyt: haun aikana toinen käyttäjä on voinut luoda sen.
            const soitin = haeTaiLuoSoitin(interaction.guildId);
            soitin.tekstikanava = interaction.channel;

            try {
                await soitin.yhdista(kanava);
            } catch (err) {
                if (!soitin.nyt && soitin.jono.length === 0) soitin.lopeta();
                throw err;
            }

            const tulos = soitin.lisaa(kappaleet);

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
