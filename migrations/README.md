# Komitea Music ja Cards

`001-komitea.sql` lisätään nykyiseen Cloudflare D1 ‑tietokantaan. Se luo
Musicin, Cardsin ja paneelien taulut, indeksit ja triggerit. Nykyiset
tilastotaulut säilyvät. Migraation voi ajaa turvallisesti uudelleen.

## Käyttöönotto

1. Testaa ensin nykyistä D1-skeemaa vastaavassa testiympäristössä. Aja
   `001-komitea.sql` D1-migraationa tai komennolla
   `npx wrangler d1 execute TIETOKANTA --remote --file=migrations/001-komitea.sql`,
   kun Wrangler on yhdistetty oikeaan tiliin. Valitse nykyinen
   tietokanta. Komento kohdistuu valittuun etäympäristöön.
2. Säilytä Workerissa nykyiset `DB`-sidonta ja API-avain. Botin
   `D1_API_URL` ja `D1_API_KEY` ovat samat kuin ennen. Nykyinen Worker
   tukee jo atomista `/api/batch`-reittiä.
3. Käytä Node.js 24:ää ja asenna paketit lukitusta pakettilistasta.
   `@napi-rs/canvas` käyttää alustakohtaista natiivibinääriä. Asenna myös
   valinnaiset alustapaketit. Palvelimella tarvitaan sans-serif-fontti
   PNG-teksteille. Muistissa käsitellään yksi generointi kerrallaan.
4. Rekisteröi 96 slash-komentoa normaalilla `npm run deploy` ‑komennolla
   siinä Discord-ympäristössä, jolle julkaisu on hyväksytty.
5. Luo paneelit halutuissa tekstikanavissa komennoilla `/musiikkipaneeli`
   ja `/pelipaneeli`. Uusi suoritus päivittää tallennetun viestin. Jos
   viesti on poistettu, komento luo tilalle uuden nykyiseen kanavaan.
6. Testaa Discordissa paneelien hallintaoikeudet, äänenvoimakkuus,
   Discord-CDN:n avatarit, D1:n käytön määrä ja samanaikainen
   korttirenderöinti sekä musiikintoisto 512 Mt:n ympäristössä.

`KOMITEA_XP_YKSIKKO` on valinnainen tasokäyrän kerroin. Oletus on 50 ja
sallittu vaihteluväli 10–1000. `KOMITEA_TASORAJAT` määrittää Agentin,
Erikoisagentin ja Legendan tasot, oletuksena `10,25,50`. Päiväpalkinnot ja päivän pomot vaihtuvat
UTC-vuorokauden vaihtuessa. Sijoituskausi alkaa kalenterivuosineljänneksen alussa.

## Komitea Music

`/musiikkipaneeli` avaa musiikkimodaalit, soittimen, suosikit, historian, soittolistat
ja Wrappedin. Palvelimen ylläpito määrittää DJ-roolin, reilun jonon ja
automaattitoiston saman komennon vaihtoehdoilla. Toiston ohjaus edellyttää botin
äänikanavalla olemista. Yhteisen ohitusäänestyksen enemmistö lasketaan
äänikanavan käyttäjistä.

Kuunteluaika perustuu dekoodatun äänen kestoon ja äänikanavan jäsenyyteen.
Kuurot ja mykistetyn kuuntelun käyttäjät (itse- tai palvelinkuurot) eivät kerrytä
aikaa. Kappaleen tiedot tallennetaan toiston päättyessä. Prosessin äkillinen
pysähtyminen voi jättää kesken olleen kappaleen tallentamatta. Soittimen
livejono säilyy prosessin muistissa. Tallennetut listat, suosikit, historia,
asetukset ja paneeliviitteet säilyvät D1:ssä. Musiikkibattle ja visa ovat
lyhyitä palvelinkohtaisia tapahtumia ja päättyvät botin uudelleenkäynnistyessä.

## Komitea Cards

`/kortti` näyttää pysyvän taistelukortin PNG-kuvana. `/battle` luo
haasteen. Pelaaja voi pelata samanaikaisesti vain yhdessä PvP-taistelussa.
Sijoituspalkinto edellyttää vähintään kuutta siirtoa ja molempien
aiheuttamaa vahinkoa. Samaa pelaajaparia kohden lasketaan yksi
sijoitusottelu 24 tunnissa. Päivässä voidaan laskea enintään kahdeksan
sijoitusottelua pelaajaa kohden. Kortin harvinaisuus vaikuttaa ulkoasuun
ja keräilyarvoon. Pieni taso- ja varuste-etu on rajattu.

Komiteakolikot ovat kuvitteellista pelivaluuttaa. Lompakon ja esineiden
veloitus, keräilykorttien vaihto, PvP-palkinnot, pomopalkinnot ja
turnauspalkinnot kirjataan atomisesti. Päättyneiden taisteluiden ja
palkintojen tiedot säilyvät uudelleenkäynnistyksessä. Päiväturnauksessa
on neljä pelaajaa. Osallistujat avaavat kaaviosta oman ottelunsa.

## Testit

Aja `npm test`, `npm run musiikkitesti`, `npm run ajotesti` ja
`npm run komiteatesti`. Viimeinen käyttää paikallista Node.js 24:n
SQLite-tietokantaa ja renderöi oikeita PNG-kuvia. Se ei ota yhteyttä
tuotanto-D1:een tai Discordiin. Vanhat musiikkitestit käyttävät
valeääntä ja ajotesti käyttää valeinteraktioita.

## Julkaisu- ja palautusjärjestys

1. Kirjaa talteen Enzonicissa toimivan botin commit-tunniste, Workerin
   nykyinen versio ja Discordin kohdepalvelin. Ota D1-varmuuskopio ennen
   migraatiota esimerkiksi komennolla
   `npx wrangler d1 export TIETOKANTA --remote --output ./d1-varmuuskopio.sql`.
   Säilytä tiedosto yksityisessä sijainnissa ja merkitse D1 Time Travelin
   palautuspiste. Harjoittele palautusta erillisessä tietokannassa.
2. Tarkista kohdetietokanta ja sen sidonta Workerissa. Aja
   `001-komitea.sql` ensin testitietokantaan ja hyväksynnän jälkeen kohde-D1:een.
   Varmista, että aiemmat taulut ovat luettavissa. Migraatio on additiivinen.
3. Julkaise `d1-worker/src/index.js` sisältävä Worker-versio. Tässä versiossa
   puuttuva `API_KEY` sulkee rajapinnan. Varmista, että kelvollinen avain
   toimii ja tunnistamaton pyyntö saa HTTP 401:n. `DASHBOARD_TOKEN` tarvitaan
   botin dashboardin tietonäkymiin. Juuren elossaolovastaus säilyy myös
   ilman dashboard-avainta.
4. Aja Node.js 24.22.2:lla `npm ci`, kaikki neljä testisarjaa ja
   `npm run tarkista`. Kuiva-ajo listaa 96 komentoa. Tarkista native canvas
   ja fontit samalla Linux-alustalla kuin Enzonicissa.
5. Kun julkaisu on hyväksytty, toimita tarkistettu muutoskokonaisuus
   GitHubiin ja valitse se ensin testiympäristön julkaisuversioksi.
   Käytä Enzonicin nykyistä käynnistyskomentoa. Rekisteröi komennot
   vasta, kun uuden version botti on käynnissä kohdepalvelimella.
   `npm run deploy` korvaa kohdepalvelimen koko komentolistan.
6. Testaa Discordissa ensin vanha komento ja dashboardin kirjautuminen,
   sitten molemmat paneelit, YouTube ja SoundCloud, suosikit ja
   Wrapped, oikea avatar, PvP-haaste, viimeisen vuoron ensiapu, korttivaihto
   ja pomo. Varmista myös paneelin ja taistelun toiminta botin uudelleenkäynnistyksen
   yli. Seuraa vähintään botin ja yt-dlp-/FFmpeg-aliprosessien yhteismuistia,
   toiston katkoksia, D1-virheitä ja interaktioiden vanhentumista.
7. Ongelmatilanteessa palauta Enzonic edelliseen toimivaan GitHub-versioon
   ja rekisteröi sen komentolista uudelleen. Säilytä uudet D1-taulut ja
   suojattu Worker-versio, jos vanha botti toimii sen kautta. Jos itse
   tietokanta on vahingoittunut, arvioi palautus erikseen testikopiossa.
   Tuotannon palautus vanhaan varmuuskopioon voi hävittää sen jälkeen syntyneet
   tiedot.

## osu!-päivänhaaste

Aja `002-osu-daily-challenges.sql` ensin testitietokantaan nykyisen
`001-komitea.sql`-migraation jälkeen. Migraatio lisää taulun
`osu_daily_challenges`, jonka avain on palvelin ja Suomen paikallinen päivämäärä.
`komitea_panels` säilyttää nykyiset osu!-kanava-asetukset. Testaa päivänhaaste
ennen kuin ajat migraation hyväksyttyyn kohdetietokantaan. Worker käyttää
nykyistä `/api/batch`-reittiä.
