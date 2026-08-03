const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { aktiivisinKirjoittaja, aktiivisinAanikanavassaElavana, aktiivisinKomennoissa } = require("../../utils/tilastot");
const { RANGAISTUKSET, RIKOKSET, ONKO_KOMMENTIT_KYLLA, ONKO_KOMMENTIT_EI, satunnainen, satunnaisVali } = require("../../utils/komiteadata");
const { VARIT } = require("../../utils/tyyli");
const { formatProgressBar } = require("../../utils/ui");
const { kirjaaTuomio, lisaaSyyllisyytta } = require("../../utils/tutkintadata");

function epailymittariKommentti(prosentti) {
    if (prosentti < 20) return "Puhtaampi kuin komitean pöytäkirja.";
    if (prosentti < 50) return "Vähän epäilyttävää, mutta ei mitään hälyttävää.";
    if (prosentti < 80) return "Komitea pitää silmällä.";
    return "Erittäin epäilyttävää. Suositellaan välitöntä valvontaa.";
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("komitea")
        .setDescription("Komitean satunnaiset ja oikeaan dataan perustuvat toimet.")
        .addSubcommand(sub => sub.setName("paatos").setDescription("Julkistaa tämän päivän päätöksen — oikeaan aktiivisuuteen perustuen."))
        .addSubcommand(sub =>
            sub.setName("tuomio").setDescription("Komitea antaa virallisen tuomion.")
                .addUserOption(option => option.setName("kayttaja").setDescription("Tuomittava käyttäjä").setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName("sus").setDescription("Mittaa käyttäjän epäilyttävyysprosentin.")
                .addUserOption(option => option.setName("kayttaja").setDescription("Kuka mitataan").setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName("onko").setDescription("Kysy komitealta kysymys tägätystä käyttäjästä.")
                .addUserOption(option => option.setName("kayttaja").setDescription("Kenestä kysytään").setRequired(true))
                .addStringOption(option => option.setName("kysymys").setDescription("Mitä kysytään (esim. \"syypää tähän kaikkeen\")").setRequired(false))
        )
        .addSubcommand(sub => sub.setName("syyllinen").setDescription("Arpoo päivän syyllisen — painottaen tämän päivän aktiivisimpia."))
        .addSubcommand(sub => sub.setName("spinner").setDescription("Pyörittää ruletin ja valitsee satunnaisen jäsenen palvelimelta.")),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === "paatos") {
            await interaction.deferReply();
            const guildId = interaction.guildId;

            const [kirjoittaja, aanessa, komentaja] = await Promise.all([
                aktiivisinKirjoittaja(guildId),
                aktiivisinAanikanavassaElavana(guildId),
                aktiivisinKomennoissa(guildId)
            ]);

            const vaihtoehdot = [];
            if (kirjoittaja && kirjoittaja.count > 0) {
                vaihtoehdot.push({ userId: kirjoittaja.userId, lause: `kirjoitti tänään **${kirjoittaja.count}** viestiä` });
            }
            if (aanessa && aanessa.seconds > 0) {
                const minuutit = Math.round(aanessa.seconds / 60);
                vaihtoehdot.push({ userId: aanessa.userId, lause: `vietti äänikanavalla tänään **${minuutit}** minuuttia` });
            }
            if (komentaja && komentaja.count > 0) {
                vaihtoehdot.push({ userId: komentaja.userId, lause: `käytti botin komentoja tänään **${komentaja.count}** kertaa` });
            }

            if (vaihtoehdot.length === 0) {
                return interaction.editReply(
                    "📭 Komitea kokoontui, mutta ei löytänyt tarpeeksi tämän päivän aktiivisuutta minkään päätöksen tekemiseen. Osallistukaa keskusteluun, niin komitea palaa asiaan."
                );
            }

            const valittu = satunnainen(vaihtoehdot);
            const rangaistus = satunnainen(RANGAISTUKSET);
            const paatosnumero = satunnaisVali(100, 999);

            await kirjaaTuomio(guildId, valittu.userId, rangaistus, "/komitea paatos", false);
            await lisaaSyyllisyytta(guildId, valittu.userId, 3, `/komitea paatos: ${rangaistus}`);

            const embed = new EmbedBuilder()
                .setColor(VARIT.AKSENTTI)
                .setTitle(`🕵️ KOMITEAN PÄÄTÖS #${paatosnumero}`)
                .setDescription(`Tutkimusten mukaan <@${valittu.userId}> ${valittu.lause}.\n\n**Rangaistus:**\n${rangaistus}`)
                .setFooter({ text: "Komitean päätökset ovat lopullisia ja täysin humoristisia." })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        if (sub === "tuomio") {
            const kayttaja = interaction.options.getUser("kayttaja");
            const tuomio = satunnainen(RANGAISTUKSET);
            const asianumero = satunnaisVali(1000, 9999);

            await kirjaaTuomio(interaction.guildId, kayttaja.id, tuomio, "/komitea tuomio", false);
            await lisaaSyyllisyytta(interaction.guildId, kayttaja.id, 3, `/komitea tuomio: ${tuomio}`);

            const embed = new EmbedBuilder()
                .setColor(VARIT.AKSENTTI)
                .setTitle(`⚖️ Tuomio — asia nro ${asianumero}`)
                .setDescription(`${kayttaja} on todettu syylliseksi komitean silmissä.\n\n**Tuomio:**\n${tuomio}`)
                .setFooter({ text: "Muutoksenhaku ei ole mahdollista. Valitettavasti." });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === "sus") {
            const kayttaja = interaction.options.getUser("kayttaja");
            const prosentti = satunnaisVali(0, 100);

            const embed = new EmbedBuilder()
                .setColor(prosentti > 70 ? VARIT.AKSENTTI : prosentti > 40 ? VARIT.HARMAA : VARIT.PERUS)
                .setTitle("🔍 Epäilymittari")
                .setDescription(`${kayttaja}\n\n${formatProgressBar(prosentti)}\n\n*${epailymittariKommentti(prosentti)}*`);

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === "onko") {
            const kayttaja = interaction.options.getUser("kayttaja");
            const kysymys = interaction.options.getString("kysymys") ?? "epäilyttävä";
            const kylla = Math.random() < 0.5;
            const todennakoisyys = satunnaisVali(51, 99);
            const kommentti = satunnainen(kylla ? ONKO_KOMMENTIT_KYLLA : ONKO_KOMMENTIT_EI);

            const embed = new EmbedBuilder()
                .setColor(kylla ? VARIT.ONNISTUI : VARIT.AKSENTTI)
                .setTitle("🎱 Komitean vastaus")
                .setDescription(
                    `**Kysymys:** Onko ${kayttaja} ${kysymys}?\n\n**Vastaus:** ${kylla ? "KYLLÄ ✅" : "EI ❌"} (${todennakoisyys}% varmuudella)\n*${kommentti}*`
                );

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === "syyllinen") {
            await interaction.deferReply();
            const kirjoittaja = await aktiivisinKirjoittaja(interaction.guildId);

            let kohdeId;
            let peruste;

            if (kirjoittaja && kirjoittaja.count > 0) {
                kohdeId = kirjoittaja.userId;
                peruste = `Epäilyt heräsivät, koska kohde oli tänään palvelimen aktiivisin kirjoittaja (${kirjoittaja.count} viestiä).`;
            } else {
                const jasenet = await interaction.guild.members.fetch();
                const ehdokkaat = jasenet.filter(m => !m.user.bot);
                const arvottu = satunnainen([...ehdokkaat.values()]);
                kohdeId = arvottu.id;
                peruste = "Ei riittävästi todisteita — komitea arpoi syyllisen puhtaasti sattumanvaraisesti.";
            }

            const rikos = satunnainen(RIKOKSET);

            const embed = new EmbedBuilder()
                .setColor(VARIT.AKSENTTI)
                .setTitle("⚖️ Päivän syyllinen on löydetty")
                .setDescription(`Komitea julistaa: <@${kohdeId}> on tämän päivän syyllinen.\n\n**Epäilty rikos:** ${rikos}\n**Peruste:** ${peruste}`);

            return interaction.editReply({ embeds: [embed] });
        }

        if (sub === "spinner") {
            await interaction.deferReply();
            const jasenet = await interaction.guild.members.fetch();
            const ehdokkaat = [...jasenet.filter(m => !m.user.bot).values()];

            if (ehdokkaat.length === 0) {
                return interaction.editReply("Palvelimelta ei löytynyt yhtään ei-bottia. Outoa.");
            }

            const valittu = satunnainen(ehdokkaat);

            const embed = new EmbedBuilder()
                .setColor(VARIT.PERUS)
                .setTitle("🎡 Spinner pyörähti pysähdyksiin...")
                .setDescription(`Kohtalo valitsi: **${valittu.displayName}**! 🎉`)
                .setThumbnail(valittu.displayAvatarURL());

            return interaction.editReply({ embeds: [embed] });
        }
    }
};
