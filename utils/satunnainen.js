// Koko botin ainoa satunnaisuusmoduuli. Aiemmin sama `satunnainen`-funktio oli
// kopioituna neljään tiedostoon (komiteadata, vakoiludata, roastdata,
// comedy/generators/random) — nyt ne kaikki käyttävät tätä.
//
// Toiston esto: jokainen lista (taulukko-olio) muistaa viimeksi arvotut
// indeksinsä, eikä niitä arvota uudelleen ennen kuin ne ovat "vanhentuneet".
// Muistin koko on kolmasosa listan pituudesta (max 10; 3–5 alkion listoilla
// vain edellinen), joten arvonta on silti tasainen kaikkien muistin
// ulkopuolisten vaihtoehtojen kesken ja jokainen vaihtoehto tulee ajan
// mittaan esiin. Kahden alkion listoilla ei ole muistia (kolikonheitto yms.
// pysyy puhtaasti satunnaisena), eikä lennossa koottavilla listoilla (esim.
// palvelimen jäsenet) ole muistia lainkaan, koska jokainen kutsu saa uuden
// taulukko-olion.

const MUISTI = new WeakMap();
const MUISTIN_MAX = 10;

function arvoIndeksi(maara) {
    return Math.floor(Math.random() * maara);
}

function muistinKoko(listanPituus) {
    if (listanPituus < 3) return 0;      // kaksi vaihtoehtoa = pysyy puhtaasti satunnaisena
    if (listanPituus < 6) return 1;      // vältetään vain heti edellistä
    return Math.min(MUISTIN_MAX, Math.floor(listanPituus / 3));
}

/** Satunnainen alkio listasta, välttäen viimeksi arvottuja. Tyhjästä listasta undefined. */
function satunnainen(lista) {
    const pituus = lista.length;
    if (pituus === 0) return undefined;

    const koko = muistinKoko(pituus);
    if (koko === 0) return lista[arvoIndeksi(pituus)];

    let viimeiset = MUISTI.get(lista);
    if (!viimeiset) {
        viimeiset = [];
        MUISTI.set(lista, viimeiset);
    }

    // koko < pituus, joten vapaa indeksi löytyy aina.
    let indeksi;
    do {
        indeksi = arvoIndeksi(pituus);
    } while (viimeiset.includes(indeksi));

    viimeiset.push(indeksi);
    if (viimeiset.length > koko) viimeiset.shift();

    return lista[indeksi];
}

/** Satunnainen kokonaisluku väliltä [min, max] (molemmat mukaan lukien). */
function satunnaisVali(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Poimii n uniikkia alkiota listasta ilman toistoa (tai koko listan jos n >= listan pituus). */
function satunnaisetMonta(lista, n) {
    const kopio = [...lista];
    const maara = Math.min(n, kopio.length);

    for (let i = 0; i < maara; i++) {
        const j = i + arvoIndeksi(kopio.length - i);
        [kopio[i], kopio[j]] = [kopio[j], kopio[i]];
    }

    return kopio.slice(0, maara);
}

/** Palauttaa true annetulla todennäköisyydellä (0–1). */
function todennakoisyys(p) {
    return Math.random() < p;
}

module.exports = { satunnainen, satunnaisVali, satunnaisetMonta, todennakoisyys };
