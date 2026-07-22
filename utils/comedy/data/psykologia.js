// /psykoanalyysi-komennon data. PIIRTEET saavat satunnaisen palkkiarvon
// (ks. generators/psychoGenerator.js), DIAGNOOSIT ja RISKILUOKAT ovat
// valmiita lauseita.

const PIIRTEET = [
    "Vakavuus", "Keskittyminen", "Todennäköisyys ostaa energiajuoma",
    "Impulsiivisuus", "Kahviriippuvuus", "Draaman taju", "Äänenvoimakkuus",
    "Kyky myöntää olevansa väärässä", "Taipumus selittää liikaa",
    "Herkkyys meemeille", "Yöaktiivisuus", "Kyky lopettaa pelaaminen ajoissa",
    "Taipumus unohtaa asioita kesken lauseen", "Itsevarmuus ilman perusteita",
    "Kyky valita ravintola nopeasti", "Taipumus avata jääkaappi turhaan",
    "Herkkyys ärsyyntyä latausruuduista", "Kyky pysyä hiljaa salen jonossa",
    "Taipumus lupautua liikaa", "Kyky tunnistaa oma väsymys ajoissa",
    "Reagointinopeus ilmoituksiin", "Taipumus ostaa alesta jotain tarpeetonta",
    "Kyky säilyttää rauhallisuus latauksen aikana", "Herkkyys spoilereille"
];

const DIAGNOOSIT = [
    "Lievä mutta krooninen viivyttelyoireyhtymä.",
    "Keskivaikea Discord-riippuvuus, ei vaadi vielä hoitoa.",
    "Epäilty energiajuoma-toleranssihäiriö.",
    "Akuutti \"ihan kohta\" -oireyhtymä.",
    "Lievä taipumus selittää meemejä pyytämättä.",
    "Toistuva jääkaappikäyntisyndrooma, hyvänlaatuinen.",
    "Krooninen myöhästymistaipumus, hoitamaton.",
    "Epäilty yliannostus itsevarmuutta ilman todisteita.",
    "Vahvistamaton mutta todennäköinen Comic Sans -sietokyvyttömyys.",
    "Lievä ylireagointi latausruutuihin.",
    "Toistuva \"vain viisi minuuttia lisää\" -oireyhtymä.",
    "Epäilty yliherkkyys spoilereille, tarkkailua jatketaan.",
    "Krooninen taipumus unohtaa miksi tuli huoneeseen.",
    "Lievä mutta jatkuva kahvitoleranssin nousu.",
    "Diagnosoimaton mutta ilmeinen mikin unohtelutaipumus.",
    "Keskivaikea taipumus lupautua liikaa ilman kalenterin tarkistusta.",
    "Epäilty krooninen \"testaan vaan\" -riskinottotaipumus.",
    "Lievä yöaktiivisuushäiriö, oireita erityisesti arkisin.",
    "Toistuva taipumus avata sama sovellus kolme kertaa peräkkäin.",
    "Epäilty energiajuomariippuvuus, ei vielä kliinisesti vahvistettu."
];

const RISKILUOKAT = [
    "Keskimääräistä äänekkäämpi.",
    "Ei akuuttia riskiä, mutta tarkkailua suositellaan.",
    "Korkea riski unohtaa tämän analyysin viisi minuuttia myöhemmin.",
    "Matala riski, korkea itsevarmuus.",
    "Kohonnut riski selittää itsensä liikaa.",
    "Keskitaso — tyypillinen tapaus.",
    "Korkea riski ostaa jotain tarpeetonta seuraavan tunnin sisällä.",
    "Matala riski, mutta epäilyttävän rauhallinen olemus.",
    "Kohonnut riski jäädä kiinni jääkaapilta ilman selitystä.",
    "Vakava riski myöhästyä seuraavasta tapaamisesta.",
    "Ei merkittävää riskiä, mutta komitea pitää silmällä.",
    "Korkea riski väittää olevansa \"ihan kohta valmis\".",
    "Kohonnut riski energiajuoman ylikulutukseen.",
    "Matala riski, mutta korkea meemipotentiaali.",
    "Keskimääräistä epäluotettavampi kalenterin suhteen.",
    "Korkean kortisolitason."
];

module.exports = { PIIRTEET, DIAGNOOSIT, RISKILUOKAT };
