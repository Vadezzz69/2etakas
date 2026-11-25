const rarities = [
    { name:"Perusdrop", limit:5000, color:"#91a5bd", background:"#1c2737", value:1 },
    { name:"Oho-drop", limit:7500, color:"#55d6a9", background:"#102f2c", value:2 },
    { name:"Paha drop", limit:9000, color:"#73b3ff", background:"#132d48", value:4 },
    { name:"Ihan vitun clean", limit:9700, color:"#b995ff", background:"#281b48", value:8 },
    { name:"Servun legenda", limit:9950, color:"#ffc468", background:"#3a271d", value:16 },
    { name:"Adminin RNG", limit:10000, color:"#f988b7", background:"#431f3a", value:32 }
];

const classes = [
    ["Lurkkii mutella","Pimeys","blossit savut silmii","Savuverho mode","Oli AFK koko matsin. Ties silti kaiken.","dodge",{power:0.88,status:"heikko"}],
    ["Mikki punasella","Tuli","sano VITU täysii","Mic boost +200 %","Noise suppression luovutti ekana.","critical",{power:1.1,status:"palo"}],
    ["Kuittivelho","Myrkky","vedätti koko servuu","Alv-vähennys","Ilmotti gripin verovähennyksiin.","drain",{power:0.83,status:"palo"}],
    ["Treflip-terapeutti","Jää","ländäs täydellise treflipin","Kypärä lainassa","Ländäs cleanisti. Väitti et eka yritys.","armor",{power:1.04,status:"hidas"}],
    ["Pingivelho","Teknologia","pisti servun lagaa","Reboot parantaa","Sai pingiks 999 ja sano et ihan pelattava.","regen",{power:0.88,status:"heikko"}],
    ["Servun ykkönen","Sähkö","ampuu yköst servul","Ehti jo lukita","Kuuli sanan rematch ja oli jo lobbyssa.","initiative",{power:1.02,status:"hidas"}],
    ["Lazerflip-lääkäri","Kaaos","ländäs täydellise lazerflipin","Ländää vahingossa","Sano et lämmittelee. Lauta oli katolla.","critical",{power:1.15,status:"heikko"}],
    ["Savuihin kadonnu","Vesi","hävis savuihin","Poistu äänettä","Lähti hakee vettä. Viimeksi nähty 2022.","dodge",{power:1,status:"palo"}],
    ["Portaiden poliisi","Valo","heitti no complyt portaist","Veti kaiteesta virtaa","Skeittikielto oli kuulemma suositus.","drain",{power:1.1,status:"hidas"}],
    ["Kuittien final boss","Neutraali","löi kuitit tiskii","Lomake panssarina","Banni hylättiin. Väärä lomake.","armor",{power:1.02,status:"heikko"}]
];
const passives = {
    dodge:"Suurempi väistö",critical:"Useampi kriittinen osuma",drain:"Osuma palauttaa 2 HP",
    armor:"Vähentää saapuvaa vahinkoa",regen:"Palauttaa 2 HP vuoron alussa",initiative:"Aloite +3"
};

const items = {
    laastari:{name:"Ensiapulaukku",price:24,kind:"heal",description:"Puhalla pipiin. +24 HP matsissa."},
    pakka:{name:"Arkistopakka",price:45,kind:"pack",description:"Kolme korttia. Nyt se RNG mitataan."},
    suoja:{name:"Pykäläkilpi",price:90,kind:"gear",description:"Kuittipanssari. Puolustus +2."},
    saappaat:{name:"Hiipijän saappaat",price:90,kind:"gear",description:"Varvas karkaa. Nopeus +2."},
    koulutus:{name:"Koulutusopas",price:75,kind:"training",description:"Lue takakansi. +50 XP."},
    kehys:{name:"Kultainen arkistokehys",price:110,kind:"cosmetic",description:"Kullanvärinen erikoiskehys."},
    holo:{name:"Holografinen leima",price:130,kind:"cosmetic",description:"Holografinen korttitausta."},
    titteli:{name:"Pykälämestari",price:95,kind:"cosmetic",description:"Kortilla näkyvä titteli."},
    tausta:{name:"Yövuoron tausta",price:95,kind:"cosmetic",description:"Sininen taustakuvio."}
};

const elements = ["Tuli","Jää","Sähkö","Vesi","Teknologia","Myrkky","Valo","Pimeys","Kaaos"];
const advantage = (a,b) => a!=="Neutraali" && b!=="Neutraali" && elements[(elements.indexOf(a)+1)%elements.length]===b;

module.exports={rarities,classes,passives,items,advantage};
