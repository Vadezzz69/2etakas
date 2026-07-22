// Jaettu todistepooli. /todiste käyttää tätä suoraan; /syyte käyttää samaa
// poolia "todistusaineisto"-kentässään, jotta samaa listaa ei tarvitse
// ylläpitää kahdessa paikassa.

const TODISTEET = [
    "Epätarkka JPEG, otettu väärästä kulmasta",
    "MS Paint -rekonstruktio tapahtumasta",
    "Steam-kuvakaappaus jolla ei ole mitään tekemistä asian kanssa",
    "Tyhjä Monster-tölkki, säilytetty todisteena",
    "Puhelimen kuvakaappaus jonka aikaleima on väärä",
    "Käsin piirretty kartta tapahtumapaikasta, epätarkka",
    "Ääninauha jolla kuuluu vain hengitystä",
    "Anonyymi vihje, jonka lähdettä ei paljasteta",
    "Discord-viestin kuvakaappaus, osittain sensuroitu",
    "Valokuva jääkaapista, otettu väärään aikaan",
    "Excel-taulukko jonka tarkoitus on epäselvä",
    "Kolme silminnäkijähavaintoa jotka eivät täsmää keskenään",
    "Voice-kanavan osallistujalista, epätäydellinen",
    "Yksi (1) meemi joka väitetään olevan todiste",
    "Kuitti kaupasta, ei liity asiaan mutta liitetty silti",
    "Selfie taustalla epäilyttävä yksityiskohta",
    "Google Mapsin aikajana, tulkittu vapaasti",
    "Screenshotti kalenterista, tapahtuma merkitty epäselvästi",
    "PowerPoint-esitys 47 diaa, kaikki asiaankuulumattomia",
    "Sormenjälki joka saattaa kuulua kenelle tahansa",
    "Muistilappu jossa lukee vain \"tiedän mitä teit\"",
    "Kaksi ristiriitaista todistajanlausuntoa samalta henkilöltä",
    "Video jossa näkyy vain huone, ei tapahtumaa",
    "Piirretty aikajana jossa kellonajat eivät täsmää",
    "Analyysiraportti jonka johtopäätös on \"epäselvää\"",
    "Kuvakaappaus keskustelusta jossa konteksti puuttuu kokonaan",
    "Nauhoitus jolla kuuluu vain taustamusiikki",
    "Yksityiskohtainen mutta täysin väärä muistikuva",
    "Lämpökamerakuva josta ei erota mitään",
    "GPS-data joka sijoittaa epäillyn kolmeen paikkaan yhtä aikaa",
    "Kolme erilaista versiota samasta tarinasta, kaikki epäillyn omia",
    "Puolikas kuvakaappaus, loppuosa \"kadonnut\"",
    "Anonyymi PDF-tiedosto ilman metatietoja",
    "Ääniviesti joka on liian hiljainen kuultavaksi",
    "Valokuva josta epäilty on rajattu pois vahingossa"
];

module.exports = { TODISTEET };
