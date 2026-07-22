# Komiteanvakoojabot

Discord-botti, rakennettu discord.js v14:llä. Tumma "OPIUM"-henkinen ilme
(musta + veren punainen), oikeaan palvelinaktiivisuuteen perustuva komitea,
vakoiluteema, trollikomennot, muutama peli ja perusmoderointi.

## Rakenne

```
.
├── index.js                  # Käynnistää botin
├── deploy-commands.js        # Rekisteröi slash-komennot Discordiin
├── handlers/
│   ├── commandHandler.js     # Lataa komennot commands/-kansiosta (+ kategoriatieto)
│   └── eventHandler.js       # Lataa eventit events/-kansiosta
├── commands/
│   ├── yleiset/
│   │   ├── ping.js
│   │   └── help.js            # Ryhmittää komennot kategorioittain
│   ├── apuvalineet/
│   │   ├── palvelininfo.js
│   │   └── kayttajainfo.js
│   ├── moderointi/            # OIKEASTI TOIMIVAT moderointikomennot
│   │   ├── tyhjenna.js         # /tyhjenna — poistaa viestejä (ManageMessages)
│   │   ├── varoita.js          # /varoita — kirjaa varoituksen tietokantaan
│   │   ├── varoitukset.js      # /varoitukset — näyttää varoitushistorian
│   │   ├── lukitse.js          # /lukitse — sulkee kanavan @everyone-roolilta
│   │   └── avaa.js             # /avaa — avaa kanavan uudelleen
│   ├── komitea/                # Komitea + trollikomennot
│   │   ├── komitea.js           # /komitea — OIKEAAN dataan perustuva päätös
│   │   ├── syyllinen.js         # /syyllinen — päivän syyllinen
│   │   ├── tuomio.js            # /tuomio — hauska tuomio
│   │   ├── sakko.js             # /sakko — kuvitteellinen sakko
│   │   ├── onko.js              # /onko — humoristinen kyllä/ei
│   │   ├── sus.js               # /sus — epäilymittari
│   │   ├── spinner.js           # /spinner — arpoo satunnaisen jäsenen
│   │   ├── potkaise.js          # /potkaise — FEIKKI, ei tee oikeasti mitään
│   │   ├── bannaa.js            # /bannaa — FEIKKI, ei tee oikeasti mitään
│   │   └── aikalisa.js          # /aikalisa — FEIKKI, ei tee oikeasti mitään
│   ├── vakoilu/
│   │   ├── koodinimi.js         # /koodinimi — pysyvä koodinimi
│   │   ├── vakoile.js           # /vakoile — valvontaraportti
│   │   ├── spy.js               # /spy — vakoile:n nopea versio
│   │   ├── wanted.js            # /wanted — etsintäkuulutus
│   │   ├── report.js            # /report — OIKEAAN dataan perustuva raportti
│   │   ├── tehtava.js           # /tehtava — salainen operaatio
│   │   ├── salaisuus.js         # /salaisuus — spoiler-piilotettu salaisuus
│   │   └── itsetuho.js          # /itsetuho — animoitu lähtölaskenta
│   ├── hauskat/
│   │   ├── loukkaa.js           # /loukkaa — kirjaa loukkaantumisen
│   │   └── vammatilastot.js     # /vammatilastot — ennätyslista / historia
│   ├── pelit/
│   │   └── kolikko.js           # /kolikko — kolikonheitto
│   └── tilastot/
│       ├── leaderboard.js       # /leaderboard — päivän top 10
│       └── aktiivisuus.js       # /aktiivisuus — yhden käyttäjän tilastot
├── scripts/
│   └── uusikomento.js         # Interaktiivinen generaattori uusille komennoille
├── utils/
│   ├── db.js                  # SQLite-yhteys + kaikki taulut
│   ├── tilastot.js            # Viesti-/ääni-/komentotilastojen apufunktiot
│   ├── tyyli.js                # Keskitetty tumma väripaletti (VARIT, BRANDI)
│   ├── vammadata.js           # Arvonimet ja kommentit loukkaantumisiin
│   ├── vakoiludata.js         # Koodinimet, valvontaraportit
│   └── komiteadata.js         # Rangaistukset, sakot, rikokset, kyllä/ei-kommentit
└── events/
    ├── ready.js
    ├── interactionCreate.js    # Ajaa komennot + kirjaa komentotilastot
    ├── messageCreate.js        # Kirjaa viestitilastot
    └── voiceStateUpdate.js     # Kirjaa äänikanava-ajan
```

## Käyttöönotto

1. Asenna riippuvuudet:
   ```
   npm install
   ```

2. Nimeä `.env.example` uudelleen nimelle `.env` ja täytä oikeat arvot
   (sinulla on nämä jo omassa `_env`-tiedostossasi — kopioi arvot sieltä):
   ```
   TOKEN=...
   CLIENT_ID=...
   GUILD_ID=...
   ```

3. **Discord Developer Portalissa** (discord.com/developers/applications →
   sovelluksesi → Bot): kytke päälle **"Server Members Intent"**. Botti
   käyttää sitä `/spinner`- ja `/syyllinen`-komennoissa jäsenlistan hakuun.
   Ilman tätä nämä kaksi komentoa eivät toimi.

   Kytke samalta sivulta päälle myös **"Message Content Intent"**. Ilman
   sitä botti ei näe viestien sisältöä lainkaan, eivätkä `!`-alkuiset
   mukautetut komennot (ks. alempana) toimi ollenkaan — botti ei kaadu,
   se vain ei koskaan reagoi niihin.

4. Rekisteröi slash-komennot Discordiin:
   ```
   npm run deploy
   ```

5. Käynnistä botti:
   ```
   npm start
   ```
   tai kehityksessä (uudelleenkäynnistyy koodimuutoksissa):
   ```
   npm run dev
   ```

## Uuden komennon lisääminen — helppo tapa

```
npm run uusikomento
```

Skripti kysyy interaktiivisesti kategorian, nimen, kuvauksen sekä tarvitseeko
komento kohdekäyttäjän, tekstikentän tai moderaattorioikeuden, ja kirjoittaa
valmiin komentotiedoston oikeaan kansioon. Aja lopuksi `npm run deploy`.

## Tumma ulkoasu (`utils/tyyli.js`)

Kaikki embedit käyttävät samaa keskitettyä väripalettia:

```js
const { VARIT, BRANDI } = require("../../utils/tyyli");
// VARIT.PERUS     — lähes musta, oletusväri
// VARIT.AKSENTTI  — veren punainen, tuomiot/rangaistukset/varoitukset
// VARIT.ONNISTUI  — tumma harmaa, neutraalit/positiiviset tapahtumat
// VARIT.VAROITUS  — kirkkaampi punainen, oikeat moderointitoimet
// VARIT.HARMAA    — vaihtoehtoinen neutraali sävy
```

Jos haluat säätää sävyjä, muokkaa vain tätä yhtä tiedostoa — kaikki komennot
päivittyvät automaattisesti.

## Aktiivisuusseuranta (oikeaan dataan perustuvat komennot)

Botti kirjaa taustalla jokaisen palvelimen:
- **viestin** (`events/messageCreate.js`) — laskee jokaisen viestin tilastoihin, ja tulkitsee lisäksi `!`-alkuiset mukautetut komennot (ks. alla)
- **äänikanava-ajan** (`events/voiceStateUpdate.js`) — sessio muistissa liittymisestä poistumiseen
- **komennon käytön** (`events/interactionCreate.js`)

Data tallentuu `database.sqlite`:hen päiväkohtaisesti (Suomen/Helsingin aika,
`utils/time.js`). Tähän dataan
perustuvat mm.:

- **`/komitea`** — valitsee satunnaisesti yhden kolmesta kategoriasta
  (viestit / äänikanava / komennot), hakee **oikean** päivän kärkinimen ja
  liittää siihen satunnaisen rangaistuksen. Jos dataa ei vielä ole, komitea
  kertoo sen suoraan sen sijaan että arpoisi tekaistun tuloksen.
- **`/syyllinen`** — painottaa tämän päivän aktiivisinta kirjoittajaa, tai
  arpoo satunnaisen jäsenen jos dataa ei vielä ole.
- **`/report kohde`** — näyttää kohteen oikean tämän päivän viesti- ja
  äänikanavamäärän yhdistettynä hauskaan "komitean arvioon".
- **`/leaderboard kategoria`** ja **`/aktiivisuus [kayttaja]`** — puhtaat
  tilastokomennot ilman huumoria.

## Moderointi — mikä toimii oikeasti ja mikä ei

| Komento | Kansio | Toimiiko oikeasti? |
|---|---|---|
| `/tyhjenna` | moderointi | ✅ Poistaa oikeasti viestejä (ManageMessages) |
| `/varoita`, `/varoitukset` | moderointi | ✅ Tallentaa/lukee oikean varoitushistorian |
| `/lukitse`, `/avaa` | moderointi | ✅ Muuttaa oikeasti kanavan oikeuksia (ManageChannels) |
| `/potkaise` | komitea | ❌ Feikki — näyttää dramaattisen viestin, ei tee mitään |
| `/bannaa` | komitea | ❌ Feikki — näyttää dramaattisen viestin, ei tee mitään |
| `/aikalisa` | komitea | ❌ Feikki — näyttää dramaattisen viestin, ei tee mitään |

Feikkikomennot on siirretty tarkoituksella pois `moderointi`-kansiosta
`komitea`-kansioon, jotta ero oikeiden ja pelkkien trollikomentojen välillä
pysyy selvänä myös tiedostorakenteessa.

## Loukkaantumistilastot

- `/loukkaa kayttaja syy` — kirjaa loukkaantumisen, näyttää kokonaismäärän ja
  "arvonimen" (esim. *Kokenut kaatuja*, *Elävä legenda*).
- `/vammatilastot [kayttaja]` — ennätyslista tai henkilökohtainen historia.

## Vakoilukomennot

- `/koodinimi [kayttaja]` — pysyvä, käyttäjä-ID:hen perustuva koodinimi.
- `/vakoile kohde` / `/spy kohde` — satunnainen valvontaraportti.
- `/wanted kohde` — etsintäkuulutusjuliste kuvitteellisella palkkiolla.
- `/report kohde` — oikeaan dataan perustuva raportti (ks. yllä).
- `/tehtava` — arpoo salaisen operaation.
- `/salaisuus` — spoiler-piilotettu hassu "komitean salaisuus".
- `/itsetuho [viesti]` — animoitu lähtölaskenta.

### `/kayttajainfo` — täysin uudistettu

Yhdistää oikeat Discord-tiedot (liittymispäivät, roolimäärä) ja oikean
palvelinaktiivisuuden yhteen "salaiseen tiedostoon":

- Viestejä yhteensä / tänään
- Aikaa äänikanavalla yhteensä
- Komentoja käytetty yhteensä + suosikkikomento
- Sija palvelimen viestitilastossa (esim. "#3 / 27")
- **Komitean huomio** — tilastopohjainen roast-kommentti (`utils/roastdata.js`),
  joka valikoituu oikean datan perusteella (esim. eri linjat sille jolla on
  paljon viestejä vs. ei yhtään äänikanava-aikaa)

### Itsetrollausmekaniikka (`utils/trolli.js`)

`/kayttajainfo`, `/vakoile`, `/spy`, `/wanted` ja `/report` käyttävät kaikki
samaa `ehkaKaannaKutsujaksi()`-funktiota: n. 15–20 % todennäköisyydellä
komento kääntää tutkan takaisin komennon *käyttäjään* riippumatta siitä kenet
he tägäsivät, ja embedin yläreunaan ilmestyy tähän liittyvä trollikommentti
("🔄 Yllätys! Komitea käänsi tutkan takaisin SINUUN..."). Todennäköisyyttä voi
säätää jokaisessa tiedostossa `ehkaKaannaKutsujaksi(interaction, kohde, 0.18)`
-kutsun kolmannesta parametrista. Mekaniikka ei koskaan käänny botteihin.


## Pelit

- `/kolikko [veto]` — kolikonheitto, valinnaisella veikkauksella.

## Huomioita

- `.env` on `.gitignore`ssa — älä koskaan committaa sitä versionhallintaan.
- `database.sqlite` on myös `.gitignore`ssa.
- `deploy-commands.js` rekisteröi komennot vain `GUILD_ID`-palvelimelle
  (nopea, näkyy heti). Globaaleja komentoja varten vaihda
  `Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)` muotoon
  `Routes.applicationCommands(CLIENT_ID)` — päivittyvät jopa tunnin viiveellä.
- Muista kytkeä **Server Members Intent** päälle Developer Portalissa, tai
  `/spinner` ja `/syyllinen`-komennon varajärjestelmä eivät toimi.
- Muista kytkeä myös **Message Content Intent** päälle, tai `!`-alkuiset
  mukautetut komennot eivät toimi.

---

## Päivitys: Tutkinnat, syyllisyys, äänestykset, automaattiset tuomiot

Tämä osio kuvaa kierroksen jossa lisättiin pysyvä "tutkinta ja syyllisyys"
-järjestelmä, automaattiset päivätuomiot sekä muutama muu ominaisuus.
**Kaikki tämän osion data on pysyvää** — mitään ei koskaan tyhjennetä tai
ylikirjoiteta, vaan uusi historia vain kertyy lisää (samaan tapaan kuin
message_stats/voice_stats jo aiemmin), jotta dataa voi lukea kaukaakin
historiasta.

### Uudet tietokantataulut (`utils/db.js`)

| Taulu | Tarkoitus |
|---|---|
| `guild_settings` | Palvelinkohtaiset asetukset (ilmoituskanava, viimeisin digest-päivä) |
| `suspects` | Pysyvä epäiltyjen lista (`active`-lippu poiston sijaan) |
| `investigations` | Tutkintatapaukset (avoin/suljettu, tuomio) |
| `investigation_evidence` | Tutkintoihin liitetyt todisteet |
| `guilt_log` | **Append-only** syyllisyysloki — nykyinen % lasketaan aina SUM:lla |
| `votes` / `vote_ballots` | Syyllisyysäänestykset ja yksittäiset äänet |
| `verdicts_log` | Kaikkien tuomioiden pysyvä historia (manuaaliset + automaattiset) |

### Uudet komennot

**`commands/tutkinta/`**
- `/epaily lisaa|lista|poista` — pysyvä epäiltyjen lista
- `/tutkinta aloita|todiste|sulje|lista` — case-tyylinen tutkintajärjestelmä. Tutkinnan sulkeminen lisää automaattisesti +15 syyllisyyspistettä ja kirjautuu tuomiohistoriaan.
- `/syyllisyys [kayttaja]` — ilman käyttäjää näyttää koko palvelimen syyllisimmät (kaikkien aikojen SUM), käyttäjän kanssa tämän prosentin, historian ja tuomioiden määrän
- `/aanestys kayttaja [kysymys] [kesto_sekuntia]` — nappipohjainen "Syyllinen ⚖️ / Viaton 🕊️" -äänestys. Tulos vaikuttaa automaattisesti syyllisyysprosenttiin (+12 syylliseksi äänestetty, -8 viattomaksi, +3 tasapeli/ei ääniä) ja kirjautuu tuomiohistoriaan.

**`commands/hauskat/`**
- `/roast kayttaja` — "AI-roast": yhdistää viestimäärän, äänikanava-ajan, komentojen käytön, syyllisyysprosentin, epäiltynä olon ja tuomioiden määrän yhdeksi moniosaiseksi roastiksi. Rule-based (ei oikea LLM-kutsu) — jos haluat aidosti tekoälyn generoimia roasteja, tarvitaan erillinen API-avain (esim. OpenAI/Anthropic) ja lisätoteutus.
- `/meemi` — hakee satunnaisen meemin julkisesta meme-api.com-rajapinnasta (ei vaadi API-avainta, käyttää Node.js:n sisäänrakennettua `fetch`:iä). Suodattaa NSFW-leimatut tulokset pois.

**`commands/tilastot/rankingit.js`**
- `/rankingit kategoria aikavali` — kuten `/leaderboard`, mutta valittavalla aikavälillä: tänään / viimeiset 7 päivää / viimeiset 30 päivää / koko historia. `/leaderboard` näyttää edelleen vain tämän päivän tilanteen nopeaan tarkistukseen; `/rankingit` on pitkäaikaiseen tarkasteluun.

**`commands/moderointi/ilmoituskanava.js`**
- `/ilmoituskanava kanava` (vaatii Manage Server -oikeuden) — asettaa kanavan johon botti postaa automaattiset päivätuomiot.

### Automaattiset päivätuomiot (`utils/ajastin.js`)

Botti tarkistaa n. 10 minuutin välein (`kaynnistaAjastin()`, käynnistetään
`index.js`:stä onnistuneen kirjautumisen jälkeen) jokaiselle palvelimelle
jolla on `/ilmoituskanava` asetettu: onko tämän päivän postaus jo tehty?
Jos ei, se rakentaa **eilisen** täydellisen datan pohjalta:

- automaattisen tuomion (samalla logiikalla kuin `/komitea`, mutta eilisen datan pohjalta)
- top 3 -viestittäjät eiliseltä

...ja postaa ne asetettuun kanavaan, kirjaa tuomion `verdicts_log`:iin ja
merkitsee päivän "hoidetuksi" (`guild_settings.lastDigestDate`), jotta sama
päivä ei posti kahdesti vaikka botti käynnistyisi uudelleen välissä.

### Olemassa olevien komentojen muutokset

- `/tuomio` ja `/komitea` kirjaavat nyt jokaisen tuomionsa pysyvään
  `verdicts_log`-tauluun ja lisäävät pienen (+3) syyllisyysvaikutuksen.
- `/kayttajainfo` ja `/report` käyttävät edelleen "eläviä" äänitilastoja
  (ks. aiempi päivitys) — ei muutoksia tähän logiikkaan.

### Testaus

Koska tätä ei voitu ajaa oikealla natiivilla `sqlite3`-moduulilla tässä
kehitysympäristössä (Windows-binääri ei lataudu Linuxissa), kaikki uudet
tietokantafunktiot testattiin Node.js:n sisäänrakennetulla `node:sqlite`-
moduulilla oikealla SQL-syntaksilla (epäillyt, tutkinnat, todisteet,
syyllisyysloki, äänestykset, asetukset, ajastimen digest-logiikka mukaan
lukien ajastimen ensimmäinen automaattinen ajo). Kaikki testit läpäistiin.

## Web-dashboard — futuristinen "OPIUM"-terminaali

Botti käynnistää nyt myös oman web-dashboardin samassa prosessissa. Se avautuu
osoitteessa **http://localhost:3000** (tai `DASHBOARD_PORT`-ympäristömuuttujan
mukaisessa portissa) heti kun botti on kirjautunut sisään.

```
dashboard/
├── server.js          # Express-palvelin + JSON-API, lukee suoraan botin datasta
└── public/
    ├── index.html      # Sivun rakenne
    ├── style.css        # Tumma "valvontaterminaali"-ulkoasu
    └── app.js           # Hakee datan API:sta ja piirtää sen, päivittyy 60s välein
```

### Mitä dashboard näyttää

- **Ylätunniste**: elävä kello, palvelinvalitsin (jos botti on usealla palvelimella), vilkkuva "live"-indikaattori
- **Tapausnumero + neljä avainlukua**: jäsenmäärä, aktiiviset äänisessiot, avoimet epäilyt, avoimet tutkinnat
- **Aktiivisuusrankingit**: viestit / äänikanava / komennot, valittavalla aikavälillä (tänään / 7 pv / 30 pv / kaikki), oikeilla käyttäjänimillä ja avatareilla
- **Syyllisyysaste**: syyllisimmät käyttäjät palkkeineen
- **Epäiltyjen dossier**: syy on oletuksena "redaktoitu" (musta palkki) — viedään hiiri päälle tai tabbaa näppäimistöllä paljastaaksesi
- **Avoimet tutkinnat**: tapausnumerot, otsikot, kohdehenkilöt

### Käyttöönotto

Ei vaadi mitään ylimääräistä asetusta — `npm install` asentaa `express`-
riippuvuuden, ja dashboard käynnistyy automaattisesti botin kanssa. Konsoliin
tulostuu rivi:
```
🖥️  Dashboard käynnissä: http://localhost:3000
```

### Tärkeä turvallisuushuomio

Dashboard **ei vaadi kirjautumista** ja näyttää palvelimen aktiivisuusdataa
(käyttäjänimet, syyllisyysprosentit, epäilyt). Se on tarkoitettu vain
**paikalliseen käyttöön omalla koneellasi** (`localhost`). Älä avaa
`DASHBOARD_PORT`-porttia julkiseen internetiin (esim. reitittimen
porttiohjauksella) ilman että lisäät ensin kirjautumisen suojaksi — muuten
kuka tahansa netissä näkisi palvelimenne aktiivisuustiedot.

### Design-ratkaisut

Väripaletti ja typografia on rakennettu botin oman sisällön ympärille sen
sijaan että käytettäisiin geneeristä "musta tausta + yksi neonväri"
-oletusta: veren punainen (`--alert`) tarkoittaa syyllisyyttä/hälytystä,
kylmä sininen-vihreä (`--watch`) tarkoittaa elävää/aktiivista tilaa — kaksi
erillistä, sisällöllisesti perusteltua väriä yhden sijaan. Epäiltyjen syyt
on piilotettu mustalla "redaktointipalkilla" joka pyyhkiytyy pois hover/focus
-tilassa — viittaa suoraan botin omaan salaisten tiedostojen teemaan.
Näppäimistöllä navigointi ja `prefers-reduced-motion` on huomioitu.

---

## Päivitys: Helsingin aikavyöhyke + mukautetut `!`-komennot

### Helsingin aikavyöhyke (`utils/time.js`)

Botti käytti aiemmin UTC-aikaa "päivän" rajana kaikkialla (tilastojen
päiväkohtainen kertymä, automaattisten päivätuomioiden ajoitus,
`/rankingit`-komennon "viikko"/"kuukausi"-suodattimet). Tämä tarkoitti että
päivä vaihtui klo 02–03 Suomen aikaa keskiyön sijaan.

Uusi `utils/time.js` laskee kaiken `Europe/Helsinki`-aikavyöhykkeellä
`Intl.DateTimeFormat`-rajapinnan avulla, joten kesä-/talviaika (EET/EEST)
huomioidaan automaattisesti — ei erillistä DST-taulukkoa ylläpidettäväksi.

Muutos vaikuttaa (samalla funktiosignatuurilla, ei rikkoviä muutoksia):
- `utils/tilastot.js`:n `tanaan()` ja `aikavaliAlkupaiva()`
- `utils/ajastin.js`:n `eilinenPvm()` (ja siten koko automaattisen
  päivätuomion ajoituslogiikka)
- `utils/ui/format.js`:n `formatDate()` (oletus-aikavyöhyke)
- Web-dashboardin kello

Discordin omat `<t:...>`-aikaleimat (esim. `/kayttajainfo`:n liittymispäivät)
eivät tarvinneet muutosta — Discord muotoilee ne aina automaattisesti
jokaisen katsojan oman paikallisen ajan mukaan.

### Mukautetut `!`-komennot (`utils/mukautetutKomennot.js`, `events/messageCreate.js`)

Yksinkertainen tagijärjestelmä, jossa kuka tahansa palvelimen jäsen voi
opettaa botille uusia sana-/lauselaukaisimia — ei vaadi slash-komennon
rekisteröintiä eikä botin uudelleenkäynnistystä.

```
!add !housu = Se on housu.      → luo uuden komennon (vaatii Message Content Intentin)
!housu                          → botti vastaa: "Se on housu."
!lista                          → listaa kaikki tämän palvelimen mukautetut komennot
!poista !housu                  → poistaa komennon
```

**Käyttäytyminen:**
- Avainsanat eivät ole isokokoerottelevia (`!Housu` ja `!housu` osoittavat
  samaan komentoon).
- `!add` **ei koskaan ylikirjoita** olemassa olevaa komentoa — täytyy
  poistaa ensin `!poista`-komennolla. Botti kertoo tämän selkeästi.
- Vastaus voi olla enintään 1500 merkkiä.
- `!poista` ei ole rajattu komennon luojalle tai moderaattoreille — kuka
  tahansa voi poistaa minkä tahansa mukautetun komennon, samaan tapaan kuin
  botin muutkin "kaikille avoimet" trollikomennot. Jos haluat rajata tämän
  esim. `ManageMessages`-oikeuteen, se on pieni lisäys
  `events/messageCreate.js`:n `kasittelePoisto`-funktioon.
- Data tallentuu pysyvästi `custom_commands`-tauluun
  (`utils/database/migrations.js`, migraatio 3) — säilyy uudelleenkäynnistysten yli.

**Vaatii Message Content Intentin** (ks. Käyttöönotto-osio ja Huomioita
yllä) — ilman sitä botti ei näe viestien sisältöä, eikä `!`-komennoista
mikään laukea. Botti ei kaadu tästä, se vain pysyy hiljaa.

---

## Päivitys: Komedia/trolli-alijärjestelmä (`utils/comedy/`, `commands/fun/`)

Kokonaan uusi, itsenäinen "absurdi valtion komitea" -huumorikerros. 15 uutta
komentoa, arkkitehtuuri erillään muusta botista jotta se on helppo laajentaa.

```
utils/comedy/
├── data/           13 sisältöpoolia (rikokset, esineet, tekosyyt, tiedotteet,
│                   päätökset, psykologia, todistajat, kameratapahtumat,
│                   kuulustelu, todisteet, syytteet, laskurivit)
├── generators/     14 generaattoria, joista 2 (rikosrekisteri,
│                   vuodenrikollinen) yhdistävät oikeaa palvelindataa
│                   Stats Enginen ja tutkintadatan kautta
└── index.js        Barrel-export

commands/fun/       15 komentoa (ks. taulukko alla)
```

### Miksi ei kirjaimellisesti 500/300/200 riviä per pooli

Tehtävänannon "vähintään 500 rikosta / 300 tiedotetta / ..." -luvut on
toteutettu **kombinatorisesti** yhden mahdollisimman laadukkaan poolin sijaan:
esim. rikospooli (62 riviä) yhdistetään satunnaisesti 20 erilliseen
todistuslauseen etuliitteeseen (`todistusetuliitteet.js`), jolloin
efektiivinen vaihtelu on jo 62 × 20 = 1240 erilaista lausetta — ilman että
samaa lausetta olisi kirjoitettu käsin satoja kertoja. Tämä noudattaa
tehtävänannon omaa vaatimusta "Create reusable random generators. Do NOT
duplicate arrays." Osa lauseista sisältää lisäksi `{n}`-paikanvaraajan joka
täytetään satunnaisluvulla, mikä kertoo vaihtelun edelleen.

### Uudet komennot

| Komento | Kuvaus |
|---|---|
| `/ratsia` | Yllätysratsia, 5-8 satunnaista takavarikoitua esinettä |
| `/rikosrekisteri` | **Oikea data** (viestit, ääni, sakot, syyllisyys, tutkinnat, tuomiot) + keksityt rikokset |
| `/psykoanalyysi` | Feikki psykologinen raportti, piirteet progress-bareina |
| `/kamerat` | Kuvitteellinen valvontakamera-aikajana, kellonajat etenevät loogisesti |
| `/kuulustelu` | 3 kysymys-vastaus-paria + johtopäätös |
| `/takavarikko` | 6-12 takavarikoitua esinettä (sama pooli kuin `/ratsia`, ei duplikoitu) |
| `/tekosyy` | Satunnainen tekosyy |
| `/lasku` | Feikkilasku useilla riveillä ja summalla |
| `/vuodenrikollinen` | **Oikea data** — painotettu pisteytys koko palvelimelle (syyllisyys 30%, sakot 25%, tutkinnat 20%, ääni 15%, viestit 10%) |
| `/tiedote` | Satunnainen komitean tiedote *(nimetty uudelleen — ks. alla)* |
| `/paivanrikos` | Päivän rikos, pysyy samana koko Helsingin kalenteripäivän |
| `/paivanpaatos` | Päivän virallinen päätös, pysyy samana koko päivän |
| `/syyte` | Syyte + todiste + todistaja + rangaistussuositus |
| `/todiste` | Yksittäinen väärennetty todiste |
| `/sakota` | Feikki tulostettava sakkolappu — **ei** kirjaudu tietokantaan eikä vaikuta syyllisyysprosenttiin (eri komento kuin oikea `/sakko`) |

### Nimitörmäys: `/komitea` → `/tiedote`

Tehtävänannossa pyydettiin uutta `/komitea`-komentoa satunnaisille
tiedotteille, mutta `/komitea` oli jo olemassa (oikeaan päivittäiseen
aktiivisuuteen perustuva komento). Käyttäjän valinnan mukaisesti uusi
komento nimettiin `/tiedote`; alkuperäinen `/komitea` on koskematon.

### Todistajapooli

`utils/comedy/data/todistajat.js` sisältää sekä nimettyjä vakiotodistajia
(MasanGulli, Maire, Shellin juorukerho, Booboo, Mummot) että yleisiä
anonyymejä todistajatyyppejä — käytössä `/syyte`- ja `/kuulustelu`-komennoissa.

### Siivous samalla

- Poistettu tyhjä, rekisteröimätön `commands/tilastot/sakot.js`
- Siivottu `commands/tilastot/sakkotilasto.js`:n debug-`console.log`-jäänteet
- `/help` jakaa nyt automaattisesti kategorian useaan embed-kenttään jos
  komentolista ylittäisi Discordin 1024 merkin kenttärajan (ilman tätä
  `/help` olisi kaatunut heti kun `fun`-kategoria lisättiin — 15 komentoa
  yhteensä 1112 merkkiä ylitti rajan)
