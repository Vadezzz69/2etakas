const HAUSKAT_KOMMENTIT = [
    "Ai että osaa olla kömpelö! 🤕",
    "Ehkä kannattaisi harkita kypärää seuraavalla kerralla.",
    "Tästä tulee hyvä tarina lastenlapsille.",
    "Vakuutusyhtiö alkaa tunnistaa numeron.",
    "Onneksi kipu on vain mielentila. Tai näin sanotaan.",
    "Tämä oli suorastaan taiteellinen suoritus.",
    "Legenda kasvaa jälleen.",
    "Ensiapuasema soittaa jo tervetuliaissoiton.",
    "Fysioterapeutti tienaa taas kunnon palkan.",
    "Darwin-palkinto siintää horisontissa."
];

const TITTELIT = [
    { min: 0, title: "Vasta-alkaja 🍼" },
    { min: 3, title: "Kömpelö kokelas 🩹" },
    { min: 5, title: "Kokenut kaatuja 🤸" },
    { min: 10, title: "Sairaalan vakioasiakas 🏥" },
    { min: 20, title: "Elävä legenda 🦴" },
    { min: 35, title: "Kuolematon 💀" },
    { min: 50, title: "Fysiikan lakeja uhmaava ilmiö 🌪️" }
];

function arvonimi(count) {
    return [...TITTELIT].reverse().find(t => count >= t.min).title;
}

function satunnainenKommentti() {
    return HAUSKAT_KOMMENTIT[Math.floor(Math.random() * HAUSKAT_KOMMENTIT.length)];
}

module.exports = { arvonimi, satunnainenKommentti };
