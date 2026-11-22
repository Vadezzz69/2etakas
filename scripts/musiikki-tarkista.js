#!/usr/bin/env node
/**
 * Musiikkimoduulin ympäristötarkistus: `npm run musiikki:tarkista`
 *
 * Kertoo mitä musiikki tarvitsee ja mikä niistä puuttuu tältä palvelimelta.
 * `npm run musiikki:tarkista -- --paivita` päivittää lisäksi yt-dlp:n
 * (YouTube muuttuu usein; vanha yt-dlp lakkaa toimimasta).
 */
require("dotenv").config();

const { execFile } = require("child_process");
const ytdlp = require("../utils/musiikki/ytdlp");
const { asetukset } = require("../utils/musiikki/config");

const OK = "✅";
const PUUTTUU = "❌";
const VAROITUS = "⚠️ ";

function onAsennettu(nimi) {
    try { require.resolve(nimi); return true; } catch { return false; }
}

function suorita(komento, args) {
    return new Promise(resolve => {
        execFile(komento, args, { timeout: 60_000 }, (err, stdout, stderr) => resolve({ err, ulos: `${stdout}${stderr}`.trim() }));
    });
}

(async () => {
    let puutteita = 0;
    const rivi = (merkki, teksti) => { if (merkki === PUUTTUU) puutteita++; console.log(`${merkki} ${teksti}`); };

    const [major, minor] = process.versions.node.split(".").map(Number);
    const nodeOk = major > 22 || (major === 22 && minor >= 12);
    rivi(nodeOk ? OK : PUUTTUU, `Node.js ${process.version}${nodeOk ? "" : " — musiikki vaatii 22.12 tai uudemman"}`);

    const voice = onAsennettu("@discordjs/voice");
    rivi(voice ? OK : PUUTTUU, voice ? "@discordjs/voice asennettu" : "@discordjs/voice puuttuu");

    const davey = onAsennettu("@snazzah/davey");
    rivi(davey ? OK : PUUTTUU, davey ? "@snazzah/davey (Discordin äänen salaus, pakollinen) asennettu" : "@snazzah/davey puuttuu — ilman sitä äänikanavayhteys ei toimi Discordin nykyisellä salauksella");

    const opus = onAsennettu("@discordjs/opus") || onAsennettu("opusscript");
    rivi(opus ? OK : PUUTTUU, opus ? "Opus-kirjasto asennettu" : "Opus-kirjasto puuttuu (opusscript tai @discordjs/opus)");

    const ffmpegStatic = onAsennettu("ffmpeg-static");
    const ffmpeg = await suorita("ffmpeg", ["-version"]);
    const ffmpegJarjestelmassa = !ffmpeg.err;
    rivi(ffmpegStatic || ffmpegJarjestelmassa ? OK : PUUTTUU,
        ffmpegStatic ? "ffmpeg-static asennettu" : ffmpegJarjestelmassa ? `ffmpeg löytyy järjestelmästä (${ffmpeg.ulos.split("\n")[0].slice(0, 40)})` : "ffmpeg puuttuu (asenna ffmpeg-static tai ffmpeg järjestelmään)");

    const yt = await ytdlp.loyda();
    if (yt) {
        rivi(OK, `yt-dlp ${yt.versio} (${yt.polku})`);

        if (process.argv.includes("--paivita")) {
            const paivitys = await suorita(yt.polku, ["-U"]);
            console.log(paivitys.err ? `${VAROITUS}Päivitys ei onnistunut: ${paivitys.ulos.split("\n").pop()}` : `🔄 ${paivitys.ulos.split("\n").pop()}`);
        }
    } else {
        rivi(PUUTTUU, `yt-dlp puuttuu (aseta YTDLP_PATH, asenna PATH:iin tai aseta YTDLP_AUTOASENNUS=1). Alusta: ${ytdlp.julkaisunNimi() ?? "ei tuettu"}`);
    }

    const a = asetukset();
    console.log(`\nAsetukset: oletushaku ${a.oletusHakulahde}, jono max ${a.maxJono}, lista max ${a.maxLista}, kesto max ${a.maxKestoS / 60} min`);
    console.log(`Sallitut sivustot: ${a.sallitutSivut.join(", ")}`);

    if (process.env.YTDLP_COOKIES) console.log("Evästetiedosto käytössä (YTDLP_COOKIES).");
    if (process.env.YTDLP_PROXY) console.log("Välityspalvelin käytössä (YTDLP_PROXY).");

    if (puutteita) {
        console.log(`\n${puutteita} puutetta. Asenna npm-paketit: npm install @discordjs/voice @snazzah/davey opusscript ffmpeg-static`);
        process.exit(1);
    }

    console.log("\nKaikki musiikin edellytykset täyttyvät. Kokeile lopuksi /soita Discordissa.");
})();
