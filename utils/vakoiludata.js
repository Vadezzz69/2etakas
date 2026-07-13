const KOODINIMI_ADJEKTIIVIT = [
    "Hiljainen", "Näkymätön", "Kylmä", "Nopea", "Varjoinen", "Terävä",
    "Vaarallinen", "Salaperäinen", "Vaiteliaas", "Petollinen", "Jääkylmä",
    "Viekas", "Ovela", "Tumma", "Äänetön"
];

const KOODINIMI_SUBSTANTIIVIT = [
    "Kotka", "Susi", "Käärme", "Haukka", "Ilves", "Panttari", "Korppi",
    "Ketunhäntä", "Skorpioni", "Tiikeri", "Varjoagentti", "Falcon",
    "Musta Kissa", "Hämähäkki", "Karhu"
];

const VAKOILURAPORTIT = [
    "Kohde havaittu ostamassa epäilyttävän suuren määrän maitoa. Motiivi tuntematon.",
    "Kohde vietti 47 minuuttia tuijottaen jääkaappia ilman selkeää tarkoitusta.",
    "Kohde on selvästi treenannut kävelemään ovista huomaamattomammin. Edistystä havaittu.",
    "Kohde puhui itsekseen kolme kertaa tunnin sisällä. Mahdollinen salakoodi?",
    "Kohteen liikkeet viittaavat siihen, että hän ei muista miksi meni keittiöön.",
    "Kohde vältteli katsekontaktia kahvinkeittimen kanssa. Syy epäselvä.",
    "Kohde nauroi omalle vitsilleen ennen kuin ehti kertoa sen. Turvallisuusuhka?",
    "Kohde on todistetusti kykenevä katoamaan huoneesta täysin äänettömästi.",
    "Kohteen puhelimen ruutuaika viittaa vakavaan salaiseen operaatioon somen parissa.",
    "Kohde yritti avata lukittua ovea viisi kertaa peräkkäin. Ei oppinut mitään.",
    "Kohde on ilmeisesti liittoutunut jääkaapin kanssa. Tarkkailua jatketaan.",
    "Kohde puhui videopuhelussa mykistettynä kaksi minuuttia huomaamatta sitä."
];

const TEHTAVAT = [
    { nimi: "Operaatio Kadonnut Etäohjain", vaikeus: "Helppo", palkkio: "Kunniamerkki + kahvi" },
    { nimi: "Operaatio Hiljainen Keittiö", vaikeus: "Keskitaso", palkkio: "Pääsy salaiseen välipala-arkistoon" },
    { nimi: "Operaatio Näkymätön Askel", vaikeus: "Vaikea", palkkio: "Ylennys Vanhemmaksi Vakoojaksi" },
    { nimi: "Operaatio Kaksoisagentti Kissassa", vaikeus: "Erittäin vaikea", palkkio: "Oma koodinimi virallistetaan" },
    { nimi: "Operaatio Punainen Silli", vaikeus: "Keskitaso", palkkio: "Vapautus seuraavasta vuorosta" },
    { nimi: "Operaatio Hiljainen Ovi", vaikeus: "Helppo", palkkio: "Pieni kunniamaininta" },
    { nimi: "Operaatio Viimeinen Keksi", vaikeus: "Vaarallinen", palkkio: "Ikuinen kunnia komiteassa" }
];

const SALAISUUDET = [
    "Komitea tietää enemmän kuin antaa ymmärtää.",
    "Kolmas kerros ei ole olemassa virallisissa asiakirjoissa.",
    "Kahvinkeittimellä on oma agenttinumero.",
    "Joku tässä palvelimessa on kaksoisagentti. Ehkä.",
    "Alkuperäinen suunnitelma hylättiin liian kunnianhimoisena.",
    "Kaikki tähänastiset raportit on kirjoitettu salakielellä, jota kukaan ei enää muista.",
    "Todellinen komitea kokoontuu vasta keskiyön jälkeen.",
    "Yksi näistä komennoista on itsessään peiteoperaatio."
];

function hashKoodinimi(userId) {
    let hash = 0;
    for (const char of userId) {
        hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    }
    const adj = KOODINIMI_ADJEKTIIVIT[hash % KOODINIMI_ADJEKTIIVIT.length];
    const noun = KOODINIMI_SUBSTANTIIVIT[Math.floor(hash / KOODINIMI_ADJEKTIIVIT.length) % KOODINIMI_SUBSTANTIIVIT.length];
    return `${adj} ${noun}`;
}

function satunnainen(lista) {
    return lista[Math.floor(Math.random() * lista.length)];
}

module.exports = { hashKoodinimi, satunnainen, VAKOILURAPORTIT, TEHTAVAT, SALAISUUDET };
