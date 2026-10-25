# Roast Engine

The Roast Engine creates Committee-style comments strictly from measured
server data. *Which* observations are chosen is never random: template scores
are derived from the member's current statistics and ties are resolved by
template id. Only the *wording* varies — each template, opening, transition and
closing has several interchangeable variants, drawn through
`utils/satunnainen.js` (which avoids repeating the most recent picks).

```js
const { generateRoast, analyzeRoast } = require("../../utils/roastEngine");

const text = await generateRoast(guildId, userId);
const details = await analyzeRoast(guildId, userId);
// { text, observations: ["investigations-recent", "fines-present"] }
```

If a caller already has a Stats Engine profile (e.g. from
`analyzeUserStats`), it can skip the extra database round-trip entirely by
reusing `profile.roastContext`:

```js
const { analyzeUserStats } = require("../../utils/statsEngine");
const { analyzeRoastFromStats } = require("../../utils/roastEngine");

const profile = await analyzeUserStats(guildId, userId);
const roast = analyzeRoastFromStats(profile.roastContext); // no DB call
```

`generateRoastFromStats(stats)` is the equivalent shortcut when only the
plain text is needed.

## Output: a short paragraph, not a single sentence

Composition happens in two steps (`compose.js`):

1. **Lead sentence** — every selected observation's clause is merged into one
   sentence with natural joining ("...", "... ja ..."), e.g. *"Komitea
   kirjasi, että käyttäjä kirjoitti tänään 84 000 viestiä, vietti 420 tuntia
   äänikanavalla ja on kerännyt 31 sakkoriviä."*
2. **Contextual closing sentence** — a second sentence editorializes on the
   *dominant* category among the selected observations (legal > standing >
   record > volume > state > general), using a transition phrase and a
   closing phrase from `phrases.js`. The closing's *meaning* always follows from
   which categories were actually observed; only its wording is drawn from a
   few variants.

## Templates

Templates live in `templates/`, grouped by observation type. Each template is
an object with:

- `id` — stable identifier, also used to break scoring ties
- `category` — `"volume" | "legal" | "standing" | "record" | "state"`, used
  by the composer to pick the dominant theme and its transition/closing
- `score(stats)` — data-derived score; `0` means "not applicable"
- `text(stats)` — the clause merged into the lead sentence (picks one of
  several wordings)

Collectors cover messages, voice, fines, recent and open investigations,
rankings, and achievement thresholds — all sourced from the Stats Engine's
`collectExtendedStats`, so ranking and recent-investigation queries are
defined exactly once in the whole project.
