
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
        execFile(polku, ["--version"], { timeout: 15000 }, (err, stdout) => {
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

    console.log(`⬇️ Ladataan yt-dlp: ${nimi}`);

    const res = await fetch(JULKAISU_URL + nimi, {
        redirect: "follow",
        signal: AbortSignal.timeout(120000)
    });

    if (!res.ok) throw new Error(`yt-dlp:n lataus epäonnistui (HTTP ${res.status}).`);

    fs.writeFileSync(vali, Buffer.from(await res.arrayBuffer()));
    fs.chmodSync(vali, 0o755);
    fs.renameSync(vali, kohde);

    return kohde;
}

async function loyda() {
    if (loydetty) {
        console.log("✅ yt-dlp välimuistista:", loydetty.polku);
        return loydetty;
    }

    etsinta ??= (async () => {
        const polut = ehdokkaat();

        console.log("🔎 Etsitään yt-dlp-ohjelmaa...");
        console.log("📂 Työhakemisto:", process.cwd());
        console.log("🔍 Tarkistettavat polut:", polut);

        for (const polku of polut) {
            const versio = await testaaBinaari(polku);

            if (versio) {
                console.log("✅ yt-dlp löytyi:", polku);
                console.log("📦 Versio:", versio);
                return { polku, versio };
            }

            console.log("⚠️ Ei löytynyt tai ei käynnistynyt:", polku);
        }

        if (process.env.YTDLP_AUTOASENNUS === "1") {
            try {
                const polku = await lataaBinaari();
                const versio = await testaaBinaari(polku);

                if (versio) return { polku, versio };
            } catch (err) {
                console.error("❌ Automaattinen asennus epäonnistui:", err.message);
            }
        }

        console.error("❌ yt-dlp:tä ei löytynyt.");
        return null;
    })();

    const tulos = await etsinta;

    if (tulos) {
        loydetty = tulos;
    } else {
        etsinta = null;
    }

    return tulos;
}

function lisaArgumentit() {
    const args = [
        "--js-runtimes", "node",
        "--remote-components", "ejs:github"
    ];

    if (process.env.YTDLP_COOKIES) {
        args.push("--cookies", process.env.YTDLP_COOKIES);
    }

    if (process.env.YTDLP_PROXY) {
        args.push("--proxy", process.env.YTDLP_PROXY);
    }

    if (process.env.YTDLP_LISAARGS) {
        args.push(...process.env.YTDLP_LISAARGS.split(/\s+/).filter(Boolean));
    }

    return args;
}

async function tiedot(kohde, { lista = false, max = 1, aikarajaMs = 30000 } = {}) {
    const bin = await loyda();
    if (!bin) throw new Error("YTDLP_PUUTTUU");

    const args = [
        "--dump-single-json", "--skip-download", "--no-warnings", "--ignore-config",
        "-f", "bestaudio/best",
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
        let valmis = false;

        const ajastin = setTimeout(() => {
            proc.kill("SIGKILL");
            if (!valmis) {
                valmis = true;
                reject(new Error("YTDLP_AIKAKATKAISU"));
            }
        }, aikarajaMs);

        proc.stdout.on("data", d => {
            koko += d.length;
            if (koko > JSON_MAX_TAVUA) proc.kill("SIGKILL");
            else osat.push(d);
        });

        proc.stderr.on("data", d => {
            virheTeksti = (virheTeksti + d).slice(-2000);
        });

        proc.on("error", err => {
            clearTimeout(ajastin);
            if (valmis) return;
            valmis = true;
            reject(err);
        });

        proc.on("close", koodi => {
            clearTimeout(ajastin);
            if (valmis) return;
            valmis = true;

            if (koodi !== 0 || koko > JSON_MAX_TAVUA) {
                const err = new Error("YTDLP_VIRHE");
                err.yksityiskohta = virheTeksti.trim().split("\n").pop() ?? "";
                return reject(err);
            }

            try {
                resolve(JSON.parse(Buffer.concat(osat).toString("utf8")));
            } catch {
                reject(new Error("YTDLP_VIRHE"));
            }
        });
    });
}

async function virta(kohde) {
    const bin = await loyda();
    if (!bin) throw new Error("YTDLP_PUUTTUU");

    const args = [
        "-f", "bestaudio/best", "--no-playlist", "--quiet",
        "--no-warnings", "--ignore-config", "--no-part", "--no-cache-dir",
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
        sulje: () => {
            try {
                proc.kill("SIGKILL");
            } catch {
                // Prosessi on jo suljettu.
            }
        }
    };
}

module.exports = { loyda, tiedot, virta, julkaisunNimi };
