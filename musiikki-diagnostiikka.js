const path = require("node:path");
require("dotenv").config({ quiet: true });

const ytdlp = require("./utils/musiikki/ytdlp");
const tulosta = console.log.bind(console);
const alkuperainenVirheTuloste = console.error;

function binaarinSijaintiluokka(bin) {
    if (!bin) return "ei-loytynyt";

    const polku = path.resolve(bin.polku);
    if (process.env.YTDLP_PATH && polku === path.resolve(process.env.YTDLP_PATH)) {
        return "YTDLP_PATH";
    }

    const nimi = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
    if (polku === path.resolve("bin", nimi)) return "project-bin";
    return "PATH";
}

function virheluokka(err) {
    if (err?.message === "YTDLP_PUUTTUU") return "yt-dlp-puuttuu";
    if (err?.vaihe === "metadata-spawn") return "prosessin-kaynnistys";
    return ytdlp.stderrDiagnostiikka(err?.stderr ?? err?.yksityiskohta ?? "").diagnostiikkaTyyppi;
}

async function main() {
    const lahteet = [
        { lahde: "SoundCloud", etuliite: "scsearch" },
        { lahde: "YouTube", etuliite: "ytsearch" }
    ];

    const alkuperainenLoki = console.log;
    console.log = () => {};
    console.error = () => {};

    try {
        const bin = await ytdlp.loyda();

        for (const { lahde, etuliite } of lahteet) {
            const alku = Date.now();
            let exitCode = null;
            let luokka = null;

            try {
                if (!bin) throw new Error("YTDLP_PUUTTUU");
                await ytdlp.tiedot(`${etuliite}5:lofi hip hop`, { lista: false });
                exitCode = 0;
            } catch (err) {
                exitCode = Number.isInteger(err?.exitCode) ? err.exitCode : null;
                luokka = virheluokka(err);
            }

            tulosta(JSON.stringify({
                lahde,
                ytDlpVersio: bin?.versio ?? null,
                binaarinSijaintiluokka: binaarinSijaintiluokka(bin),
                evasteetAsetettu: Boolean(process.env.YTDLP_COOKIES),
                proxyAsetettu: Boolean(process.env.YTDLP_PROXY),
                lisaArgumentitAsetettu: Boolean(process.env.YTDLP_LISAARGS),
                exitCode,
                kestoMs: Date.now() - alku,
                virheluokka: luokka
            }));
        }
    } finally {
        console.log = alkuperainenLoki;
        console.error = alkuperainenVirheTuloste;
    }
}

main().catch(() => {
    for (const lahde of ["SoundCloud", "YouTube"]) {
        tulosta(JSON.stringify({
            lahde,
            ytDlpVersio: null,
            binaarinSijaintiluokka: "ei-tiedossa",
            evasteetAsetettu: Boolean(process.env.YTDLP_COOKIES),
            proxyAsetettu: Boolean(process.env.YTDLP_PROXY),
            lisaArgumentitAsetettu: Boolean(process.env.YTDLP_LISAARGS),
            exitCode: null,
            kestoMs: null,
            virheluokka: "diagnostiikka-epäonnistui"
        }));
    }
    process.exitCode = 1;
});
