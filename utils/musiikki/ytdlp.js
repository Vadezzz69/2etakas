/**
 * yt-dlp-kääre. yt-dlp on ulkoinen ohjelma (ei npm-paketti), joka osaa hakea
 * äänen YouTubesta, SoundCloudista, Bandcampista ym. Sitä kutsutaan aina
 * argumenttitaulukolla (ei shell-komentona), jotta käyttäjän syöte ei voi
 * päätyä komentoriville.
 *
 * Binäärin etsintäjärjestys: YTDLP_PATH, ./bin/yt-dlp, PATH:n "yt-dlp".
 * Jos mitään ei löydy ja YTDLP_AUTOASENNUS=1, virallinen binääri ladataan
 * yt-dlp:n GitHub-julkaisusta kansioon ./bin (hyödyllinen hosteissa joihin
 * ei voi asentaa ohjelmia itse).
 */

const fs = require("fs");
const path = require("path");
const { spawn, execFile } = require("child_process");

const BIN_KANSIO = path.join(process.cwd(), "bin");
const JULKAISU_URL = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/";
const JSON_MAX_TAVUA = 20 * 1024 * 1024;

let loydetty = null;
let etsinta = null;

function testaaBinaari(polku) {
    return new Promise(resolve => {
        execFile(polku, ["--version"], { timeout: 15_000 }, (err, stdout) => {
            resolve(err ? null : String(stdout).trim());
        });
    });
}

function paikallinenNimi() {
    return process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
}

function ehdokkaat() {
    return [
        process.env.YTDLP_PATH,
        path.join(BIN_KANSIO, paikallinenNimi()),
        paikallinenNimi()
    ].filter(Boolean);
}

/** Valitsee julkaisun tiedostonimen alustan mukaan (glibc vs. musl Linuxissa). */
function julkaisunNimi() {
    const arm = process.arch === "arm64";

    if (process.platform === "win32") return "yt-dlp.exe";
    if (process.platform === "darwin") return "yt-dlp_macos";
    if (process.platform === "linux") {
        const glibc = Boolean(process.report?.getReport?.().header?.glibcVersionRuntime);
        if (glibc) return arm ? "yt-dlp_linux_aarch64" : "yt-dlp_linux";
        return arm ? "yt-dlp_musllinux_aarch64" : "yt-dlp_musllinux";
    }
    return null;
}

async function lataaBinaari() {
    const nimi = julkaisunNimi();
    if (!nimi) throw new Error(`Alustalle ${process.platform}/${process.arch} ei ole valmista yt-dlp-binääriä.`);

    fs.mkdirSync(BIN_KANSIO, { recursive: true });
    const kohde = path.join(BIN_KANSIO, paikallinenNimi());
    const vali = `${kohde}.lataus`;

    console.log(`⬇️  Ladataan yt-dlp (${nimi}) kansioon ${BIN_KANSIO} ...`);
    const res = await fetch(JULKAISU_URL + nimi, { redirect: "follow", signal: AbortSignal.timeout(120_000) });
    if (!res.ok) throw new Error(`yt-dlp:n lataus epäonnistui (HTTP ${res.status}).`);

    fs.writeFileSync(vali, Buffer.from(await res.arrayBuffer()));
    fs.chmodSync(vali, 0o755);
    fs.renameSync(vali, kohde);
    return kohde;
}

/**
 * @returns {Promise<{ polku: string, versio: string } | null>}
 */
async function loyda() {
    if (loydetty) return loydetty;

    etsinta ??= (async () => {
        for (const polku of ehdokkaat()) {
            const versio = await testaaBinaari(polku);
            if (versio) return { polku, versio };
        }

        if (process.env.YTDLP_AUTOASENNUS === "1") {
            try {
                const polku = await lataaBinaari();
                const versio = await testaaBinaari(polku);
                if (versio) return { polku, versio };
            } catch (err) {
                console.error("❌ yt-dlp:n automaattinen asennus epäonnistui:", err.message);
            }
        }

        return null;
    })();

    const tulos = await etsinta;
    if (tulos) loydetty = tulos;
    else etsinta = null; // yritetään uudelleen seuraavalla kerralla
    return tulos;
}

/** Omistajan lisäargumentit: evästeet, välityspalvelin, omat valinnat. */
function lisaArgumentit() {
    const args = [];

    if (process.env.YTDLP_COOKIES) args.push("--cookies", process.env.YTDLP_COOKIES);
    if (process.env.YTDLP_PROXY) args.push("--proxy", process.env.YTDLP_PROXY);
    if (process.env.YTDLP_LISAARGS) args.push(...process.env.YTDLP_LISAARGS.split(/\s+/).filter(Boolean));

    return args;
}

/**
 * Hakee tiedot (JSON) annetulle kohteelle. `kohde` annetaan aina `--`-erottimen
 * jälkeen, joten se ei voi tulla tulkituksi yt-dlp:n valinnaksi.
 *
 * @returns {Promise<object>} yksi JSON-olio (--dump-single-json)
 */
async function tiedot(kohde, { lista = false, max = 1, aikarajaMs = 30_000 } = {}) {
    const bin = await loyda();
    if (!bin) throw new Error("YTDLP_PUUTTUU");

    const args = [
        "--dump-single-json", "--skip-download", "--no-warnings", "--ignore-config",
        lista ? "--flat-playlist" : "--no-playlist",
        ...(lista ? ["--playlist-end", String(max)] : []),
        ...lisaArgumentit(),
        "--", kohde
    ];

    return new Promise((resolve, reject) => {
        const proc = spawn(bin.polku, args, { stdio: ["ignore", "pipe", "pipe"] });
        const osat = [];
        let koko = 0;
        let virheTeksti = "";

        const ajastin = setTimeout(() => { proc.kill("SIGKILL"); reject(new Error("YTDLP_AIKAKATKAISU")); }, aikarajaMs);

        proc.stdout.on("data", d => {
            koko += d.length;
            if (koko > JSON_MAX_TAVUA) { proc.kill("SIGKILL"); return; }
            osat.push(d);
        });
        proc.stderr.on("data", d => { virheTeksti = (virheTeksti + d).slice(-2000); });
        proc.on("error", err => { clearTimeout(ajastin); reject(err); });
        proc.on("close", koodi => {
            clearTimeout(ajastin);
            if (koodi !== 0 || koko > JSON_MAX_TAVUA) {
                const err = new Error("YTDLP_VIRHE");
                err.yksityiskohta = virheTeksti.trim().split("\n").pop() ?? "";
                return reject(err);
            }
            try { resolve(JSON.parse(Buffer.concat(osat).toString("utf8"))); }
            catch { reject(new Error("YTDLP_VIRHE")); }
        });
    });
}

/**
 * Käynnistää äänen lataamisen stdoutiin. Palauttaa luettavan virran, jonka
 * @discordjs/voice muuntaa Opukseksi ffmpegillä.
 *
 * @returns {Promise<{ stream: import("stream").Readable, sulje: () => void, tavuja: () => number, virhe: () => string }>}
 */
async function virta(kohde) {
    const bin = await loyda();
    if (!bin) throw new Error("YTDLP_PUUTTUU");

    const args = [
        "-f", "bestaudio/best", "--no-playlist", "--quiet", "--no-warnings", "--ignore-config",
        "--no-part", "--no-cache-dir",
        ...lisaArgumentit(),
        "-o", "-", "--", kohde
    ];

    const proc = spawn(bin.polku, args, { stdio: ["ignore", "pipe", "pipe"] });
    let tavuja = 0;
    let virheTeksti = "";

    proc.stdout.on("data", d => { tavuja += d.length; });
    proc.stderr.on("data", d => { virheTeksti = (virheTeksti + d).slice(-1000); });
    proc.on("error", err => { virheTeksti = err.message; });

    return {
        stream: proc.stdout,
        tavuja: () => tavuja,
        virhe: () => virheTeksti.trim().split("\n").pop() ?? "",
        sulje: () => { try { proc.kill("SIGKILL"); } catch { /* jo suljettu */ } }
    };
}

module.exports = { loyda, tiedot, virta, julkaisunNimi };
