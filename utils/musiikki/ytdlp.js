
const fs = require("fs");
const path = require("path");
const { spawn, execFile } = require("child_process");
const { Transform } = require("stream");

const BIN_KANSIO = path.join(process.cwd(), "bin");
const JULKAISU_URL = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/";
const JSON_MAX_TAVUA = 20 * 1024 * 1024;
const STDERR_MAX_MERKKIA = 500;

let loydetty = null;
let etsinta = null;

function turvallinenDiagnostiikkaTeksti(teksti) {
    return String(teksti ?? "")
        .replace(/https?:\/\/[^\s"'<>]+/gi, "[URL]")
        .replace(/\b([A-Z_][A-Z0-9_]{2,})\s*=\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/g, "$1=[REDACTED]")
        .replace(/\b((?:YTDLP_)?[A-Z0-9_]*(?:TOKEN|COOKIE|SECRET|PASSWORD|API[_-]?KEY|PROXY)[A-Z0-9_]*)\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, "$1=[REDACTED]")
        .replace(/\b(authorization|cookie|set-cookie|token|access[_-]?token|refresh[_-]?token|password|secret|api[_-]?key)\b\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, "$1=[REDACTED]")
        .replace(/\bBearer\s+\S+/gi, "Bearer [REDACTED]")
        .replace(/--cookies?(?:-from-browser)?(?:\s+|=)(?:"[^"]*"|'[^']*'|\S+)/gi, "--cookies [REDACTED]")
        .replace(/\b[A-Z]:\\(?:[^\\\s"'<>]+\\)*[^\\\s"'<>]*/g, "[PATH]")
        .replace(/(^|[\s=:])\/(?:[^/\s"'<>]+\/)*[^/\s"'<>]*/g, "$1[PATH]")
        .slice(-STDERR_MAX_MERKKIA);
}

function stderrDiagnostiikka(teksti) {
    const k = String(teksti ?? "").toLowerCase();
    let stderrLuokka = "luokittelematon";

    if (!k.trim()) stderrLuokka = "ei-stderr";
    else if (/sign in|not a bot|authentication required|login required/.test(k)) stderrLuokka = "kirjautuminen";
    else if (/private (video|track)|this (video|track) is private/.test(k)) stderrLuokka = "yksityinen";
    else if (/removed by the uploader|(?:video|track) has been removed|has been deleted/.test(k)) stderrLuokka = "poistettu";
    else if (/geo.?restricted|not available in your (country|region)|country is blocked/.test(k)) stderrLuokka = "alue-estetty";
    else if (/age.?restricted|confirm your age/.test(k)) stderrLuokka = "ikarajoitus";
    else if (/requested format is not available|no video formats found|no formats found/.test(k)) stderrLuokka = "formaatti";
    else if (/http error 401|http error 403|forbidden/.test(k)) stderrLuokka = "esto";
    else if (/timed out|timeout/.test(k)) stderrLuokka = "aikakatkaisu";
    else if (/temporary failure|connection reset|unable to download webpage|network is unreachable|name resolution/.test(k)) stderrLuokka = "verkko";
    else if (/unavailable|not available/.test(k)) stderrLuokka = "ei-saatavilla";

    const kuvaukset = {
        "ei-stderr": "yt-dlp ei palauttanut virhetekstiä",
        kirjautuminen: "lähde edellyttää kirjautumista",
        yksityinen: "sisältö on yksityinen",
        poistettu: "sisältö on poistettu",
        "alue-estetty": "sisältö ei ole saatavilla alueella",
        ikarajoitus: "sisällön ikärajoitus estää haun",
        formaatti: "soittokelpoista formaattia ei löytynyt",
        esto: "lähde esti pyynnön",
        aikakatkaisu: "lähde ei vastannut aikarajan sisällä",
        verkko: "yhteys lähteeseen epäonnistui",
        "ei-saatavilla": "sisältö ei ole saatavilla",
        luokittelematon: "yt-dlp palautti luokittelemattoman virhetekstin"
    };

    return { stderrLuokka, stderrKuvaus: kuvaukset[stderrLuokka] };
}

function luoYtdlpVirhe({ message = "YTDLP_VIRHE", vaihe, exitCode = null, stderr = "", cause = null, syy = "" } = {}) {
    const virhe = new Error(message);
    if (cause) virhe.cause = cause;
    virhe.vaihe = vaihe;
    virhe.exitCode = Number.isInteger(exitCode) ? exitCode : null;
    virhe.stderr = turvallinenDiagnostiikkaTeksti(stderr);
    virhe.yksityiskohta = virhe.stderr;
    Object.assign(virhe, stderrDiagnostiikka(virhe.stderr));
    virhe.syy = turvallinenDiagnostiikkaTeksti(syy || cause?.message || "");
    return virhe;
}

function lisaaProsessivirheenDiagnostiikka(virhe, vaihe, stderr = "") {
    virhe.vaihe = vaihe;
    virhe.exitCode = null;
    virhe.stderr = turvallinenDiagnostiikkaTeksti(stderr);
    virhe.yksityiskohta = virhe.stderr;
    Object.assign(virhe, stderrDiagnostiikka(virhe.stderr));
    virhe.syy = turvallinenDiagnostiikkaTeksti(`yt-dlp-prosessi ei käynnistynyt (${virhe.code ?? virhe.name})`);
    return virhe;
}

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
                reject(luoYtdlpVirhe({
                    message: "YTDLP_AIKAKATKAISU",
                    vaihe: "metadata-timeout",
                    stderr: virheTeksti,
                    syy: "yt-dlp-metatietahaku ylitti aikarajan"
                }));
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
            reject(lisaaProsessivirheenDiagnostiikka(err, "metadata-spawn", virheTeksti));
        });

        proc.on("close", koodi => {
            clearTimeout(ajastin);
            if (valmis) return;
            valmis = true;

            if (koodi !== 0 || koko > JSON_MAX_TAVUA) {
                const liianSuuri = koko > JSON_MAX_TAVUA;
                return reject(luoYtdlpVirhe({
                    vaihe: liianSuuri ? "metadata-output-limit" : "metadata-process-exit",
                    exitCode: koodi,
                    stderr: virheTeksti,
                    syy: liianSuuri ? "yt-dlp-metatietatuloste ylitti kokorajan" : `yt-dlp poistui koodilla ${koodi}`
                }));
            }

            try {
                resolve(JSON.parse(Buffer.concat(osat).toString("utf8")));
            } catch (err) {
                reject(luoYtdlpVirhe({
                    vaihe: "metadata-json-parse",
                    exitCode: koodi,
                    stderr: virheTeksti,
                    cause: err,
                    syy: "yt-dlp-metatietojen JSON-jäsennys epäonnistui"
                }));
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
    let kaynnistynyt = false;
    const mitattuVirta = new Transform({
        transform(pala, koodaus, valmis) {
            tavuja += pala.length;
            valmis(null, pala);
        }
    });

    proc.stdout.pipe(mitattuVirta);
    proc.stderr.on("data", d => { virheTeksti = (virheTeksti + d).slice(-1000); });
    const kaynnistys = new Promise((resolve, reject) => {
        proc.once("spawn", () => {
            kaynnistynyt = true;
            resolve();
        });
        proc.on("error", err => {
            virheTeksti = err.message;
            if (!kaynnistynyt) reject(err);
        });
    });

    try {
        await kaynnistys;
    } catch (err) {
        mitattuVirta.destroy();
        throw err;
    }

    return {
        stream: mitattuVirta,
        tavuja: () => tavuja,
        virhe: () => virheTeksti.trim().split("\n").pop() ?? "",
        sulje: () => {
            try {
                proc.kill("SIGKILL");
            } catch {
                // Prosessi on jo suljettu.
            }
            mitattuVirta.destroy();
        }
    };
}

module.exports = { loyda, tiedot, virta, julkaisunNimi, luoYtdlpVirhe, turvallinenDiagnostiikkaTeksti, stderrDiagnostiikka };
