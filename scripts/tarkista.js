#!/usr/bin/env node

/**
 * Itsetarkistus: `npm test`
 *
 * Ei vaadi Discord-yhteyttä, tokenia eikä tietokantaa. Tarkistaa:
 *   1. kaikki komennot latautuvat, nimet eivät törmää ja Discordin rajat täyttyvät
 *   2. ryhmäkomentojen (/vakoilu, /tutkimus, /oikeus) jäsenet löytyvät ja
 *      niiden kohdevalinnan nimi täsmää
 *   3. sisältöpoolit (utils/comedy/data, viestit.js jne.) ovat siistejä:
 *      ei tyhjiä rivejä, ei duplikaatteja, ei kirjaimellisia "\n"-jäänteitä,
 *      ja kaikki {paikanvaraajat} ovat tunnettuja
 */

const path = require("path");
const { lataaKomennot } = require("../handlers/commandLoader");

const juuri = path.join(__dirname, "..");
const virheet = [];
const virhe = (viesti) => virheet.push(viesti);

// ---------------------------------------------------------------------------
// 1. Komennot
// ---------------------------------------------------------------------------

const { komennot, ongelmat } = lataaKomennot();

for (const ongelma of ongelmat) virhe(`Komentoa ${ongelma.tiedosto} ei voitu ladata: ${ongelma.syy}`);

const NIMI_SAANTO = /^[\p{Ll}\p{N}_-]{1,32}$/u;

for (const { nimi, tiedosto, komento } of komennot) {
    let json;
    try {
        json = komento.data.toJSON();
    } catch (err) {
        virhe(`/${nimi} (${tiedosto}): toJSON epäonnistui: ${err.message}`);
        continue;
    }

    if (!NIMI_SAANTO.test(json.name)) virhe(`/${nimi}: virheellinen komennon nimi`);
    if (!json.description || json.description.length > 100) virhe(`/${nimi}: kuvauksen pituus ${json.description?.length} (sallittu 1–100)`);
    if ((json.options?.length ?? 0) > 25) virhe(`/${nimi}: yli 25 valintaa`);

    for (const optio of json.options ?? []) {
        if (!optio.description || optio.description.length > 100) virhe(`/${nimi} → ${optio.name}: kuvauksen pituus ei kelpaa`);
    }
}

if (komennot.length > 100) virhe(`Komentoja on ${komennot.length}; Discordin raja on 100 per palvelin.`);

// ---------------------------------------------------------------------------
// 2. Ryhmäkomennot
// ---------------------------------------------------------------------------

for (const { nimi, komento } of komennot) {
    if (!komento.ALIKOMENNOT) continue;

    const ryhmaJson = komento.data.toJSON();
    const alikomennot = ryhmaJson.options ?? [];

    if (alikomennot.length === 0) virhe(`/${nimi}: ryhmäkomennolla ei ole yhtään alikomentoa`);

    const nimet = new Set();

    for (const sub of alikomennot) {
        if (sub.type !== 1) virhe(`/${nimi}: "${sub.name}" ei ole alikomento`);

        if (nimet.has(sub.name)) virhe(`/${nimi}: alikomento "${sub.name}" kahdesti`);
        nimet.add(sub.name);

        if (!/^[\p{Ll}\p{N}_-]{1,32}$/u.test(sub.name)) virhe(`/${nimi} ${sub.name}: virheellinen alikomennon nimi`);
        if (!sub.description || sub.description.length > 100) virhe(`/${nimi} ${sub.name}: kuvaus puuttuu tai on yli 100 merkkiä`);

        const merkinta = komento.ALIKOMENNOT[sub.name];
        if (typeof merkinta?.jasen?.execute !== "function") {
            virhe(`/${nimi} ${sub.name}: alikomennolla ei ole ajettavaa toimintoa`);
        }

        // Pakolliset valinnat ennen valinnaisia (muuten Discord hylkää rekisteröinnin)
        let valinnainenNahty = false;
        for (const opt of sub.options ?? []) {
            if (opt.required && valinnainenNahty) virhe(`/${nimi} ${sub.name}: pakollinen valinta "${opt.name}" on valinnaisen jälkeen`);
            if (!opt.required) valinnainenNahty = true;
        }
    }

    if (alikomennot.length > 25) virhe(`/${nimi}: alikomentoja ${alikomennot.length} (raja 25)`);
}

// ---------------------------------------------------------------------------
// 3. Sisältöpoolit
// ---------------------------------------------------------------------------

const POOLIT = [
    ["utils/comedy/data/viestit.js"],
    ["utils/comedy/data/rikokset.js"],
    ["utils/comedy/data/tekosyyt.js"],
    ["utils/comedy/data/tiedotteet.js"],
    ["utils/comedy/data/paatokset.js"],
    ["utils/comedy/data/esineet.js"],
    ["utils/comedy/data/psykologia.js"],
    ["utils/comedy/data/todistajat.js"],
    ["utils/comedy/data/kameratapahtumat.js"],
    ["utils/comedy/data/kuulustelu.js"],
    ["utils/comedy/data/todisteet.js"],
    ["utils/comedy/data/syytteet.js"],
    ["utils/comedy/data/laskurivit.js"],
    ["utils/comedy/data/todistusetuliitteet.js"],
    ["utils/komiteadata.js"],
    ["utils/vakoiludata.js"],
    ["utils/roastdata.js"],
    ["utils/vammadata.js"]
];

const TUNNETUT_PAIKANVARAAJAT = new Set([
    "k", "nro", "pvm", "n", "lause", "nimi", "tag", "syy", "min", "summa", "tulos",
    "voittaja", "koodinimi", "i", "a", "b", "aika"
]);

const MAX_TEKSTIN_PITUUS = 900; // embed-kentän raja on 1024, sallitaan paikanvaraajille tilaa

function tarkistaTeksti(lahde, taulukko, teksti) {
    if (typeof teksti !== "string") return;
    const kuvaus = `${lahde} :: ${taulukko} :: "${teksti.slice(0, 50)}"`;

    if (!teksti.trim()) virhe(`${kuvaus} on tyhjä`);
    if (teksti.length > MAX_TEKSTIN_PITUUS) virhe(`${kuvaus} on liian pitkä (${teksti.length})`);
    if (/\\n/.test(teksti)) virhe(`${kuvaus} sisältää kirjaimellisen \\n-merkinnän`);
    if (/\s{2,}$|^\s/.test(teksti)) virhe(`${kuvaus} alkaa tai päättyy tyhjään`);

    for (const [, avain] of teksti.matchAll(/\{(\w+)\}/g)) {
        if (!TUNNETUT_PAIKANVARAAJAT.has(avain)) virhe(`${kuvaus} sisältää tuntemattoman paikanvaraajan {${avain}}`);
    }
}

function kayLapi(lahde, nimi, arvo) {
    if (Array.isArray(arvo)) {
        const nahdyt = new Set();
        for (const alkio of arvo) {
            if (typeof alkio === "string") {
                if (nahdyt.has(alkio)) virhe(`${lahde} :: ${nimi} sisältää duplikaatin: "${alkio.slice(0, 60)}"`);
                nahdyt.add(alkio);
                tarkistaTeksti(lahde, nimi, alkio);
            } else if (alkio && typeof alkio === "object") {
                kayLapi(lahde, nimi, alkio);
            }
        }
    } else if (arvo && typeof arvo === "object") {
        for (const [avain, sisalto] of Object.entries(arvo)) kayLapi(lahde, `${nimi}.${avain}`, sisalto);
    } else if (typeof arvo === "string") {
        tarkistaTeksti(lahde, nimi, arvo);
    }
}

let tekstejaYhteensa = 0;

for (const [tiedosto] of POOLIT) {
    const moduuli = require(path.join(juuri, tiedosto));

    for (const [nimi, arvo] of Object.entries(moduuli)) {
        if (typeof arvo === "function") continue;
        kayLapi(tiedosto, nimi, arvo);
        if (Array.isArray(arvo)) tekstejaYhteensa += arvo.length;
    }
}

// ---------------------------------------------------------------------------
// Tulos
// ---------------------------------------------------------------------------

if (virheet.length) {
    console.error(`❌ ${virheet.length} ongelmaa:\n` + virheet.map(v => `  • ${v}`).join("\n"));
    process.exit(1);
}

console.log(`✅ Kaikki kunnossa: ${komennot.length} komentoa, ${tekstejaYhteensa} sisältöpoolin alkiota tarkistettu.`);
