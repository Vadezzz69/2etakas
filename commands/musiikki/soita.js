const { MessageFlags, SlashCommandBuilder } = require("discord.js");
const { randomUUID } = require("node:crypto");
const { haeKappaleet, MusiikkiVirhe } = require("../../utils/musiikki/lahteet");
const { asetukset } = require("../../utils/musiikki/config");
const { valmisteleSoitto, haeTaiLuoSoitin, kayttajanAaniKanavaId } = require("../../utils/musiikki/ohjain");
const UI = require("../../utils/musiikki/muotoilu");

const VALINTA_AIKARAJA_MS = 60_000;
const kasitellytInteraktiot = new Set();

function jononKokonaispituus(soitin) {
    return soitin ? soitin.jono.length + (soitin.nyt ? 1 : 0) : null;
}

async function valitseHakutulos(interaction, haku) {
    if (haku.kappaleet.length === 1) return haku.kappaleet[0];

    const valintaId = `musiikki-haku-${randomUUID()}`;
    const peruutusId = `${valintaId}-peruuta`;
    await interaction.editReply(UI.hakuNakyma(haku.kappaleet, valintaId, peruutusId));

    const viesti = await interaction.fetchReply();
    const kerain = viesti.createMessageComponentCollector({
        filter: valinta => {
            if (valinta.customId !== valintaId && valinta.customId !== peruutusId) return false;
            if (valinta.user.id === interaction.user.id) return true;
            void valinta.reply({
                ...UI.virhe("Vain haun tehnyt käyttäjä voi valita kappaleen."),
                flags: MessageFlags.Ephemeral
            }).catch(() => {});
            return false;
        },
        time: VALINTA_AIKARAJA_MS,
        max: 1
    });

    return new Promise((resolve, reject) => {
        kerain.once("collect", async valinta => {
            try {
                await valinta.deferUpdate();
                const kappale = haku.kappaleet[Number(valinta.values?.[0])];
                if (valinta.customId === peruutusId || !kappale) {
                    await interaction.editReply(UI.onnistui("Haku peruutettu", "Voit tehdä uuden haun komennolla /soita."));
                    return resolve(null);
                }
                await interaction.editReply(UI.onnistui("Lisätään jonoon", UI.nimi(kappale)));
                resolve(kappale);
            } catch (err) {
                reject(err);
            }
        });
        kerain.once("end", (keratyt, syy) => {
            if (keratyt.size > 0) return;
            if (syy === "time") {
                interaction.editReply(UI.virhe("Valinta vanheni. Tee uusi haku komennolla /soita.")).then(() => resolve(null), reject);
            } else {
                resolve(null);
            }
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
                .setDescription("Kappaleen nimi tai linkki, tai linkki soittolistaan")
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

    async execute(interaction, modal = {}) {
        const { id } = interaction;
        if (id) {
            if (kasitellytInteraktiot.has(id)) return;
            kasitellytInteraktiot.add(id);
            setTimeout(() => kasitellytInteraktiot.delete(id), 15 * 60_000).unref();
        }
        await interaction.deferReply();

        const valmis = await valmisteleSoitto(interaction);
        if (!valmis) return;

        const { kanava } = valmis;
        let vaihe = "haku";
        let kappaleLoytyi = false;
        let jonoonLisaysKutsuttu = false;
        let jonoonLisaysOnnistui = false;
        let jonoEnnen = jononKokonaispituus(valmis.soitin);
        let soitin = null;
        let hakuId = null;

        try {
            const haku = await haeKappaleet(modal.haku ?? interaction.options?.getString("haku"), {
                pyytaja: interaction.user.id,
                hakulahde: interaction.options?.getString("lahde") ?? undefined,
                asetukset: asetukset()
            });
            hakuId = haku.hakuId ?? null;
            kappaleLoytyi = haku.kappaleet.length > 0;
            console.info("[musiikki-jono] " + JSON.stringify({
                vaihe: "haku-valmis",
                hakuId,
                loytyi: kappaleLoytyi,
                tuloksia: haku.kappaleet.length,
                jonoonLisaysKutsuttu: false
            }));

            if (!haku.kappaleet.length) {
                const syy = haku.lista
                    ? "Soittolistalta ei löytynyt soitettavia kappaleita."
                    : haku.hylatty ? "Löydetty kappale ei ole toistokelpoinen." : "Mitään ei löytynyt tällä haulla.";
                return interaction.editReply(UI.virhe(syy));
            }

            vaihe = "valinta";
            const valittu = haku.valittavat ? await valitseHakutulos(interaction, haku) : null;
            if (haku.valittavat && !valittu) {
                console.info("[musiikki-jono] " + JSON.stringify({
                    vaihe: "valinta-peruttu",
                    hakuId,
                    loytyi: kappaleLoytyi,
                    jonoonLisaysKutsuttu: false
                }));
                return;
            }
            const soittolistaId = haku.lista && haku.lahde === "YouTube" ? Symbol("YouTube-soittolista") : undefined;
            const kappaleet = valittu ? [valittu] : haku.lista
                ? haku.kappaleet.map(kappale => ({ ...kappale, soittolista: true, soittolistaId }))
                : haku.kappaleet;

            // Soitin haetaan vasta nyt: haun aikana toinen käyttäjä on voinut luoda sen.
            vaihe = "soitin";
            const tarkistaKanava = () => {
                if (kayttajanAaniKanavaId(interaction) !== kanava.id) {
                    throw new MusiikkiVirhe("Äänikanava vaihtui haun aikana. Tee haku uudelleen.");
                }
            };
            tarkistaKanava();
            soitin = haeTaiLuoSoitin(interaction.guildId,interaction.guild);

            try {
                await soitin.yhdista(kanava);
            } catch (err) {
                if (!soitin.nyt && soitin.jono.length === 0) soitin.lopeta();
                throw err;
            }

            tarkistaKanava();
            soitin.tekstikanava = interaction.channel;
            vaihe = "jonoon-lisays";
            jonoEnnen = jononKokonaispituus(soitin);
            jonoonLisaysKutsuttu = true;
            console.info("[musiikki-jono] " + JSON.stringify({
                vaihe: "lisays-alkoi",
                hakuId,
                loytyi: kappaleLoytyi,
                kappaleita: kappaleet.length,
                jonoonLisaysKutsuttu,
                jononPituusEnnen: jonoEnnen
            }));
            const tulos = soitin.lisaa(kappaleet);
            void require("../../utils/musiikki/yhteiso/store").activity(interaction.guildId,interaction.user.id,tulos.lisatyt.length,0).catch(()=>{});
            jonoonLisaysOnnistui = true;
            const jonoJalkeen = jononKokonaispituus(soitin);
            console.info("[musiikki-jono] " + JSON.stringify({
                vaihe: "lisays-valmis",
                hakuId,
                loytyi: kappaleLoytyi,
                lisatty: tulos.lisatyt.length,
                pudotettu: tulos.pudotettu,
                jonoonLisaysKutsuttu,
                onnistui: true,
                jononPituusEnnen: jonoEnnen,
                jononPituusJalkeen: jonoJalkeen
            }));

            vaihe = "vastaus";
            soitin.paivitaPaneeli?.();
            await interaction.editReply(UI.lisattyNakyma({
                ...tulos,
                lista: haku.lista,
                hylatty: haku.hylatty,
                lahde: haku.lahde,
                jonoPituus: jonoJalkeen
            }, soitin));

        } catch (err) {
            console.warn("[musiikki-jono] " + JSON.stringify({
                vaihe: jonoonLisaysOnnistui ? "jonon-lisays-valmis-vastaus-epaonnistui" : "lisays-epaonnistui",
                vaiheKohta: vaihe,
                hakuId,
                loytyi: kappaleLoytyi,
                jonoonLisaysKutsuttu,
                jonoonLisaysOnnistui,
                onnistui: jonoonLisaysOnnistui,
                jononPituusEnnen: jonoEnnen,
                jononPituusJalkeen: jononKokonaispituus(soitin ?? valmis.soitin),
                virheNimi: typeof err?.name === "string" ? err.name : null,
                virheKoodi: typeof err?.code === "string" || Number.isInteger(err?.code) ? err.code : null
            }));
            if (err instanceof MusiikkiVirhe) {
                return interaction.editReply(UI.virhe(err.message));
            }
            throw err;
        }

    }
};
