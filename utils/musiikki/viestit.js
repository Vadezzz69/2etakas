// Musiikkikomentojen viestit. Jokaisessa tilanteessa on oma poolinsa, jotta
// botti ei toista samaa vitsiä (valinta: utils/satunnainen.js). Paikanvaraajat
// ovat muotoa {nimi} ja ne täytetään `tayta()`-funktiolla.

const KANAVALLE_PAKKO = [
    "Mene ensin äänikanavalle. Komitea ei soita tyhjyydelle (paitsi joskus).",
    "Et ole äänikanavalla. Musiikki on tarkoitettu ihmisille, ei seinille.",
    "Liity johonkin äänikanavaan ensin, niin komitea alkaa kuunnella.",
    "Kuka kuuntelee jos ei ole kanavaa? Liity ensin äänikanavalle.",
    "Äänikanava puuttuu. Komitean DJ ei esiinny ilman yleisöä."
];

const TOISELLA_KANAVALLA = [
    "Olen jo kanavalla {kanava} soittamassa. Liity sinne, niin pääset mukaan.",
    "Komitean DJ on varattu: keikka käynnissä kanavalla {kanava}.",
    "En voi olla kahdessa paikassa yhtä aikaa. Olen kanavalla {kanava}.",
    "Tulkaa kanavalle {kanava}. Siellä musiikki jo soi."
];

const EI_OIKEUKSIA_KANAVALLE = [
    "En pääse kanavalle {kanava} tai en saa puhua siellä. Anna botille oikeudet *Yhdistä* ja *Puhu*.",
    "Kanavan {kanava} ovi on lukossa. Botti tarvitsee oikeudet *Yhdistä* ja *Puhu*."
];

const EI_SOI = [
    "Mikään ei soi juuri nyt. Hiljaisuus on virallisesti komitean suosikkigenre.",
    "Ei soi mitään. Käytä /soita, niin komitea keksii jotain.",
    "Soittolista on tyhjä kuin komitean aikataulu.",
    "Äänikanavalla on hiljaista. Liian hiljaista."
];

const LISATTY_OTSIKOT = [
    "➕ Lisätty jonoon",
    "➕ Komitea hyväksyi ehdotuksen",
    "➕ Jonoon meni",
    "➕ Setti kasvaa",
    "➕ Uusi biisi jonossa"
];

const SOI_OTSIKOT = [
    "🎶 Nyt soi",
    "🎶 Komitean DJ aloittaa",
    "🎶 Ääni päälle",
    "🎶 Soitetaan",
    "🎶 Äänikanavalta kuuluu"
];

const OHITETTU = [
    "⏭️ Ohitettu: **{otsikko}**. Kukaan ei itke.",
    "⏭️ **{otsikko}** heitettiin ulos. Komitea on tyytyväinen.",
    "⏭️ Sanoit ei kappaleelle **{otsikko}**. Rohkeaa.",
    "⏭️ **{otsikko}** poistui areenalta.",
    "⏭️ **{otsikko}** ohitettu. Seuraavaksi paremmin (ehkä)."
];

const LOPETETTU = [
    "⏹️ Musiikki loppui ja botti poistui kanavalta.",
    "⏹️ Keikka ohi. Komitea pakkaa laitteet.",
    "⏹️ Jono tyhjennetty, botti lähti. Kiitos kuuntelusta (ei kiitosta).",
    "⏹️ Hiljaisuus palasi. Se oli yleisön toive."
];

const TAUOLLA = [
    "⏸️ Tauko. Komitea hengittää.",
    "⏸️ Musiikki pysäytetty. Jatka komennolla /tauko.",
    "⏸️ Hiljaisuus. Jopa DJ tarvitsee kahvin."
];

const JATKUU = [
    "▶️ Jatketaan siitä mihin jäätiin.",
    "▶️ Ääni takaisin. Komitea on valmis.",
    "▶️ Tauko ohi. Takaisin töihin."
];

const SEKOITETTU = [
    "🔀 Jono sekoitettu ({n} kappaletta). Komitea ei muista enää järjestystä.",
    "🔀 {n} kappaletta heitettiin ilmaan. Näin ne putosivat.",
    "🔀 Kaaos on nyt järjestelmällistä. {n} kappaletta uudessa järjestyksessä.",
    "🔀 Jono sekoitettu. Sattuma hoitaa loput ({n} kappaletta)."
];

const JONO_TYHJA = [
    "Jono on tyhjä. Seuraavaa kappaletta ei ole, ja se on yllättävän vapauttavaa.",
    "Jonossa ei ole mitään. Lisää kappaleita komennolla /soita.",
    "Tyhjä jono. Komitea odottaa ehdotuksia."
];

const JONO_LOPPUI = [
    "🎵 Jono loppui. Lisää kappaleita komennolla /soita, tai botti poistuu kohta.",
    "🎵 Setti päättyi. Komitea odottaa uutta ehdotusta.",
    "🎵 Ei enää kappaleita. Hiljaisuus astuu lavalle."
];

const POISTU_JONO = [
    "👋 Kukaan ei lisännyt mitään, joten botti lähti. Terveisin, komitea.",
    "👋 Jono oli tyhjä liian kauan. Komitea poistui paikalta.",
    "👋 Ei kuuntelijoita eikä kappaleita. Botti kävi hakemassa kahvia ja jäi sille tielle."
];

const POISTU_YKSIN = [
    "👋 Jäin kanavalle yksin, joten lähdin. Se on parempi kuin puhua itselleni.",
    "👋 Kaikki lähtivät. Botti myös. Hyvästi.",
    "👋 Tyhjä kanava ei tarvitse musiikkia. Lähdin."
];

const KAPPALE_VIRHE = [
    "⚠️ Kappaleen **{otsikko}** soitto ei onnistunut, joten se ohitettiin.",
    "⚠️ **{otsikko}** ei suostunut soimaan. Komitea siirtyi eteenpäin.",
    "⚠️ **{otsikko}** kaatui matkalla. Ohitettu ilman suruvalittelua.",
    "⚠️ Kappale **{otsikko}** ei lähtenyt käyntiin. Seuraava, kiitos."
];

const TOISTOTILAT = {
    pois: "➡️ Toisto pois: jono soi kerran läpi.",
    kappale: "🔂 Nykyistä kappaletta toistetaan loputtomiin. Komitea suosittelee terapiaa.",
    jono: "🔁 Koko jono kiertää uudestaan ja uudestaan."
};

function tayta(teksti, arvot = {}) {
    return teksti.replace(/\{(\w+)\}/g, (_, nimi) => String(arvot[nimi] ?? ""));
}

module.exports = {
    KANAVALLE_PAKKO,
    TOISELLA_KANAVALLA,
    EI_OIKEUKSIA_KANAVALLE,
    EI_SOI,
    LISATTY_OTSIKOT,
    SOI_OTSIKOT,
    OHITETTU,
    LOPETETTU,
    TAUOLLA,
    JATKUU,
    SEKOITETTU,
    JONO_TYHJA,
    JONO_LOPPUI,
    POISTU_JONO,
    POISTU_YKSIN,
    KAPPALE_VIRHE,
    TOISTOTILAT,
    tayta
};
