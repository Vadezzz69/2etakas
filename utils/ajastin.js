const { EmbedBuilder } = require("discord.js");
const { get, all } = require("./db");
const { tanaan } = require("./tilastot");
const { RANGAISTUKSET, satunnainen, satunnaisVali } = require("./komiteadata");
const { haeKaikkiAsetuksetJoillaKanava, merkitseDigestLahetetyksi, kirjaaTuomio } = require("./tutkintadata");
const { VARIT } = require("./tyyli");

const TARKISTUSVALI_MS = 10 * 60 * 1000; // 10 min
const MITALIT = ["🥇", "🥈", "🥉"];

function eilinenPvm() {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
}

async function eilisenParasKirjoittaja(guildId, pvm) {
    return get(
        `SELECT userId, count FROM message_stats WHERE guildId = ? AND date = ? ORDER BY count DESC LIMIT 1`,
        [guildId, pvm]
    );
}

async function eilisenParasAanessa(guildId, pvm) {
    return get(
        `SELECT userId, seconds FROM voice_stats WHERE guildId = ? AND date = ? ORDER BY seconds DESC LIMIT 1`,
        [guildId, pvm]
    );
}

async function eilisenParasKomentaja(guildId, pvm) {
    const alku = new Date(`${pvm}T00:00:00.000Z`).getTime();
    const loppu = alku + 24 * 60 * 60 * 1000;
    return get(
        `SELECT userId, COUNT(*) as count FROM command_usage
         WHERE guildId = ? AND timestamp >= ? AND timestamp < ?
         GROUP BY userId ORDER BY count DESC LIMIT 1`,
        [guildId, alku, loppu]
    );
}

async function eilisenViestiTop3(guildId, pvm) {
    return all(
        `SELECT userId, count FROM message_stats WHERE guildId = ? AND date = ? ORDER BY count DESC LIMIT 3`,
        [guildId, pvm]
    );
}

async function rakennaAutomaattinenTuomio(guildId, pvm) {

    const [kirjoittaja, aanessa, komentaja] = await Promise.all([
        eilisenParasKirjoittaja(guildId, pvm),
        eilisenParasAanessa(guildId, pvm),
        eilisenParasKomentaja(guildId, pvm)
    ]);

    const vaihtoehdot = [];

    if (kirjoittaja && kirjoittaja.count > 0) {
        vaihtoehdot.push({ userId: kirjoittaja.userId, lause: `kirjoitti eilen **${kirjoittaja.count}** viestiä` });
    }
    if (aanessa && aanessa.seconds > 0) {
        vaihtoehdot.push({ userId: aanessa.userId, lause: `vietti eilen äänikanavalla **${Math.round(aanessa.seconds / 60)}** minuuttia` });
    }
    if (komentaja && komentaja.count > 0) {
        vaihtoehdot.push({ userId: komentaja.userId, lause: `käytti eilen komentoja **${komentaja.count}** kertaa` });
    }

    if (!vaihtoehdot.length) return null;

    return {
        valittu: satunnainen(vaihtoehdot),
        rangaistus: satunnainen(RANGAISTUKSET),
        paatosnumero: satunnaisVali(1000, 9999)
    };

}

async function postaaDigest(guild, kanava, pvm) {

    const [tuomio, topViestit] = await Promise.all([
        rakennaAutomaattinenTuomio(guild.id, pvm),
        eilisenViestiTop3(guild.id, pvm)
    ]);

    const embed = new EmbedBuilder()
        .setColor(VARIT.AKSENTTI)
        .setTitle("🕵️ Komitean päivittäinen tiedote")
        .setDescription(`Yhteenveto eiliseltä päivältä (${pvm}).`)
        .setTimestamp();

    if (tuomio) {
        embed.addFields({
            name: `⚖️ Automaattinen päätös #${tuomio.paatosnumero}`,
            value: `<@${tuomio.valittu.userId}> ${tuomio.valittu.lause}.\n**Rangaistus:** ${tuomio.rangaistus}`
        });
        await kirjaaTuomio(guild.id, tuomio.valittu.userId, tuomio.rangaistus, "automaattinen päivätuomio", true);
    } else {
        embed.addFields({ name: "⚖️ Päätös", value: "Ei tarpeeksi eilistä aktiivisuutta päätöksen tekemiseen." });
    }

    if (topViestit.length) {
        embed.addFields({
            name: "💬 Eilisen top-kirjoittajat",
            value: topViestit
                .map((r, i) => `${MITALIT[i] ?? `${i + 1}.`} <@${r.userId}> — ${r.count} viestiä`)
                .join("\n")
        });
    }

    embed.setFooter({ text: "Kanavaa voi vaihtaa komennolla /ilmoituskanava" });

    await kanava.send({ embeds: [embed] });

}

async function ajaTarkistus(client) {

    const asetukset = await haeKaikkiAsetuksetJoillaKanava();
    const tanaanPvm = tanaan();
    const eilinen = eilinenPvm();

    for (const asetus of asetukset) {

        if (asetus.lastDigestDate === tanaanPvm) continue; // jo lähetetty tänään

        const guild = client.guilds.cache.get(asetus.guildId);
        if (!guild) continue;

        const kanava = guild.channels.cache.get(asetus.announceChannelId);
        if (!kanava) continue;

        try {
            await postaaDigest(guild, kanava, eilinen);
            await merkitseDigestLahetetyksi(asetus.guildId, tanaanPvm);
            console.log(`📨 Päivittäinen tiedote postattu palvelimelle: ${guild.name}`);
        } catch (err) {
            console.error(`❌ Digestin postaus epäonnistui palvelimelle ${guild.name}:`, err);
        }

    }

}

function kaynnistaAjastin(client) {

    // Ensimmäinen ajo pienellä viiveellä, jotta guildit/kanavat ehtivät ladata cacheen.
    setTimeout(() => {
        ajaTarkistus(client).catch(err => console.error("❌ Ajastimen ensimmäinen ajo epäonnistui:", err));
    }, 15000);

    setInterval(() => {
        ajaTarkistus(client).catch(err => console.error("❌ Ajastimen ajo epäonnistui:", err));
    }, TARKISTUSVALI_MS);

    console.log("⏰ Automaattisten päivätuomioiden ajastin käynnistetty.");

}

module.exports = { kaynnistaAjastin };
