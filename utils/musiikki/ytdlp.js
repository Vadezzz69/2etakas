
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");
const { createHash } = require("crypto");
const { Readable, Transform } = require("stream");
const { pipeline } = require("stream/promises");

const BIN_KANSIO = path.join(process.cwd(), "bin");
const JULKAISU_URL = "https://github.com/yt-dlp/yt-dlp/releases/download";
const JULKAISU_API_URL = "https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest";
const JSON_MAX_TAVUA = 20 * 1024 * 1024;
const STDERR_MAX_MERKKIA = 500;
const VIRTA_ALKU_AIKARAJA_MS = 30_000;
const BINARI_MAX_TAVUA = 100 * 1024 * 1024;
const METATIETO_MAX_RINNAKKAIN = 1;

let loydetty = null;
let etsinta = null;
let metatietoAktiivisia = 0;
const metatietoJono = [];
const sha256Varmistukset = new Map();

function sha256Manifestista(manifesti, tiedostonimi) {
    const escapet = tiedostonimi.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const osuma = String(manifesti).match(new RegExp(`^([a-f\\d]{64})\\s+\\*?${escapet}\\s*$`, "mi"));
    if (!osuma) throw new Error(`Virallisesta SHA256-tiedostosta puuttuu ${tiedostonimi}.`);
    return osuma[1].toLowerCase();
}

async function haeUusinVersio() {
    const response = await fetch(JULKAISU_API_URL, {
        headers: {
            Accept: "application/vnd.github+json",
            "User-Agent": "2etakas-yt-dlp-installer"
        },
        signal: AbortSignal.timeout(30_000)
    });
    if (!response.ok) throw new Error(`yt-dlp-julkaisun haku epäonnistui (HTTP ${response.status}).`);

    const release = await response.json();
    const versio = release?.tag_name;
    if (typeof versio !== "string" || !/^\d{4}\.\d{2}\.\d{2}$/.test(versio)) {
        throw new Error("yt-dlp:n virallisen julkaisun versionumero oli virheellinen.");
    }
    return versio;
}

async function haeSha256(versio, tiedostonimi) {
    const avain = `${versio}:${tiedostonimi}`;
    if (sha256Varmistukset.has(avain)) return sha256Varmistukset.get(avain);

    const haku = (async () => {
        const url = `${JULKAISU_URL}/${encodeURIComponent(versio)}/SHA2-256SUMS`;
        const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
        if (!response.ok) throw new Error(`yt-dlp:n SHA256-tiedoston haku epäonnistui (HTTP ${response.status}).`);
        const manifesti = await response.text();
        if (Buffer.byteLength(manifesti) > 64 * 1024) throw new Error("yt-dlp:n SHA256-tiedosto oli odottamattoman suuri.");
        return sha256Manifestista(manifesti, tiedostonimi);
    })();

    sha256Varmistukset.set(avain, haku);
    try {
        return await haku;
    } catch (err) {
        sha256Varmistukset.delete(avain);
        throw err;
    }
}

async function tiedostonSha256(polku) {
    const hash = createHash("sha256");
    for await (const pala of fs.createReadStream(polku)) hash.update(pala);
    return hash.digest("hex");
}

function tarkistaTempHakemisto() {
    let viimeisinVirhe = null;
    for (const [juuri, polku] of [["project", BIN_KANSIO], ["system", os.tmpdir()]]) {
        let koepolku = null;
        try {
            fs.mkdirSync(polku, { recursive: true });
            koepolku = fs.mkdtempSync(path.join(polku, ".2etakas-ytdlp-check-"));
            const tila = typeof fs.statfsSync === "function" ? fs.statfsSync(polku) : null;
            return {
                juuri,
                polku,
                kirjoitettavissa: true,
                vapaataTavua: tila ? tila.bavail * tila.bsize : null,
                vapaitaInodeja: process.platform !== "win32" && Number.isFinite(tila?.ffree) ? tila.ffree : null
            };
        } catch (err) {
            viimeisinVirhe = err;
        } finally {
            if (koepolku) fs.rmSync(koepolku, { recursive: true, force: true });
        }
    }

    throw new Error(`yt-dlp:n temp-hakemistoa ei voi käyttää (${viimeisinVirhe?.code ?? viimeisinVirhe?.message ?? "tuntematon virhe"}).`);
}

async function suoritaMetatietoJonossa(tehtava) {
    if (metatietoAktiivisia >= METATIETO_MAX_RINNAKKAIN) {
        await new Promise(resolve => metatietoJono.push(resolve));
    } else {
        metatietoAktiivisia++;
    }

    try {
        return await tehtava();
    } finally {
        const seuraava = metatietoJono.shift();
        if (seuraava) seuraava();
        else metatietoAktiivisia--;
    }
}

function turvallinenDiagnostiikkaTeksti(teksti) {
    return String(teksti ?? "")
        .replace(/(\[(?:youtube|soundcloud)\]\s+)[^:\s]+(?=\s*:)/gi, "$1[ID]")
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
    let diagnostiikkaTyyppi = "tuntematon";

    if (!k.trim()) stderrLuokka = "ei-stderr";
    else if (/\bdrm(?:[- ]protected| protection| protected)\b|protected by drm/.test(k)) stderrLuokka = "drm-suojattu";
    else if (/sign in|not a bot|authentication required|login required|please log in|must be logged in|not logged in|requires authentication/.test(k)) stderrLuokka = "kirjautuminen";
    else if (/http error 429|\b429\b|too many requests|rate[- ]limit|throttl/.test(k)) stderrLuokka = "rate-limit";
    else if (/private (video|track)|this (video|track) is private/.test(k)) stderrLuokka = "yksityinen";
    else if (/removed by the uploader|(?:video|track) (?:has been|was) removed|(?:video|track) has been deleted|has been deleted|track not found/.test(k)) stderrLuokka = "poistettu";
    else if (/http error 401|http error 403|\b401\b|\b403\b|forbidden|access denied|unauthorized|permission denied|not authorized/.test(k)) stderrLuokka = "kayttooikeusrajoitus";
    else if (/geo.?restricted|not available in your (country|region)|country is blocked/.test(k)) stderrLuokka = "alue-estetty";
    else if (/age.?restricted|confirm your age/.test(k)) stderrLuokka = "ikarajoitus";
    else if (/requested format is not available|no video formats found|no formats found/.test(k)) stderrLuokka = "formaatti";
    else if (/timed out|timeout/.test(k)) stderrLuokka = "aikakatkaisu";
    else if (/temporary failure|connection reset|connection refused|connection aborted|unable to download webpage|network is unreachable|name resolution|connection error|ssl error|tls error|max retries exceeded|no route to host/.test(k)) stderrLuokka = "verkko";
    else if (/unavailable|not available/.test(k)) stderrLuokka = "ei-saatavilla";

    if (/usage: yt-dlp|no such option|unrecognized arguments|unknown option|expected (?:one|at least) argument|invalid choice|not enough arguments|option .+ requires an argument/.test(k)) {
        diagnostiikkaTyyppi = "komentorivi-argumentti";
    } else if (/javascript runtime|js runtime|ejs|remote component|signature (?:extraction|solving)|challenge solving|no supported javascript runtime/.test(k)) {
        diagnostiikkaTyyppi = "javascript-runtime-ejs";
    } else if (/(?:invalid|expired|corrupt|failed|unsupported|unable|not found|required|missing)(?: to load| to read| to use)? (?:the )?(?:cookies?|cookie jar)|(?:cookies?|cookie jar) (?:are|is|was|were) (?:invalid|expired|corrupt|not supported|missing|required)|(?:cookie|cookies) (?:file|jar) (?:is|was) (?:invalid|expired|missing|unreadable)|invalid cookie|sign in|not a bot|authentication required|login required|please log in|must be logged in|not logged in|requires authentication/.test(k)) {
        diagnostiikkaTyyppi = "evaste-kirjautuminen";
    } else if (/search extractor|ytsearch|scsearch|no suitable extractor|unable to extract.*search|unsupported url/.test(k)) {
        diagnostiikkaTyyppi = "hakuextractor";
    } else if (/http error|http status|http [45]\d\d|\b429\b|too many requests|rate[- ]limit|network|connection|timed out|timeout|temporary failure|name resolution|ssl error|tls error|proxy (?:error|failure|failed|refused|unavailable)/.test(k)) {
        diagnostiikkaTyyppi = "verkko-http";
    }

    const kuvaukset = {
        "ei-stderr": "yt-dlp ei palauttanut virhetekstiä",
        "drm-suojattu": "sisältö on DRM-suojattu",
        kirjautuminen: "lähde edellyttää kirjautumista",
        "rate-limit": "lähde rajoitti pyyntöjen määrää",
        yksityinen: "sisältö on yksityinen",
        poistettu: "sisältö on poistettu",
        kayttooikeusrajoitus: "lähde esti sisällön käytön",
        "alue-estetty": "sisältö ei ole saatavilla alueella",
        ikarajoitus: "sisällön ikärajoitus estää haun",
        formaatti: "soittokelpoista formaattia ei löytynyt",
        aikakatkaisu: "lähde ei vastannut aikarajan sisällä",
        verkko: "yhteys lähteeseen epäonnistui",
        "ei-saatavilla": "sisältö ei ole saatavilla",
        luokittelematon: "yt-dlp palautti luokittelemattoman virhetekstin"
    };

    return { stderrLuokka, stderrKuvaus: kuvaukset[stderrLuokka], diagnostiikkaTyyppi };
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

function kaynnistaYtdlpProsessi(polku, args, options = {}) {
    let tmpDir;
    try {
        fs.mkdirSync(BIN_KANSIO, { recursive: true });
        tmpDir = fs.mkdtempSync(path.join(BIN_KANSIO, ".2etakas-ytdlp-"));
    } catch (err) {
        console.warn("[ytdlp-temp-root] " + JSON.stringify({
            root: "project",
            code: err?.code ?? null,
            fallback: "system-temp"
        }));
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "2etakas-ytdlp-"));
    }
    const env = {
        ...process.env,
        ...options.env,
        TMPDIR: tmpDir,
        TMP: tmpDir,
        TEMP: tmpDir
    };
    let proc;

    try {
        proc = spawn(polku, args, { ...options, env });
    } catch (err) {
        void fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(siivoamisvirhe => {
            console.warn("[ytdlp-temp-cleanup] " + JSON.stringify({ code: siivoamisvirhe?.code ?? null }));
        });
        throw err;
    }

    let cleanupPromise;
    const cleanup = () => {
        if (!cleanupPromise) {
            cleanupPromise = fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(err => {
                console.warn("[ytdlp-temp-cleanup] " + JSON.stringify({ code: err?.code ?? null }));
            });
        }
        return cleanupPromise;
    };

    proc.once("error", () => { void cleanup(); });
    proc.once("close", () => { void cleanup(); });

    return { proc, tmpDir, cleanup };
}

function suoritaYtdlp(polku, args, { aikarajaMs = 15_000 } = {}) {
    return new Promise(resolve => {
        let ytdlpProsessi;
        try {
            ytdlpProsessi = kaynnistaYtdlpProsessi(polku, args, {
                stdio: ["ignore", "pipe", "pipe"]
            });
        } catch (error) {
            resolve({ exitCode: null, stdout: "", stderr: "", error, timedOut: false });
            return;
        }

        const { proc } = ytdlpProsessi;
        let stdout = "";
        let stderr = "";
        let timedOut = false;
        let valmis = false;
        const ajastin = setTimeout(() => {
            timedOut = true;
            proc.kill("SIGKILL");
        }, aikarajaMs);

        const viimeistele = async (exitCode, error = null) => {
            if (valmis) return;
            valmis = true;
            clearTimeout(ajastin);
            await ytdlpProsessi.cleanup();
            resolve({ exitCode, stdout, stderr, error, timedOut });
        };

        proc.stdout.on("data", data => { stdout += data.toString(); });
        proc.stderr.on("data", data => { stderr += data.toString(); });
        proc.once("error", error => { void viimeistele(null, error); });
        proc.once("close", exitCode => { void viimeistele(exitCode); });
    });
}

async function testaaBinaari(polku) {
    const tulos = await suoritaYtdlp(polku, ["--version"]);
    return !tulos.error && !tulos.timedOut && tulos.exitCode === 0
        ? tulos.stdout.trim()
        : null;
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

async function varmistaHallittuBinaari(polku, versio) {
    const hallittuPolku = path.resolve(BIN_KANSIO, paikallinenNimi());
    if (path.resolve(polku) !== hallittuPolku || !/^\d{4}\.\d{2}\.\d{2}$/.test(versio)) return null;

    const nimi = julkaisunNimi();
    if (!nimi) return null;
    const odotettu = await haeSha256(versio, nimi);
    const toteutunut = await tiedostonSha256(polku);
    return { kelpaa: toteutunut === odotettu };
}

async function lataaTarkistettuAsset(url, kohde, odotettuSha256) {
    const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
    if (!response.ok) throw new Error(`yt-dlp:n lataus epäonnistui (HTTP ${response.status}).`);
    if (!response.body) throw new Error("yt-dlp:n latausvastauksesta puuttui tiedosto.");

    const sisallonPituus = Number(response.headers.get("content-length"));
    if (Number.isFinite(sisallonPituus) && sisallonPituus > BINARI_MAX_TAVUA) {
        throw new Error("yt-dlp:n ladattava tiedosto ylitti kokorajan.");
    }

    const hash = createHash("sha256");
    let ladattu = 0;
    const tarkistavaVirta = new Transform({
        transform(pala, koodaus, valmis) {
            ladattu += pala.length;
            if (ladattu > BINARI_MAX_TAVUA) {
                valmis(new Error("yt-dlp:n ladattava tiedosto ylitti kokorajan."));
                return;
            }
            hash.update(pala);
            valmis(null, pala);
        }
    });

    await pipeline(
        Readable.fromWeb(response.body),
        tarkistavaVirta,
        fs.createWriteStream(kohde, { flags: "wx", mode: 0o700 })
    );

    if (sisallonPituus && ladattu !== sisallonPituus) {
        throw new Error("yt-dlp:n lataus jäi kesken (tiedostokoko ei täsmännyt).");
    }
    if (!ladattu) throw new Error("yt-dlp:n lataus oli tyhjä.");
    if (hash.digest("hex") !== odotettuSha256) {
        throw new Error("yt-dlp:n ladatun tiedoston SHA256 ei täsmännyt viralliseen tarkistussummaan.");
    }
}

async function lataaBinaari(haluttuVersio = null) {
    const nimi = julkaisunNimi();
    if (!nimi) throw new Error(`Alustalle ${process.platform}/${process.arch} ei ole valmista yt-dlp-binääriä.`);

    fs.mkdirSync(BIN_KANSIO, { recursive: true });

    const versio = haluttuVersio ?? await haeUusinVersio();
    if (typeof versio !== "string" || !/^\d{4}\.\d{2}\.\d{2}$/.test(versio)) {
        throw new Error("yt-dlp:n julkaisuversio oli virheellinen.");
    }

    const kohde = path.join(BIN_KANSIO, paikallinenNimi());
    const odotettuSha256 = await haeSha256(versio, nimi);
    const latausKansio = fs.mkdtempSync(path.join(BIN_KANSIO, ".yt-dlp-install-"));
    const vali = path.join(latausKansio, nimi);

    console.log(`⬇️ Ladataan yt-dlp ${versio}: ${nimi} (SHA256 varmennetaan)`);

    try {
        await lataaTarkistettuAsset(`${JULKAISU_URL}/${encodeURIComponent(versio)}/${encodeURIComponent(nimi)}`, vali, odotettuSha256);
        fs.chmodSync(vali, 0o755);

        const ladattuVersio = await testaaBinaari(vali);
        if (ladattuVersio !== versio) {
            throw new Error(`Ladatun yt-dlp:n versio (${ladattuVersio ?? "ei käynnistynyt"}) ei vastannut julkaisua ${versio}.`);
        }

        fs.renameSync(vali, kohde);
        loydetty = { polku: kohde, versio, sha256Varmennettu: true };
        console.log(`✅ yt-dlp ${versio} asennettu ja SHA256 varmennettu.`);
        return loydetty;
    } finally {
        await fs.promises.rm(latausKansio, { recursive: true, force: true });
    }
}

async function paivitaBinaari(polku) {
    const hallittuPolku = path.resolve(BIN_KANSIO, paikallinenNimi());
    if (polku && path.resolve(polku) !== hallittuPolku) {
        throw new Error("Automaattinen varmennettu päivitys koskee vain projektin bin/yt-dlp-tiedostoa.");
    }
    return lataaBinaari();
}

async function loyda() {
    if (loydetty) {
        console.log("✅ yt-dlp välimuistista:", loydetty.polku);
        return loydetty;
    }

    etsinta ??= (async () => {
        const polut = ehdokkaat();
        const tarkistetutPolut = new Set();
        const hallittuPolku = path.resolve(BIN_KANSIO, paikallinenNimi());

        console.log("🔎 Etsitään yt-dlp-ohjelmaa...");
        console.log("📂 Työhakemisto:", process.cwd());
        console.log("🔍 Tarkistettavat polut:", polut);

        for (const polku of polut) {
            const polkuAvain = path.isAbsolute(polku) || polku.includes(path.sep) ? path.resolve(polku) : polku;
            if (tarkistetutPolut.has(polkuAvain)) continue;
            tarkistetutPolut.add(polkuAvain);

            const versio = await testaaBinaari(polku);

            if (versio) {
                console.log("✅ yt-dlp löytyi:", polku);
                console.log("📦 Versio:", versio);

                if (path.resolve(polku) === hallittuPolku) {
                    try {
                        const eheydenTarkistus = await varmistaHallittuBinaari(polku, versio);
                        if (eheydenTarkistus) {
                            if (eheydenTarkistus.kelpaa) {
                                console.info("[ytdlp-sha256] " + JSON.stringify({
                                    verified: true,
                                    matches: true,
                                    version: versio,
                                    asset: julkaisunNimi()
                                }));
                                return { polku, versio, sha256Varmennettu: true };
                            }

                            console.error("[ytdlp-sha256] Asennetun yt-dlp-binäärin tarkistussumma ei täsmää; haetaan virallinen julkaisu uudelleen.");
                            try {
                                return await lataaBinaari(versio);
                            } catch (err) {
                                console.error("[ytdlp-sha256] Varmennettu uudelleenlataus epäonnistui:", err.message);
                                continue;
                            }
                        }
                    } catch (err) {
                        console.warn("[ytdlp-sha256] " + JSON.stringify({
                            verified: false,
                            reason: "official-checksum-unavailable",
                            code: err?.code ?? null
                        }));
                    }
                }

                return { polku, versio, sha256Varmennettu: false };
            }

            console.log("⚠️ Ei löytynyt tai ei käynnistynyt:", polku);
        }

        if (process.env.YTDLP_AUTOASENNUS === "1") {
            try {
                return await lataaBinaari();
            } catch (err) {
                console.error("❌ Automaattinen asennus epäonnistui:", err.message);
            }
        }

        console.error("❌ yt-dlp:tä ei löytynyt.");
        return null;
    })();

    let tulos;
    try {
        tulos = await etsinta;
    } catch (err) {
        etsinta = null;
        throw err;
    }

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

    return suoritaMetatietoJonossa(() => new Promise((resolve, reject) => {
        const ytdlpProsessi = kaynnistaYtdlpProsessi(bin.polku, args, { stdio: ["ignore", "pipe", "pipe"] });
        const proc = ytdlpProsessi.proc;
        const osat = [];
        let koko = 0;
        let virheTeksti = "";
        let valmis = false;
        let aikakatkaistiin = false;

        const ajastin = setTimeout(() => {
            aikakatkaistiin = true;
            proc.kill("SIGKILL");
        }, aikarajaMs);

        proc.stdout.on("data", d => {
            koko += d.length;
            if (koko > JSON_MAX_TAVUA) proc.kill("SIGKILL");
            else osat.push(d);
        });

        proc.stderr.on("data", d => {
            virheTeksti = (virheTeksti + d).slice(-2000);
        });

        proc.on("error", async err => {
            clearTimeout(ajastin);
            await ytdlpProsessi.cleanup();
            if (valmis) return;
            valmis = true;
            reject(lisaaProsessivirheenDiagnostiikka(err, "metadata-spawn", virheTeksti));
        });

        proc.on("close", async koodi => {
            clearTimeout(ajastin);
            await ytdlpProsessi.cleanup();
            if (valmis) return;
            valmis = true;

            if (aikakatkaistiin) {
                return reject(luoYtdlpVirhe({
                    message: "YTDLP_AIKAKATKAISU",
                    vaihe: "metadata-timeout",
                    exitCode: koodi,
                    stderr: virheTeksti,
                    syy: "yt-dlp-metatietahaku ylitti aikarajan"
                }));
            }

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
    }));
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

    const ytdlpProsessi = kaynnistaYtdlpProsessi(bin.polku, args, { stdio: ["ignore", "pipe", "pipe"] });
    const proc = ytdlpProsessi.proc;
    let tavuja = 0;
    let virheTeksti = "";
    let kaynnistynyt = false;
    let suljettu = false;
    let aanivirtaValmis = false;
    let viimeisteleKaynnistys = () => {};
    const mitattuVirta = new Transform({
        transform(pala, koodaus, valmis) {
            tavuja += pala.length;
            valmis(null, pala);
        }
    });

    // stdout ei saa päättää Transform-virtaa ennen kuin tiedämme yt-dlp:n
    // poistumiskoodin. Muuten myöhempi prosessivirhe jäisi soittimelta piiloon.
    proc.stdout.pipe(mitattuVirta, { end: false });
    proc.stderr.on("data", d => {
        virheTeksti = (virheTeksti + d).slice(-2000);
    });

    const kaynnistys = new Promise((resolve, reject) => {
        let valmis = false;
        let ajastin;
        const viimeistele = err => {
            if (valmis) return;
            valmis = true;
            clearTimeout(ajastin);
            mitattuVirta.removeListener("readable", tarkistaAanidata);
            if (err) reject(err);
            else resolve();
        };
        const tarkistaAanidata = () => {
            if (mitattuVirta.readableLength === 0) return;
            aanivirtaValmis = true;
            viimeistele();
        };

        viimeisteleKaynnistys = viimeistele;
        mitattuVirta.on("readable", tarkistaAanidata);
        ajastin = setTimeout(() => {
            const virhe = luoYtdlpVirhe({
                message: "YTDLP_AIKAKATKAISU",
                vaihe: "stream-start-timeout",
                stderr: virheTeksti,
                syy: "yt-dlp ei aloittanut äänivirtaa aikarajan sisällä"
            });
            try {
                proc.kill("SIGKILL");
            } catch {
                // Prosessi on jo suljettu.
            }
            viimeistele(virhe);
        }, VIRTA_ALKU_AIKARAJA_MS);
        ajastin.unref?.();

        proc.once("spawn", () => {
            kaynnistynyt = true;
        });

        proc.on("error", async err => {
            virheTeksti = err.message;
            if (!kaynnistynyt) {
                await ytdlpProsessi.cleanup();
                viimeistele(lisaaProsessivirheenDiagnostiikka(err, "stream-spawn", virheTeksti));
            } else if (!suljettu) {
                if (!aanivirtaValmis) {
                    viimeistele(luoYtdlpVirhe({
                        vaihe: "stream-process-error",
                        stderr: virheTeksti,
                        cause: err
                    }));
                    mitattuVirta.destroy();
                } else {
                    mitattuVirta.destroy(err);
                }
            }
        });
    });

    proc.once("close", async (koodi, signaali) => {
        await ytdlpProsessi.cleanup();
        if (suljettu || mitattuVirta.destroyed) return;

        if (koodi === 0) {
            if (!aanivirtaValmis) {
                viimeisteleKaynnistys(luoYtdlpVirhe({
                    vaihe: "stream-process-exit",
                    stderr: virheTeksti,
                    syy: "yt-dlp sulkeutui ennen äänidatan palauttamista"
                }));
            }
            mitattuVirta.end();
            return;
        }

        const virhe = luoYtdlpVirhe({
            vaihe: "stream-process-exit",
            exitCode: koodi,
            stderr: virheTeksti,
            syy: koodi === null
                ? `yt-dlp-prosessi keskeytyi (${signaali || "tuntematon signaali"})`
                : `yt-dlp poistui virhekoodilla ${koodi}`
        });
        if (!aanivirtaValmis) {
            viimeisteleKaynnistys(virhe);
            mitattuVirta.destroy();
            return;
        }
        mitattuVirta.destroy(virhe);
    });

    proc.stdout.on("error", err => {
        if (suljettu) return;
        if (!aanivirtaValmis) {
            viimeisteleKaynnistys(luoYtdlpVirhe({
                vaihe: "stream-stdout-error",
                stderr: virheTeksti,
                cause: err
            }));
            mitattuVirta.destroy();
            return;
        }
        mitattuVirta.destroy(err);
    });

    try {
        await kaynnistys;
    } catch (err) {
        suljettu = true;
        mitattuVirta.destroy();
        if (err?.message === "YTDLP_VIRHE" || err?.message === "YTDLP_AIKAKATKAISU") throw err;
        throw lisaaProsessivirheenDiagnostiikka(err, "stream-spawn", virheTeksti);
    }

    return {
        stream: mitattuVirta,
        tavuja: () => tavuja,
        virhe: () => turvallinenDiagnostiikkaTeksti(virheTeksti).trim().split("\n").pop() ?? "",
        sulje: () => {
            if (suljettu) return;
            suljettu = true;
            try {
                proc.kill("SIGKILL");
            } catch {
                // Prosessi on jo suljettu.
            }
            mitattuVirta.destroy();
        }
    };
}

module.exports = {
    loyda,
    tiedot,
    virta,
    julkaisunNimi,
    luoYtdlpVirhe,
    turvallinenDiagnostiikkaTeksti,
    stderrDiagnostiikka,
    kaynnistaYtdlpProsessi,
    suoritaYtdlp,
    paivitaBinaari,
    sha256Manifestista,
    tiedostonSha256,
    tarkistaTempHakemisto,
    suoritaMetatietoJonossa
};
