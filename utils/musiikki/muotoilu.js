const { info, warning } = require("../ui");
const { palkki } = require("../tyyli");
const { satunnainen } = require("../satunnainen");
const V = require("./viestit");

/** Poistaa Markdown-muotoilun ja linkkimerkit kappaleen nimestä (nimet tulevat verkosta). */
function turvallinen(teksti) {
    return String(teksti ?? "")
        .replace(/([\\`*_~|>[\]()#])/g, "\\$1")
        .replace(/@/g, "@\u200b"); // ei pingejä (@everyone, @here, <@id>)
}

function aika(sekunnit) {
    if (!Number.isFinite(sekunnit)) return "?:??";
    const s = Math.max(0, Math.floor(sekunnit));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sek = String(s % 60).padStart(2, "0");
    return h ? `${h}:${String(m).padStart(2, "0")}:${sek}` : `${m}:${sek}`;
}

function nimi(kappale) {
    const otsikko = turvallinen(kappale.otsikko);
    const teksti = kappale.url ? `[${otsikko}](${kappale.url})` : otsikko;
    return kappale.artisti ? `${teksti} — ${turvallinen(kappale.artisti)}` : teksti;
}

function rivi(kappale) {
    return `${nimi(kappale)} \`${aika(kappale.kesto)}\``;
}

function soiEmbed(kappale, jonossa) {
    return info({
        title: satunnainen(V.SOI_OTSIKOT),
        description: nimi(kappale),
        thumbnail: kappale.kuva ?? undefined,
        fields: [
            { name: "Kesto", value: aika(kappale.kesto), inline: true },
            { name: "Lähde", value: kappale.lahde, inline: true },
            { name: "Jonossa", value: `${jonossa}`, inline: true }
        ].concat(kappale.pyytaja ? [{ name: "Pyysi", value: `<@${kappale.pyytaja}>`, inline: true }] : [])
    });
}

/** Vastaus /soita-komennolle. */
function lisattyEmbed({ lisatyt, pudotettu, hylatty, soiHeti, lahde, jonoPituus }) {
    const ensimmainen = lisatyt[0];
    const monta = lisatyt.length > 1;

    const kuvaus = monta
        ? lisatyt.slice(0, 8).map((k, i) => `${i + 1}. ${rivi(k)}`).join("\n") + (lisatyt.length > 8 ? `\n… ja ${lisatyt.length - 8} muuta` : "")
        : rivi(ensimmainen);

    const lisat = [];
    if (pudotettu > 0) lisat.push(`${pudotettu} kappaletta ei mahtunut jonoon.`);
    if (hylatty > 0) lisat.push(`${hylatty} kappaletta ohitettiin (suora lähetys tai liian pitkä).`);
    if (lahde === "Spotify") lisat.push("Spotifyn ääntä ei voi soittaa, joten kappaleet haetaan nimellä YouTubesta tai SoundCloudista. Joskus löytyy väärä versio.");

    return info({
        title: monta ? `➕ ${lisatyt.length} kappaletta jonoon` : satunnainen(soiHeti ? V.SOI_OTSIKOT : V.LISATTY_OTSIKOT),
        description: kuvaus + (lisat.length ? `\n\n*${lisat.join(" ")}*` : ""),
        thumbnail: !monta && ensimmainen.kuva ? ensimmainen.kuva : undefined,
        fields: [{ name: "Jonossa yhteensä", value: `${jonoPituus}`, inline: true }]
    });
}

function jonoEmbed(soitin) {
    const rivit = soitin.jono.slice(0, 10).map((k, i) => `${i + 1}. ${rivi(k)}`);
    const lisaa = soitin.jono.length > 10 ? `\n… ja ${soitin.jono.length - 10} muuta` : "";
    const kokonaisKesto = soitin.jono.reduce((summa, k) => summa + (k.kesto ?? 0), 0);

    const kentat = [];

    if (soitin.nyt) kentat.push({ name: "▶️ Nyt soi", value: rivi(soitin.nyt) });
    kentat.push({
        name: soitin.jono.length ? `Jonossa (${soitin.jono.length})` : "Jonossa",
        value: soitin.jono.length ? rivit.join("\n") + lisaa : satunnainen(V.JONO_TYHJA)
    });
    kentat.push({ name: "Toisto", value: soitin.silmukka, inline: true });
    if (soitin.jono.length) kentat.push({ name: "Jonon kesto", value: aika(kokonaisKesto), inline: true });

    return info({ title: "🎵 Musiikkijono", fields: kentat });
}

function nytEmbed({ kappale, kulunutS, tauolla }) {
    const prosentti = kappale.kesto ? Math.min(100, (kulunutS / kappale.kesto) * 100) : 0;
    const ajat = kappale.kesto ? `${aika(kulunutS)} / ${aika(kappale.kesto)}` : aika(kulunutS);

    return info({
        title: tauolla ? "⏸️ Tauolla" : satunnainen(V.SOI_OTSIKOT),
        description: `${nimi(kappale)}\n\n${palkki(prosentti, 16)}  \`${ajat}\``,
        thumbnail: kappale.kuva ?? undefined,
        fields: [
            { name: "Lähde", value: kappale.lahde, inline: true },
            ...(kappale.pyytaja ? [{ name: "Pyysi", value: `<@${kappale.pyytaja}>`, inline: true }] : [])
        ]
    });
}

/** Soittimen automaattiset ilmoitukset tekstikanavalle. */
function ilmoitus(tapahtuma, soitin) {
    switch (tapahtuma.tyyppi) {
        case "soi":
            return { embeds: [soiEmbed(tapahtuma.kappale, soitin.jono.length)] };
        case "virhe": {
            const kappale = V.tayta(satunnainen(V.KAPPALE_VIRHE), { otsikko: turvallinen(tapahtuma.kappale.otsikko) });
            const kuvaus = tapahtuma.viesti
                ? `${kappale}\n\n${turvallinen(tapahtuma.viesti)}`
                : kappale;
            return { embeds: [warning({ description: kuvaus })] };
        }
        case "jono_loppui":
            return { content: satunnainen(V.JONO_LOPPUI) };
        case "poistu":
            return { content: satunnainen(tapahtuma.syy === "yksin" ? V.POISTU_YKSIN : V.POISTU_JONO) };
        default:
            return null;
    }
}

module.exports = { turvallinen, aika, nimi, rivi, soiEmbed, lisattyEmbed, jonoEmbed, nytEmbed, ilmoitus };
