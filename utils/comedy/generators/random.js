function satunnainen(lista) {
    return lista[Math.floor(Math.random() * lista.length)];
}

function satunnaisVali(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Poimii n uniikkia alkiota listasta ilman toistoa (tai koko listan jos n >= listan pituus). */
function satunnaisetMonta(lista, n) {
    const kopio = [...lista];
    const tulos = [];
    const maara = Math.min(n, kopio.length);

    for (let i = 0; i < maara; i++) {
        const indeksi = Math.floor(Math.random() * kopio.length);
        tulos.push(kopio.splice(indeksi, 1)[0]);
    }

    return tulos;
}

/** Korvaa "{n}"-paikanvaraajan satunnaisella luvulla (oletusväli 2-20). */
function taytaLukuPaikanvaraaja(teksti, min = 2, max = 20) {
    return teksti.replace(/\{n\}/g, () => satunnaisVali(min, max));
}

/**
 * Deterministinen "päivän" indeksi listaan — sama päivä (Helsingin ajassa)
 * antaa aina saman tuloksen, jotta esim. /paivanrikos ei vaihdu joka
 * kutsulla. Käyttää yksinkertaista merkkijonohajautusta siemenenä.
 */
function paivanIndeksi(pvm, listanPituus) {
    let hash = 0;
    for (const merkki of pvm) {
        hash = (hash * 31 + merkki.charCodeAt(0)) >>> 0;
    }
    return hash % listanPituus;
}

function paivanAlkio(pvm, lista) {
    return lista[paivanIndeksi(pvm, lista.length)];
}

module.exports = {
    satunnainen,
    satunnaisVali,
    satunnaisetMonta,
    taytaLukuPaikanvaraaja,
    paivanIndeksi,
    paivanAlkio
};
