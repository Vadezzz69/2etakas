#!/usr/bin/env node

/**
 * Interaktiivinen työkalu uuden slash-komennon luomiseen.
 * Käyttö: npm run uusikomento
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline/promises");
const { stdin, stdout } = require("process");

const rl = readline.createInterface({ input: stdin, output: stdout });

function toFileName(str) {
    return str
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9äöå_-]/gi, "")
        .replace(/-/g, "_");
}

async function kysyValinta(kysymys, vaihtoehdot) {
    while (true) {
        const vastaus = (await rl.question(`${kysymys} (${vaihtoehdot.join("/")}): `))
            .trim()
            .toLowerCase();
        if (vaihtoehdot.includes(vastaus)) return vastaus;
        console.log(`⚠️  Vastaa jollain näistä: ${vaihtoehdot.join(", ")}`);
    }
}

(async () => {

    console.log("🛠️  Uuden komennon luonti\n");

    const commandsRoot = path.join(process.cwd(), "commands");
    const olemassaOlevatKansiot = fs.existsSync(commandsRoot)
        ? fs.readdirSync(commandsRoot).filter(f => fs.statSync(path.join(commandsRoot, f)).isDirectory())
        : [];

    console.log(`Olemassa olevat kategoriat: ${olemassaOlevatKansiot.join(", ") || "(ei vielä yhtään)"}`);
    let kategoria = toFileName(await rl.question("Kategoria (kansion nimi, esim. \"yleiset\"): "));

    if (!kategoria) {
        console.log("❌ Kategoria ei voi olla tyhjä.");
        rl.close();
        return;
    }

    let nimi = toFileName(await rl.question("Komennon nimi (esim. \"tervehdi\"): "));

    if (!nimi) {
        console.log("❌ Nimi ei voi olla tyhjä.");
        rl.close();
        return;
    }

    const kuvaus = (await rl.question("Lyhyt kuvaus (näkyy Discordissa): ")).trim() || "Ei kuvausta.";

    const tarvitseeKayttaja = await kysyValinta("Tarvitseeko komento kohdekäyttäjän (esim. @joku)?", ["k", "e"]);
    const tarvitseeTeksti = await kysyValinta("Tarvitseeko komento tekstikentän (esim. syy/viesti)?", ["k", "e"]);
    const vaatiiOikeuden = await kysyValinta("Rajataanko komento vain moderaattoreille?", ["k", "e"]);

    const kansioPolku = path.join(commandsRoot, kategoria);
    if (!fs.existsSync(kansioPolku)) {
        fs.mkdirSync(kansioPolku, { recursive: true });
        console.log(`📁 Luotiin uusi kategoria: ${kategoria}`);
    }

    const tiedostoPolku = path.join(kansioPolku, `${nimi}.js`);

    if (fs.existsSync(tiedostoPolku)) {
        console.log(`❌ Tiedosto ${tiedostoPolku} on jo olemassa. Peruttu.`);
        rl.close();
        return;
    }

    let builder = `    data: new SlashCommandBuilder()\n`;
    builder += `        .setName("${nimi}")\n`;
    builder += `        .setDescription("${kuvaus.replace(/"/g, '\\"')}")`;

    if (tarvitseeKayttaja === "k") {
        builder += `\n        .addUserOption(option =>\n`;
        builder += `            option.setName("kayttaja").setDescription("Kohdekäyttäjä").setRequired(true)\n`;
        builder += `        )`;
    }

    if (tarvitseeTeksti === "k") {
        builder += `\n        .addStringOption(option =>\n`;
        builder += `            option.setName("teksti").setDescription("Vapaa teksti").setRequired(true)\n`;
        builder += `        )`;
    }

    if (vaatiiOikeuden === "k") {
        builder += `\n        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)`;
    }

    builder += `,`;

    const tarvitseeUserImport = tarvitseeKayttaja === "k";
    const tarvitseePermImport = vaatiiOikeuden === "k";

    const importRivi = `const { SlashCommandBuilder${tarvitseePermImport ? ", PermissionFlagsBits" : ""}, EmbedBuilder } = require("discord.js");`;

    const executeVartalo = [
        tarvitseeKayttaja === "k" ? `        const kohde = interaction.options.getUser("kayttaja");` : null,
        tarvitseeTeksti === "k" ? `        const teksti = interaction.options.getString("teksti");` : null,
        ``,
        `        const embed = new EmbedBuilder()`,
        `            .setColor(0x5865F2)`,
        `            .setDescription(${
            tarvitseeKayttaja === "k" && tarvitseeTeksti === "k"
                ? "`${kohde} — ${teksti}`"
                : tarvitseeKayttaja === "k"
                ? "`Kohde: ${kohde}`"
                : tarvitseeTeksti === "k"
                ? "`${teksti}`"
                : `"Tähän tulee komennon vastaus."`
        });`,
        ``,
        `        await interaction.reply({ embeds: [embed] });`
    ].filter(line => line !== null).join("\n");

    const sisalto = `${importRivi}

module.exports = {
${builder}

    async execute(interaction, client) {

${executeVartalo}

    }
};
`;

    fs.writeFileSync(tiedostoPolku, sisalto, "utf-8");

    console.log(`\n✅ Luotiin: commands/${kategoria}/${nimi}.js`);
    console.log(`\nSeuraavaksi:`);
    console.log(`  1. Muokkaa tiedostoa ja lisää oma logiikkasi execute()-funktioon.`);
    console.log(`  2. Rekisteröi komento Discordiin: node deploy-commands.js`);
    console.log(`  3. Käynnistä botti uudelleen jos se on jo käynnissä.`);

    rl.close();

})();
