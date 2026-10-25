const KOODINIMI_ADJEKTIIVIT = [
    "Hiljainen", "Näkymätön", "Kylmä", "Nopea", "Varjoinen", "Terävä",
    "Vaarallinen", "Salaperäinen", "Vaitelias", "Petollinen", "Jääkylmä",
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
    "Kohde puhui videopuhelussa mykistettynä kaksi minuuttia huomaamatta sitä.",
    "Kohde tuijotti puhelinta kolme minuuttia ja kirjoitti lopulta vain \"joo\". Aivotoiminta epäselvä.",
    "Kohde nähtiin sanomassa \"pitäisi kohta lähteä\" ja jäävän vielä kaksi tuntia.",
    "Kohde avasi jääkaapin, otti jotain, laittoi sen takaisin ja avasi uudelleen. Kuvio toistui.",
    "Kohde keskusteli ääneen pelin hahmolle ja kuulosti pettyneeltä vastaukseen.",
    "Kohteen nähtiin harjoittelevan lausetta \"en tiennyt\" peilin edessä. Tekniikka kehittyy.",
    "Kohde käytti yhden lauseen aikana sanaa \"periaatteessa\" seitsemän kertaa. Periaatteessa ei mitään sanottavaa.",
    "Kohde säätti kuulokkeiden ääniasetuksia kymmenen minuuttia. Ääni ei muuttunut.",
    "Kohde tilasi ruokaa sanoen \"en ole nälkäinen\" ja söi molemmat annokset.",
    "Kohteen yöunet ovat kuulemma \"ihan ok\". Silmäpussit ehdottavat toisin.",
    "Kohde sanoi menevänsä \"vain hetkeksi\" koneelle ja poistui paikalta kuutta tuntia myöhemmin.",
    "Kohde kirjoitti ensin pitkän viestin, poisti sen ja lähetti sanan \"ok\". Salaisuus säilyi.",
    "Kohde tunnisti äänestä kaikki ystävänsä paitsi itsensä nauhalta. Identiteettikriisi?",
    "Kohde on havaittu käyttävän kolmea eri salasanaa ja unohtavan kaikki.",
    "Kohde seisoi huoneen keskellä ja yritti muistaa, mitä tuli hakemaan. Ei muistanut.",
    "Kohde sanoi \"tää on viimeinen peli\" ja pelasi sen jälkeen vielä kuusi.",
    "Kohde kertoi jotain mielenkiintoista ja huomasi sitten, ettei kukaan kuunnellut. Hän jatkoi silti.",
    "Kohde jakoi ruudun ja unohti, että taustalla oli auki hieman liikaa. Tapaus selvitetään.",
    "Kohde kävi ostamassa yhden asian kaupasta ja tuli kotiin viiden asian kanssa ilman sitä yhtä.",
    "Kohde lupasi lähettää dokumentin \"tänään\". Tänään oli kaksi viikkoa sitten.",
    "Kohde ei vastannut viestiin kahteen päivään mutta oli äänikanavalla 11 tuntia. Prioriteetit selvät.",
    "Kohde havaittiin pyytämässä anteeksi esineeltä, johon kompastui. Esine ei vastannut.",
    "Kohde puhui \"vain hetken\", ja hetki kesti 40 minuuttia. Hetki on tulossa takaisin.",
    "Kohde sanoi \"katotaan\" ja tarkoitti ei. Tulkinnat jatkuvat.",
    "Kohde aloitti kovan treenaamisen ja lopetti sen viikossa. Kuntosalikortti arvostelee.",
    "Kohteen musiikkimaku vaihtui kesken kappaleen. Komitea ei ymmärrä, mutta kunnioittaa.",
    "Kohde pyöritti tuolilla kolme kierrosta ja ilmoitti sen olevan \"ajatteluharjoitus\".",
    "Kohde otti kuvan ruoastaan ja söi sen sitten kylmänä. Julkaisua ei seurannut.",
    "Kohde kirjoitti \"hyvää yötä\", mutta oli kuudes kerta tänään. Ei uskottavaa.",
    "Kohde pysähtyi kesken käytävän tarkistamaan taskuja, jotka olivat tyhjät. Kolmannen kerran.",
    "Kohde on harjoitellut vakuuttavaa nyökkäystä. Tulokset ovat valitettavan vakuuttavia.",
];

const TEHTAVAT = [
    { nimi: "Operaatio Kadonnut Etäohjain", vaikeus: "Helppo", palkkio: "Kunniamerkki + kahvi" },
    { nimi: "Operaatio Hiljainen Keittiö", vaikeus: "Keskitaso", palkkio: "Pääsy salaiseen välipala-arkistoon" },
    { nimi: "Operaatio Näkymätön Askel", vaikeus: "Vaikea", palkkio: "Ylennys Vanhemmaksi Vakoojaksi" },
    { nimi: "Operaatio Kaksoisagentti Kissassa", vaikeus: "Erittäin vaikea", palkkio: "Oma koodinimi virallistetaan" },
    { nimi: "Operaatio Punainen Silli", vaikeus: "Keskitaso", palkkio: "Vapautus seuraavasta vuorosta" },
    { nimi: "Operaatio Hiljainen Ovi", vaikeus: "Helppo", palkkio: "Pieni kunniamaininta" },
    { nimi: "Operaatio Viimeinen Keksi", vaikeus: "Vaarallinen", palkkio: "Ikuinen kunnia komiteassa" },
    { nimi: "Operaatio Pimeä Jääkaappi", vaikeus: "Vaikea", palkkio: "Valo, kun se on taas päällä" },
    { nimi: "Operaatio Viimeinen Pizzapala", vaikeus: "Vaarallinen", palkkio: "Kaikkien kunnioitus, ainakin hetkeksi" },
    { nimi: "Operaatio Hiljainen Nyökkäys", vaikeus: "Helppo", palkkio: "Ei mitään, mutta tyylikkäästi" },
    { nimi: "Operaatio Väärä Kanava", vaikeus: "Keskitaso", palkkio: "Anteeksipyyntö, jonka saat kirjoittaa itse" },
    { nimi: "Operaatio Kahvinkeittimen Kosto", vaikeus: "Erittäin vaikea", palkkio: "Kahvi. Ehkä." },
    { nimi: "Operaatio Epäilyttävä Hiljaisuus", vaikeus: "Keskitaso", palkkio: "Kunniamaininta pöytäkirjan alalaidassa" },
    { nimi: "Operaatio Haamu Kanavalla", vaikeus: "Vaikea", palkkio: "Pääsy salaiseen kuuntelijoiden kerhoon" },
    { nimi: "Operaatio Viiden Minuutin Torkut", vaikeus: "Helppo", palkkio: "Kolme tuntia lisää unta ja pieni syyllisyys" },
    { nimi: "Operaatio Selvitä Kuka Söi", vaikeus: "Vaarallinen", palkkio: "Totuus. Kukaan ei pyytänyt sitä." },
    { nimi: "Operaatio Mykistysnappi", vaikeus: "Keskitaso", palkkio: "Paikka komitean kunniaseinällä (seinää ei ole)" },
    { nimi: "Operaatio Tuplakierros", vaikeus: "Erittäin vaikea", palkkio: "Ylennys vakoojaksi, joka ei saa palkkaa" },
    { nimi: "Operaatio Sinisilmäinen Selittäjä", vaikeus: "Helppo", palkkio: "Uskottavuus (ei takuuta)" },
];

const SALAISUUDET = [
    "Komitea tietää enemmän kuin antaa ymmärtää.",
    "Kolmas kerros ei ole olemassa virallisissa asiakirjoissa.",
    "Kahvinkeittimellä on oma agenttinumero.",
    "Joku tässä palvelimessa on kaksoisagentti. Ehkä.",
    "Alkuperäinen suunnitelma hylättiin liian kunnianhimoisena.",
    "Kaikki tähänastiset raportit on kirjoitettu salakielellä, jota kukaan ei enää muista.",
    "Todellinen komitea kokoontuu vasta keskiyön jälkeen.",
    "Yksi näistä komennoista on itsessään peiteoperaatio.",
    "Komitean salainen kokoushuone on tosiasiassa komeron peittämä jääkaappi.",
    "Jokaisen salaisen raportin alareunassa on piilotettu kahvitahra, joka paljastaa kirjoittajan.",
    "Komitealla on yksi jäsen, jota kukaan ei ole nähnyt. Hän lähettää vain kommentteja.",
    "Joka kerta kun joku sanoo \"kohta\", komitea saa pisteen. Pisteet ovat salaisia, palkinto myös.",
    "Komitean varsinainen tarkoitus on tilata pizzaa ja kutsua sitä operaatioksi.",
    "Pöytäkirjan viimeinen sivu on aina tyhjä. Se on sivu, jolle kirjoitetaan se, mitä kukaan ei uskalla.",
    "Komitean ensimmäinen päätös oli perustaa toinen komitea. Se toinen komitea on tämä.",
    "Yksi komitean sääntö kuuluu: älä koskaan kysy kuka kirjoitti säännöt.",
    "Komitea kuuntelee kaikkea, mutta muistaa vain sen, mikä on kiusallista.",
    "Kolmas hylly vasemmalta on portaali. Kukaan ei ole palannut, mutta kahvi kyllä.",
    "Virallinen väite \"komitea ei seuraa sinua\" on tarkistamaton ja tahallisen epätarkka.",
    "Komitean budjetti on yksi kahvipaketti ja luottamus tulevaisuuteen.",
    "Joka kerta kun komitea nauraa, joku muu pyytää anteeksi. Tilastollisesti.",
    "Komitealla on varasuunnitelma. Varasuunnitelma on \"kuka tämän päätti\".",
    "Yöllä kello 03.07 komitean kaikki laitteet heräävät ja huokaisevat yhtä aikaa.",
    "Kansio \"Tärkeät\" sisältää kolme kuvakaappausta ja yhden huonon päätöksen.",
    "Todellinen syy kokouksille on kokousten jälkeiset kahvit.",
    "Komitea ei ole koskaan hävinnyt väittelyä, koska se ei ole koskaan aloittanut yhtäkään ajoissa.",
    "Komitean jäsenet tunnistavat toisensa siitä, että kukaan ei muista kuka on kuka.",
    "Pöytäkirjan \"liite X\" on olemassa vain, jotta voidaan sanoa \"katso liite X\".",
    "Salainen koodisana on \"perunalaatikko\". Sitä ei käytetä mihinkään, mutta se rauhoittaa.",
    "Komitean arkiston ainoa lukittu huone sisältää kaikki lukitsemattomat huoneet.",
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

module.exports = { hashKoodinimi, VAKOILURAPORTIT, TEHTAVAT, SALAISUUDET };
