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
- **viestin** (`events/messageCreate.js`) — ei lue viestin *sisältöä*, vain laskee
- **äänikanava-ajan** (`events/voiceStateUpdate.js`) — sessio muistissa liittymisestä poistumiseen
- **komennon käytön** (`events/interactionCreate.js`)

Data tallentuu `database.sqlite`:hen päiväkohtaisesti (UTC). Tähän dataan
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
