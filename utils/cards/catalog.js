const rarities = [
    { name:"Tavallinen", limit:5000, color:"#91a5bd", background:"#1c2737", value:1 },
    { name:"Epätavallinen", limit:7500, color:"#55d6a9", background:"#102f2c", value:2 },
    { name:"Harvinainen", limit:9000, color:"#73b3ff", background:"#132d48", value:4 },
    { name:"Eeppinen", limit:9700, color:"#b995ff", background:"#281b48", value:8 },
    { name:"Legendaarinen", limit:9950, color:"#ffc468", background:"#3a271d", value:16 },
    { name:"Myyttinen", limit:10000, color:"#f988b7", background:"#431f3a", value:32 }
];

const classes = [
    ["Vakooja","Pimeys","Vakoilu","Varjoaskel","Kuulee kokouksen ennen kuin kokous alkaa.","dodge",{power:0.88,status:"heikko"}],
    ["Kapinallinen","Tuli","Komitean raivo","Palohaava","Käyttää kokouspöytäkirjaa sytykkeenä.","critical",{power:1.1,status:"palo"}],
    ["Veronkiertäjä","Myrkky","Kriittinen sakko","Kuluvähennys","Ilmoittaa jokaisen kahvikupin yrityskuluksi.","drain",{power:0.83,status:"palo"}],
    ["Soturi","Jää","Tilapäinen porttikielto","Kilpimuuri","Saapuu äänikanavalle kypärä päässä.","armor",{power:1.04,status:"hidas"}],
    ["Hakkeri","Teknologia","Enzonic Error 503","Varmuuskopio","Osaa käynnistää palvelun uudelleen jo ennen virhettä.","regen",{power:0.88,status:"heikko"}],
    ["Ylivalvoja","Sähkö","Komitean ylijännite","Valvontakamera","Katsoo lokit ennen aamukahvia.","initiative",{power:1.02,status:"hidas"}],
    ["Kaaoksen lähettiläs","Kaaos","Todisteiden hävittäminen","Poikkeuspykälä","Toimittaa mietinnön sileänä paperisilppuna.","critical",{power:1.15,status:"heikko"}],
    ["Varjo","Vesi","Tulvakuulustelu","Hiljainen poistuminen","Luikahtaa kokouksesta ennen nimenhuutoa.","dodge",{power:1,status:"palo"}],
    ["Komitean agentti","Valo","Agentin vastaisku","Hätävarustus","Kantaa varapöytäkirjaa takin sisätaskussa.","drain",{power:1.1,status:"hidas"}],
    ["Byrokraatti","Neutraali","Byrokraattinen isku","Pykäläsuoja","Hakee lupaa hakea lupaa viikonloppuna.","armor",{power:1.02,status:"heikko"}]
];
const passives = {
    dodge:"Suurempi väistö",critical:"Useampi kriittinen osuma",drain:"Osuma palauttaa 2 HP",
    armor:"Vähentää saapuvaa vahinkoa",regen:"Palauttaa 2 HP vuoron alussa",initiative:"Aloite +3"
};

const items = {
    laastari:{name:"Ensiapulaukku",price:24,kind:"heal",description:"Palauttaa taistelussa 24 HP."},
    pakka:{name:"Arkistopakka",price:45,kind:"pack",description:"Sisältää kolme keräilykorttia."},
    suoja:{name:"Pykäläkilpi",price:90,kind:"gear",description:"Puolustus +2."},
    saappaat:{name:"Hiipijän saappaat",price:90,kind:"gear",description:"Nopeus +2."},
    koulutus:{name:"Koulutusopas",price:75,kind:"training",description:"Antaa 50 kokemuspistettä."},
    kehys:{name:"Kultainen arkistokehys",price:110,kind:"cosmetic",description:"Kullanvärinen erikoiskehys."},
    holo:{name:"Holografinen leima",price:130,kind:"cosmetic",description:"Holografinen korttitausta."},
    titteli:{name:"Pykälämestari",price:95,kind:"cosmetic",description:"Kortilla näkyvä titteli."},
    tausta:{name:"Yövuoron tausta",price:95,kind:"cosmetic",description:"Sininen taustakuvio."}
};

const elements = ["Tuli","Jää","Sähkö","Vesi","Teknologia","Myrkky","Valo","Pimeys","Kaaos"];
const advantage = (a,b) => a!=="Neutraali" && b!=="Neutraali" && elements[(elements.indexOf(a)+1)%elements.length]===b;

module.exports={rarities,classes,passives,items,advantage};
