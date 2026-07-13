# Komiteanvakoojabot

Discord-botti, rakennettu discord.js v14:llä.

## Rakenne

```
.
├── index.js                 # Käynnistää botin
├── deploy-commands.js       # Rekisteröi slash-komennot Discordiin
├── handlers/
│   ├── commandHandler.js    # Lataa kaikki komennot commands/-kansiosta
│   └── eventHandler.js      # Lataa kaikki eventit events/-kansiosta
├── commands/
│   ├── yleiset/
│   │   ├── ping.js
│   │   └── help.js
│   ├── apuvalineet/
│   │   ├── palvelininfo.js
│   │   └── kayttajainfo.js
│   ├── moderointi/
│   │   ├── potkaise.js
│   │   ├── bannaa.js
│   │   └── aikalisa.js
│   ├── vakoilu/
│   │   ├── koodinimi.js
│   │   ├── vakoile.js
│   │   ├── tehtava.js
│   │   ├── salaisuus.js
│   │   └── itsetuho.js
│   └── hauskat/
│       ├── loukkaa.js
│       └── vammatilastot.js
├── scripts/
│   └── uusikomento.js    # Interaktiivinen generaattori uusille komennoille
├── utils/
│   ├── db.js              # SQLite-yhteys ja apufunktiot (run/get/all)
│   ├── vammadata.js       # Arvonimet ja hauskat kommentit loukkaantumisiin
│   └── vakoiludata.js     # Koodinimet, raportit, tehtävät, salaisuudet
└── events/
    ├── ready.js
    └── interactionCreate.js
```

## Uuden komennon lisääminen — helppo tapa

Suorita:

```
npm run uusikomento
```

Skripti kysyy interaktiivisesti:
1. **Kategorian** (kansion, esim. `yleiset` tai uusi kuten `talous`) — luodaan automaattisesti jos ei ole olemassa
2. **Komennon nimen** (esim. `tervehdi`)
3. **Kuvauksen** (näkyy Discordissa komennon vieressä)
4. Tarvitseeko komento **kohdekäyttäjän** (`@joku`)
5. Tarvitseeko komento **tekstikentän** (esim. syy tai viesti)
6. Rajataanko komento **vain moderaattoreille**

Tämän jälkeen valmis, syntaktisesti toimiva komentotiedosto ilmestyy oikeaan
kansioon valmiilla `SlashCommandBuilder`-rungolla ja `execute()`-funktiolla —
sinun tarvitsee vain täydentää itse logiikka. Muista ajaa lopuksi
`npm run deploy`, jotta Discord näkee uuden komennon.

## Muut hyödylliset komennot

```
npm start          # käynnistää botin
npm run dev         # käynnistää botin nodemonilla (uudelleenkäynnistyy koodimuutoksissa)
npm run deploy       # rekisteröi slash-komennot Discordiin
npm run uusikomento  # generoi uuden komentotiedoston
```

## Moderointikomennot

- `/potkaise kayttaja [syy]` — vaatii Kick Members -oikeuden
- `/bannaa kayttaja [syy] [poista_viestit_paivaa]` — vaatii Ban Members -oikeuden
- `/aikalisa kayttaja minuutit [syy]` — vaatii Moderate Members -oikeuden

Discord piilottaa nämä komennot automaattisesti käyttäjiltä, joilla ei ole
vastaavaa oikeutta (`setDefaultMemberPermissions`), mutta palvelimen
ylläpitäjä voi silti säätää näkyvyyttä tarkemmin palvelimen asetuksista
(Integrations → botin nimi).

## Loukkaantumistilastot (hauska ominaisuus)

- `/loukkaa kayttaja syy` — kirjaa loukkaantumisen tietokantaan ja näyttää
  hauskan raportin, käyttäjän kokonaismäärän sekä "arvonimen" (esim.
  *Kokenut kaatuja*, *Elävä legenda*).
- `/vammatilastot [kayttaja]` — ilman käyttäjää näyttää koko palvelimen
  ennätyslistan (top 10), käyttäjän kanssa näyttää tämän henkilökohtaiset
  tilastot ja 5 viimeisintä tapausta.

Data tallentuu `database.sqlite`-tiedostoon projektin juureen (SQLite,
luodaan automaattisesti ensimmäisellä käynnistyksellä). Tiedosto on jo
`.gitignore`ssa.

## Vakoilukomennot (teemaan sopivat)

- `/koodinimi [kayttaja]` — paljastaa käyttäjän pysyvän, käyttäjän ID:hen
  perustuvan vakoojan koodinimen (esim. "Hiljainen Kotka"). Sama käyttäjä
  saa aina saman koodinimen.
- `/vakoile kohde` — "asettaa valvontaan" tägätyn käyttäjän ja tuottaa
  satunnaisen absurdin valvontaraportin.
- `/tehtava` — arpoo kutsujalle salaisen komiteatehtävän vaikeustasoineen
  ja palkkioineen.
- `/salaisuus` — paljastaa satunnaisen (spoiler-tagilla piilotetun) hassun
  "komitean salaisuuden".
- `/itsetuho [viesti]` — dramaattinen animoitu lähtölaskenta viestin
  editoinnilla, päättyy harmittomaan "räjähdykseen".

Kaikki tekstisisällöt (koodinimet, raportit, tehtävät, salaisuudet) löytyvät
listoina tiedostosta `utils/vakoiludata.js` — niitä on helppo laajentaa
lisäämällä uusia rivejä kyseisiin taulukkoihin.

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

3. Rekisteröi slash-komennot Discordiin:
   ```
   node deploy-commands.js
   ```

4. Käynnistä botti:
   ```
   node index.js
   ```

   Kehityksessä kannattaa käyttää nodemonia (löytyy jo devDependencies-listalta):
   ```
   npx nodemon index.js
   ```

## Uuden komennon lisääminen

Luo uusi `.js`-tiedosto johonkin `commands/`-alikansioista (tai luo uusi
alikansio) tähän malliin:

```js
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("komennon_nimi")
        .setDescription("Kuvaus."),

    async execute(interaction, client) {
        await interaction.reply("Vastaus!");
    }
};
```

Aja tämän jälkeen uudelleen `node deploy-commands.js`, jotta Discord näkee
uuden komennon.

## Uuden eventin lisääminen

Luo uusi `.js`-tiedosto `events/`-kansioon:

```js
const { Events } = require("discord.js");

module.exports = {
    name: Events.GuildMemberAdd, // tms. Events-listalta
    once: false, // true jos eventin pitää laueta vain kerran
    async execute(member, client) {
        // ...
    }
};
```

## Huomioita

- `.env` on `.gitignore`ssa — älä koskaan committaa sitä versionhallintaan.
- `deploy-commands.js` rekisteröi komennot vain `GUILD_ID`-palvelimelle
  (nopea, näkyy heti). Jos haluat komennot kaikille palvelimille joilla
  botti on, vaihda `Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)`
  muotoon `Routes.applicationCommands(CLIENT_ID)` — globaalit komennot
  päivittyvät kuitenkin jopa tunnin viiveellä.
- `sqlite3` on jo riippuvuuksissa, joten voit lisätä pysyvän tietokannan
  esim. asetuksille tai pisteytykselle myöhemmin.
