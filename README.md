# Komiteanvakoojabot

Discord-botti, rakennettu discord.js v14:llä. Tumma "OPIUM"-henkinen ilme
(musta + veren punainen), oikeaan palvelinaktiivisuuteen perustuva komitea,
vakoiluteema, trollikomennot, muutama peli ja perusmoderointi.

**Tekninen perusta:** Node.js ≥ 18, tiedot tallentuvat Cloudflare D1 -tietokantaan
`d1-worker/`-rajapinnan kautta (`utils/db.js`), hosting esim. Enzonicissa.

## Komennot

Komennot ovat pääosin lyhyitä ja itsenäisiä (`/sus`, ei `/komitea sus`). Poikkeuksia ovat
ryhmäkomennot `/vakoilu`, `/tutkimus` ja `/oikeus` sekä `/tutkinta` ja `/epaily`, joilla on
alikomennot (ks. alla).

| Ryhmä | Komennot |
|---|---|
| **Komitea & epäilyt** | `/komitea` (päivän päätös oikeasta datasta), `/tuomio`, `/sus`, `/onko`, `/syyllinen`, `/spinner`, `/sakko` (oikea, kirjautuu), `/sakota` (feikki), `/potkaise`, `/bannaa`, `/aikalisa` (kolme feikkimoderointia — eivät tee mitään oikeasti) |
| **Vakoilu** | `/vakoilu` *(alikomennot, ks. alla)*, `/vakoile`, `/report` *(oikea data)*, `/wanted`, `/koodinimi`, `/tehtava`, `/salaisuus`, `/itsetuho` |
| **Tutkimus** | `/tutkimus` *(alikomennot, ks. alla)*, `/ratsia`, `/takavarikko`, `/kuulustelu`, `/rikosrekisteri` *(oikea data)*, `/kamerat`, `/psykoanalyysi` |
| **Oikeus** | `/oikeus` *(alikomennot, ks. alla)*, `/syyte`, `/todiste`, `/lasku` |
| **Päivä** | `/paiva` (päivän rikos + päätös, sama koko päivän), `/tekosyy`, `/tiedote`, `/vuodenrikollinen` *(oikea data)* |
| **Tilastot** | `/tilastot` (kolmen kärki: viestit, ääni, komennot, sakot), `/rankingit` (viestit, ääni, komennot, sakot), `/aktiivisuus`, `/syyllisyys`, `/vammatilastot`, `/kayttajainfo`, `/roast` |
| **Tutkinnat** | `/tutkinta`, `/epaily`, `/aanestys` |
| **Hauskat & pelit** | `/loukkaa`, `/meemi`, `/kolikko` |
| **Moderointi** | `/tyhjenna`, `/varoita`, `/varoitukset`, `/lukitse`, `/avaa`, `/ilmoituskanava`, `/debugvoice` *(vain ylläpitäjille)* |
| **Musiikki** | `/soita`, `/jono`, `/nyt`, `/ohita`, `/tauko`, `/toisto`, `/sekoita`, `/lopeta` *(ks. kohta Musiikki)* |
| **Yleiset** | `/help`, `/ping`, `/palvelininfo` |

`/vakoilu`, `/tutkimus` ja `/oikeus` ovat ryhmäkomentoja, joilla on alikomennot:

- `/vakoilu` — `tarkkaile`, `nopea`, `raportti`, `etsintakuulutus`, `tehtava`, `koodinimi`, `salaisuus`, `itsetuho`
- `/tutkimus` — `ratsia`, `takavarikko`, `kuulustelu`, `rikosrekisteri`, `kamerat`, `psykoanalyysi`
- `/oikeus` — `syyte`, `todiste`, `lasku`

Valittu alikomento ajaa aina täsmälleen kyseisen toiminnon. Toiminnot ovat yhä myös
suoraan omina komentoinaan (esim. `/ratsia`, `/wanted`). Ryhmä lukee niiden valinnat
suoraan jäsenen omasta määrityksestä, joten koodia ei ole kahdessa paikassa.

Lisäksi viestikäsittelijä tukee `!add !avainsana = vastaus`, `!lista`, `!poista !avainsana`
ja tallennettuja `!avainsana`-vastauksia (vaatii Message Content Intentin).

## Musiikki

Botti soittaa musiikkia äänikanavalla. Komennot: `/soita <haku tai linkki>`, `/jono`, `/nyt`,
`/ohita`, `/tauko` (pysäytä/jatka), `/toisto` (pois / kappale / jono), `/sekoita`, `/lopeta`.
`/soita` hakee oletuksena YouTubesta ja kokeilee SoundCloudia, jos YouTube-haku epäonnistuu tai ei löydä
kelvollista tulosta. Jos YouTube-äänen suoratoiston käynnistys epäonnistuu, sama kappale etsitään
SoundCloudista ilman ylimääräistä jonopaikkaa. Myös kesken toiston havaittu YouTube-virhe vaihtaa
SoundCloudiin. Käyttäjä voi valita tuloslistasta enintään viidestä
vaihtoehdosta; haku suosii pyytämätöntä remix-, cover- tai live-versiota vähemmän. Lähteen voi yhä
valita komennon valinnaisesta `lahde`-asetuksesta, tai oletuksen voi vaihtaa `MUSIIKKI_HAKULAHDE`-asetuksella.

**Mistä soitetaan**

| Lähde | Tuki |
|---|---|
| YouTube, SoundCloud, Bandcamp, Mixcloud, Vimeo | hakusanat, yksittäiset linkit ja soittolistat/albumit (`yt-dlp`) |
| **Spotify** | kappale-, albumi- ja soittolistalinkit. **Spotifyn ääntä ei voi soittaa** (se on suojattu). Linkistä luetaan vain kappaleiden nimet, ja ääni haetaan nimellä YouTubesta tai SoundCloudista, joten joskus löytyy väärä versio |

Linkit hyväksytään vain sallituilta sivustoilta (lisää omia: `MUSIIKKI_SALLITUT_SIVUT`). Se estää
käyttäjiä ohjaamasta palvelinta hakemaan mielivaltaisia osoitteita. Suorat lähetykset ja yli
`MUSIIKKI_MAX_KESTO_MIN` minuutin kappaleet ohitetaan.

**Käyttöönotto** (musiikki on valinnainen: botti toimii ilman näitä, ja `/soita` kertoo mitä puuttuu)

1. Node.js **22.12 tai uudempi** (`@discordjs/voice`-kirjaston vaatimus).
2. Asenna kirjastot ja **päivitä samalla `package-lock.json`** (tee paikallisesti ja committaa
   lukkotiedosto, jos hostisi ajaa `npm ci`):
   `npm install @discordjs/voice @snazzah/davey opusscript ffmpeg-static`
   (`@snazzah/davey` on pakollinen: Discordin äänikanavat ovat päästä päähän salattuja.)
3. **yt-dlp**-ohjelma palvelimelle. Jos et voi asentaa ohjelmia, aseta `YTDLP_AUTOASENNUS=1`, jolloin
   virallinen binääri ladataan kansioon `bin/` ensimmäisellä käytöllä. Muuten `YTDLP_PATH`.
4. `ffmpeg`: `ffmpeg-static` riittää, tai järjestelmän oma `ffmpeg`.
5. Tarkista: `npm run musiikki:tarkista`. Se listaa mitä puuttuu.
6. Botilla pitää olla äänikanavalla oikeudet *Yhdistä* ja *Puhu*. Hostin on sallittava lähtevä UDP-liikenne
   (osa ilmaishosteista estää sen, jolloin ääniyhteys ei muodostu).

**Ylläpito ja rajoitukset**

- **Päivitä yt-dlp säännöllisesti** (`npm run musiikki:tarkista -- --paivita`). YouTube muuttuu usein, ja
  vanha versio lakkaa toimimasta.
- YouTube voi estää haut palvelinten IP-osoitteilta ("kirjaudu sisään"). Silloin auttaa
  asianmukaisesti hallittu evästetiedosto (`YTDLP_COOKIES`); haku ja äänen lataus kokeilevat
  automaattisesti myös SoundCloudia. Jos suoran YouTube-linkin metatiedot estyvät, SoundCloud-haku
  käyttää videon tunnistetta. Yksityisiä tai poistettuja suoria videoita ei korvata toisella kappaleella.
- Hakulokit käyttävät tapahtumatunnistetta ja kirjaavat lähteen, vaiheen, keston sekä tulosmäärän.
  Hakusanoja, linkkejä, käyttäjä- tai palvelintunnisteita eikä yt-dlp:n raakavirheitä ei kirjoiteta niihin.
- Videopalvelut voivat kieltää äänen irrottamisen käyttöehdoissaan. Käyttö on ylläpitäjän vastuulla.
- Jonot ovat muistissa: uudelleenkäynnistys tyhjentää ne. Botti poistuu kanavalta, kun jono on ollut
  tyhjä (`MUSIIKKI_POISTU_JONON_JALKEEN_S`) tai se jää kanavalle yksin (`MUSIIKKI_POISTU_YKSIN_S`).
- Äänitilastot eivät laske botteja, joten musiikkibotti ei näy äänirankingeissa.
- Ohjauskomennot (`/ohita`, `/tauko`, `/lopeta`, `/toisto`, `/sekoita`) vaativat, että olet samalla
  äänikanavalla kuin botti. Roolirajausta ei ole.

Kaikki asetukset ovat `.env.example`-tiedostossa. Logiikkatesti: `npm run musiikkitesti` (feikkiääni,
ei verkkoa). Se ei testaa oikeaa äänen toistoa Discordissa.

## Käyttöönotto

1. Asenna riippuvuudet: `npm install`
2. Aseta ympäristömuuttujat (ks. `.env.example`; hostingissa suoraan hostin asetuksiin):

   | Muuttuja | Pakollinen | Käyttö |
   |---|---|---|
   | `TOKEN` | kyllä | Discord-botin token |
   | `CLIENT_ID` | kyllä (deploy) | Discord-sovelluksen ID |
   | `GUILD_ID` | kyllä (deploy) | Palvelin, jolle komennot rekisteröidään |
   | `D1_API_URL` | kyllä | Cloudflare Worker -rajapinnan osoite |
   | `D1_API_KEY` | kyllä | Workerin `API_KEY`-salaisuus (Bearer) |
   | `DASHBOARD_PORT` / `PORT` | ei | Dashboardin portti (oletus 10000) |
   | `DASHBOARD_TOKEN` | ei | Jos asetettu, dashboard vaatii tämän (`/?token=...`) |

   `BOT_SECRET` ei ole enää käytössä (ks. alla).

3. **Discord Developer Portal → Bot:** kytke päälle **Server Members Intent**
   (`/spinner`, `/syyllinen`) ja **Message Content Intent** (`!`-komennot).
4. Rekisteröi komennot: `npm run deploy`
5. Käynnistä: `npm start` (kehityksessä `npm run dev`)

### Komentojen rekisteröinti ja vanhojen komentojen poisto

`deploy-commands.js` rekisteröi komennot **vain palvelinkohtaisesti** (`GUILD_ID`) ja
käyttää Discordin bulk-korvausta, joten kaikki palvelimen aiemmat komennot, joita ei
enää ole koodissa, katoavat. Projekti ei käytä globaaleja komentoja; jos sellaisia
silti on jäänyt Discordiin (ne näkyvät palvelinkohtaisten rinnalla tuplina), skripti
kertoo niistä, ja ne poistetaan erikseen:

```
npm run deploy                          # rekisteröi (korvaa palvelimen komentolistan)
npm run deploy -- --puhdista-globaalit  # poistaa lisäksi globaalit komennot
npm run tarkista                        # kuiva-ajo: listaa komennot, ei kosketa Discordiin
```

Deploy keskeytyy, jos jokin komentotiedosto ei lataudu tai komennon nimi törmää
(muuten komento katoaisi Discordista huomaamatta). `--pakota` ohittaa tämän.

### Uusi komento

`npm run uusikomento` kysyy kategorian, nimen ja asetukset ja luo komentotiedoston
kansioon `commands/<kategoria>/`. Aja sen jälkeen `npm run deploy`. Pidä nimet
lyhyinä ja itsenäisinä.

### Itsetarkistus

`npm test` tarkistaa (ilman Discordia ja tietokantaa), että kaikki komennot latautuvat,
nimet eivät törmää, Discordin rajat täyttyvät, ryhmäkomentojen alikomennot osoittavat oikeisiin toimintoihin ja
sisältöpoolit ovat siistejä (ei duplikaatteja, ei kirjaimellisia `\n`-jäänteitä, ei
tuntemattomia `{paikanvaraajia}`).

`npm run ajotesti` ajaa lisäksi jokaisen komennon `execute`-funktion väärennetyllä
interaktiolla ja tietokannalla (tyhjällä ja täytetyllä datalla, useita kertoja) ja
raportoi ajonaikaiset virheet sekä Discordin sääntörikkeet: kaksoisvastaukset, tyhjät
viestit ja embedit, viesti- ja embed-pituusrajat. Oikeaan D1:een tai Discordiin ei
kosketa. Se ei korvaa kokeilua livenä (oikeudet, ajastukset, ulkoiset rajapinnat).

## Rakenne

```
.
├── index.js                  # Käynnistää botin, dashboardin ja ajastimen
├── deploy-commands.js        # Slash-komentojen rekisteröinti (+ globaalien siivous)
├── handlers/
│   ├── commandLoader.js      # Lataa commands/-kansion (jaettu botin ja deployn kesken)
│   ├── commandHandler.js
│   └── eventHandler.js
├── commands/                 # yksi tiedosto = yksi komento, kansio = /help-kategoria
├── events/                   # ready, interactionCreate, messageCreate, voiceStateUpdate, musiikkiAaniTapahtuma
├── utils/
│   ├── db.js                 # Cloudflare D1 -asiakas (Worker-rajapinta)
│   ├── tilastot.js           # viesti-/ääni-/komentotilastot
│   ├── tutkintadata.js       # tutkinnat, syyllisyys, sakot, tuomiot, asetukset
│   ├── time.js               # kaikki päivälaskenta Europe/Helsinki -ajassa
│   ├── satunnainen.js        # jaettu satunnaisuus + toiston esto
│   ├── ajastin.js            # päivittäinen tiedote
│   ├── musiikki/             # soitin, jono, lähteet (yt-dlp, Spotify), viestit
│   ├── comedy/               # huumorigeneraattorit ja sisältöpoolit (data/)
│   │   └── data/viestit.js   # otsikot, alatunnisteet, virheviestit, "ei dataa" -vastaukset
│   ├── statsEngine/, roastEngine/, ui/   # ks. kunkin README
│   └── database/migrations.js  # D1-skeema viitteenä (ei muutettu)
├── d1-worker/                # Cloudflare Worker (D1-rajapinta)
├── dashboard/                # Web-dashboard
└── scripts/                  # uusikomento.js, tarkista.js, ajotesti.js, musiikkitesti.js, musiikki-tarkista.js
```

## Huumorisisältö ja toiston esto

Kaikki satunnaisvalinnat kulkevat `utils/satunnainen.js`:n kautta. Jokainen lista muistaa
viimeksi arvotut kohtansa (kolmasosa listan pituudesta, max 10), joten sama vitsi ei
toistu heti; arvonta on silti tasainen kaikkien muiden vaihtoehtojen kesken. Lennossa
koottavat listat (esim. palvelimen jäsenet `/spinner`issä) arvotaan puhtaasti tasaisesti.

Uutta sisältöä lisätään suoraan taulukoihin tiedostoissa `utils/comedy/data/`,
`utils/komiteadata.js`, `utils/vakoiludata.js` ja `utils/roastdata.js`. Älä muuta
`utils/vakoiludata.js`:n `KOODINIMI_*`-listoja: koodinimet lasketaan käyttäjä-ID:stä ja
listojen pituuden muuttaminen vaihtaisi kaikkien koodinimet.

## Aikavyöhyke

"Päivä" tarkoittaa aina Suomen (Europe/Helsinki) kalenteripäivää, kesä-/talviaika
huomioiden (`utils/time.js`). Tämä koskee päivätilastoja, `/paiva`-komentoa,
komentotilastojen päivärajoja ja päivittäistä tiedotetta. Äänikanava-aika kirjataan
sille päivälle, jona käyttäjä poistuu kanavalta.

## Päivittäinen tiedote

Ajastin tarkistaa 10 minuutin välein jokaisen palvelimen, jolle on asetettu
`/ilmoituskanava`, onko tämän päivän tiedote jo lähetetty. Jos ei, se postaa eilisen
päätöksen ja viestikärjen, kirjaa tuomion `verdicts_log`-tauluun (vasta onnistuneen
lähetyksen jälkeen) ja merkitsee päivän hoidetuksi.

## Moderointi — mikä toimii oikeasti

| Komento | Toimiiko oikeasti? | Oikeus (oletus) |
|---|---|---|
| `/tyhjenna` | ✅ poistaa viestejä | ManageMessages |
| `/varoita`, `/varoitukset` | ✅ oikea varoitushistoria | ModerateMembers |
| `/lukitse`, `/avaa` | ✅ muuttaa kanavan oikeuksia | ManageChannels |
| `/ilmoituskanava` | ✅ | ManageGuild |
| `/debugvoice` | ✅ näyttää vain **tämän palvelimen** äänisessiot, vain sinulle (ephemeral) | ManageGuild (tarkistetaan myös koodissa) |
| `/potkaise`, `/bannaa`, `/aikalisa` | ❌ feikki — dramaattinen viesti, ei tee mitään | kaikki |

`/tutkinta`, `/epaily`, `/aanestys`, `/sakko`, `/tuomio` ja `!`-komennot ovat tarkoituksella
kaikille avoimia (osa leikkiä). Rajaus onnistuu lisäämällä komentoon
`.setDefaultMemberPermissions(...)`.

Botti ei voi pingata `@everyone`/`@here`/rooleja (`allowedMentions: { parse: ["users"] }`),
joten vapaatekstikentät tai `!add` eivät kelpaa massapingaukseen.

## Dashboard

Botti käynnistää samassa prosessissa web-dashboardin (`dashboard/`). Sen rajapinta
näyttää palvelimen aktiivisuusdataa (käyttäjänimet, syyllisyysprosentit, epäillyt).
**Aseta `DASHBOARD_TOKEN`, jos portti on näkyvissä internetiin** — ilman sitä kuka
tahansa osoitteen tuntava näkee datan. Avaa token-suojattu dashboard kerran
osoitteella `/?token=...` (token tallentuu HttpOnly-evästeeseen).

## Salaisuudet

Lähdekoodissa ei ole tokeneita eikä API-avaimia; kaikki tulee ympäristömuuttujista.
Lokeihin ei tulosteta tokenia eikä avaimia. `.env` on `.gitignore`ssa.
Aiemmin `index.js` sisälsi kovakoodatun `BOT_SECRET`-tarkistuksen (`Komitea2026SalainenAvain`);
se on poistettu, eikä muuttujaa tarvita. Jos samaa merkkijonoa on käytetty muualla, vaihda se.
