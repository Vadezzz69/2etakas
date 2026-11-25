const { info, warning } = require("../ui");
const { palkki } = require("../tyyli");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require("discord.js");

const SIVUKOKO = 10;
const TOISTOTILAN_NIMET = { pois: "Pois", kappale: "Kappale", jono: "Koko jono" };
const maininnat = { parse: [] };

function rajaa(teksti, max) {
    const siisti = String(teksti ?? "").replace(/\s+/g, " ").trim();
    return siisti.length > max ? `${siisti.slice(0, max - 1)}…` : siisti;
}

function linkki(arvo, max = 250) {
    try {
        const url = new URL(arvo);
        if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.href.length > max) return;
        if (url.searchParams.has("secret_token") || /\/s-[^/]+\/?$/.test(url.pathname)) return;
        return url.href.replace(/</g, "%3C").replace(/>/g, "%3E");
    } catch { return undefined; }
}

function lahdeNimi(lahde) {
    if (/^soundcloud/i.test(lahde ?? "")) return "SoundCloud";
    if (/^youtube/i.test(lahde ?? "")) return "YouTube";
    return turvallinen(rajaa(lahde || "Tuntematon", 28));
}

function nakyma(embed, components = []) {
    return { content: null, embeds: [embed], components, allowedMentions: maininnat };
}

function onnistui(title, description) {
    return nakyma(info({ title, description }));
}

function virhe(description, kappale, title = "Musiikki") {
    return nakyma(warning({
        title,
        description: kappale ? `${nimi(kappale)}\n\n${description}` : description
    }));
}

function kentta(name, value) {
    return { name, value: String(value), inline: true };
}

function painike(soitin, toiminto, label, style = ButtonStyle.Secondary, disabled = false) {
    return new ButtonBuilder().setCustomId(`musiikki:${soitin.nakymaId}:${toiminto}`)
        .setLabel(label).setStyle(style).setDisabled(disabled);
}

function riviPainikkeita(...painikkeet) {
    return new ActionRowBuilder().addComponents(...painikkeet);
}

function jonopainike(soitin) {
    return painike(soitin, "jono:0", "Näytä jono");
}

function kokonaiskesto(kappaleet) {
    if (!kappaleet.length || kappaleet.some(k => !Number.isFinite(k.kesto))) return null;
    return kappaleet.reduce((summa, k) => summa + k.kesto, 0);
}

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

function nimi(kappale, { lyhyt = false, artisti = true } = {}) {
    const otsikko = turvallinen(rajaa(kappale.otsikko || "Tuntematon kappale", lyhyt ? 65 : 150));
    const url = linkki(kappale.url, lyhyt ? 180 : 250);
    const teksti = url ? `[${otsikko}](<${url}>)` : otsikko;
    return artisti && kappale.artisti ? `${teksti} · ${turvallinen(rajaa(kappale.artisti, 70))}` : teksti;
}

function rivi(kappale) {
    return `${nimi(kappale, { lyhyt: true, artisti: false })} · ${aika(kappale.kesto)} · ${lahdeNimi(kappale.lahde)}`;
}

function soitinNakyma(soitin) {
    const { kappale, kulunutS, tauolla } = soitin.nytTiedot();
    if (soitin.lopetettu) return onnistui("Musiikki pysäytetty", "Soitin on suljettu.");
    if (!kappale) {
        return nakyma(info({ title: "Musiikkisoitin", description: "Jono on tyhjä. Lisää musiikkia komennolla /soita." }),
            [riviPainikkeita(jonopainike(soitin))]);
    }

    const kesto = Number.isFinite(kappale.kesto) && kappale.kesto > 0 ? kappale.kesto : null;
    const aikaTeksti = `${aika(kulunutS)} / ${kesto ? aika(kesto) : "tuntematon"}`;
    const eteneminen = kesto ? `${palkki(Math.min(100, kulunutS / kesto * 100), 12)}  ` : "";
    const tila = tauolla ? "Tauolla" : soitin.soiNykyista ? "Toistetaan" : "Valmistellaan";
    const embed = info({
        title: "Musiikkisoitin",
        description: `${nimi(kappale)}\n\n${eteneminen}\`${aikaTeksti}\``,
        thumbnail: linkki(kappale.kuva, 1000),
        fields: [
            kentta("Tila", tila),
            kentta("Äänenvoimakkuus", `${soitin.voimakkuus ?? 100} %`),
            kentta("Lähde", lahdeNimi(kappale.lahde)),
            kentta("Toistotila", TOISTOTILAN_NIMET[soitin.silmukka]),
            kentta("Jonossa", soitin.jono.length),
            ...(kappale.pyytaja && /^\d+$/.test(kappale.pyytaja) ? [kentta("Pyysi", `<@${kappale.pyytaja}>`)] : [])
        ]
    });
    const versio = soitin.sarja;
    return nakyma(embed, [
        riviPainikkeita(
            painike(soitin, `tauko:${versio}:${Number(tauolla)}`, tauolla ? "Jatka" : "Tauko", ButtonStyle.Primary, !soitin.soiNykyista),
            painike(soitin, `ohita:${versio}`, "Seuraava"),
            painike(soitin, "lopeta", "Pysäytä", ButtonStyle.Danger)
        ),
        riviPainikkeita(
            painike(soitin, "sekoita", "Sekoita", ButtonStyle.Secondary, soitin.jono.length < 2),
            painike(soitin, "toisto", `Toisto · ${TOISTOTILAN_NIMET[soitin.silmukka]}`),
            jonopainike(soitin),
            new ButtonBuilder().setCustomId(`km:favorite:${soitin.nakymaId}:${versio}`)
                .setLabel("Suosikki").setEmoji("♥️").setStyle(ButtonStyle.Secondary)
        )
    ]);
}

function jonoNakyma(soitin, pyydettySivu = 0) {
    const jono = soitin?.jono ?? [];
    const sivuja = Math.max(1, Math.ceil(jono.length / SIVUKOKO));
    const sivu = Math.min(sivuja - 1, Math.max(0, pyydettySivu));
    const alku = sivu * SIVUKOKO;
    const kappaleet = jono.slice(alku, alku + SIVUKOKO);
    const kesto = kokonaiskesto(jono);
    const soiva = soitin?.nyt ? `**Nykyinen kappale**\n${rivi(soitin.nyt)}\n\n` : "";
    const kuvaus = kappaleet.map((k, i) => `${alku + i + 1}. ${rivi(k)}`).join("\n");
    const embed = info({
        title: "Musiikkijono",
        description: soiva + (kuvaus || "Jono on tyhjä. Lisää musiikkia komennolla /soita."),
        fields: [kentta("Jonossa", jono.length), ...(kesto !== null ? [kentta("Kokonaiskesto", aika(kesto))] : [])],
        footer: `Sivu ${sivu + 1} / ${sivuja}`
    });
    return nakyma(embed, soitin && sivuja > 1 ? [riviPainikkeita(
        painike(soitin, `sivu:${sivu - 1}`, "Edellinen", ButtonStyle.Secondary, sivu === 0),
        painike(soitin, `sivu:${sivu + 1}`, "Seuraava", ButtonStyle.Secondary, sivu === sivuja - 1)
    )] : []);
}

function lisattyNakyma({ lisatyt, pudotettu, hylatty, lahde, jonoPituus, lista }, soitin) {
    const ensimmainen = lisatyt[0];
    const monta = lisatyt.length > 1;
    const kesto = kokonaiskesto(lisatyt);
    const ohitettu = hylatty + pudotettu;
    const embed = info({
        title: lista ? "Soittolista lisätty jonoon" : monta ? "Kappaleet lisätty jonoon" : "Kappale lisätty jonoon",
        description: lista ? turvallinen(rajaa(lista.nimi, 150)) : monta
            ? lisatyt.slice(0, 5).map(rivi).join("\n")
            : nimi(ensimmainen),
        thumbnail: linkki(lista ? lista.kuva : ensimmainen.kuva, 1000),
        fields: [
            kentta("Lähde", lahdeNimi(lahde)),
            kentta("Lisätty", lisatyt.length),
            ...(lista || ohitettu ? [kentta("Ohitettu", `${lista?.maaraVahintaan ? "Vähintään " : ""}${ohitettu}`)] : []),
            ...(kesto !== null ? [kentta("Lisättyjen kesto", aika(kesto))] : []),
            kentta("Jonossa yhteensä", jonoPituus)
        ],
        ...(lista?.maararaja ? { footer: `Soittolistan käsittelyraja on ${lista.maararaja} kappaletta.` } : {})
    });
    return nakyma(embed, [riviPainikkeita(jonopainike(soitin))]);
}

function hakuNakyma(kappaleet, valintaId, peruutusId) {
    const rivit = kappaleet.map(k => `**${nimi(k, { lyhyt: true, artisti: false })}**\n${[
        k.artisti && turvallinen(rajaa(k.artisti, 60)), aika(k.kesto), lahdeNimi(k.lahde)
    ].filter(Boolean).join(" · ")}`);
    const valikko = new StringSelectMenuBuilder().setCustomId(valintaId).setPlaceholder("Valitse kappale")
        .addOptions(kappaleet.map((k, i) => ({
            label: rajaa(k.otsikko, 100) || `Kappale ${i + 1}`,
            description: rajaa([k.artisti, aika(k.kesto), lahdeNimi(k.lahde)].filter(Boolean).join(" · "), 100),
            value: String(i)
        })));
    return nakyma(info({ title: "Hakutulokset", description: rivit.join("\n\n") }), [
        riviPainikkeita(valikko),
        riviPainikkeita(new ButtonBuilder().setCustomId(peruutusId).setLabel("Peruuta").setStyle(ButtonStyle.Secondary))
    ]);
}

function virheKooste(maara, esimerkit) {
    return virhe(esimerkit.map(t => `${nimi(t.kappale)}\n${turvallinen(rajaa(t.viesti, 240))}`).join("\n\n"),
        null, `Soittolistalta ohitettu ${maara} kappaletta`);
}

module.exports = {
    turvallinen, aika, nimi, rivi, onnistui, virhe, virheKooste, soitinNakyma, jonoNakyma,
    lisattyNakyma, hakuNakyma, TOISTOTILAN_NIMET
};
