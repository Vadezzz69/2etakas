# Stats Engine

`analyzeUserStats(guildId, userId)` reads the existing message, voice, fine,
investigation, and command-usage data, then returns a presentation-ready
profile. It performs no writes and does not depend on a Discord interaction.

```js
const { analyzeUserStats } = require("../../utils/statsEngine");

const profile = await analyzeUserStats(interaction.guildId, user.id);
// {
//   title, badges, activityLevel, activityScore, activityPercent,
//   risk, riskLevel, riskScore, riskPercent,
//   committeeOpinion, summary, observations, highlights, roastContext
// }
```

`risk` and `riskLevel` are the same value — `risk` is kept for backwards
compatibility with earlier callers, `riskLevel` is the name used going
forward.

`roastContext` is the exact stats bundle the Roast Engine's templates need
(messages, voice, fines, investigations, command usage, rankings, recent
investigations, favorite command). Pass it straight to
`roastEngine.analyzeRoastFromStats(profile.roastContext)` to get a roast
without a second database round-trip.

## Module responsibilities

- `collectors.js` — read raw database metrics. `collectUserStats` is the
  basic bundle (unchanged shape); `collectExtendedStats` adds rankings,
  recent investigations, and favorite command on top, and is what
  `analyzeUserStats` and the Roast Engine both use.
- `activity.js` — today's activity score (0–5), percent (0–100), and level
  (`inactive | low | moderate | high`). The weighting constants are named,
  not magic numbers, and their sum defines `ACTIVITY_SCORE_MAX`.
- `risk.js` — risk score, percent, and level (`low | medium | high`), driven
  by fines and investigation counts. `RISK_HIGH_THRESHOLD` /
  `RISK_MEDIUM_THRESHOLD` are the named cutoffs.
- `opinion.js` — a one-line, deterministic "Committee opinion" derived from
  the risk/activity combination — distinct from `summary` (a data recap) and
  from the Roast Engine's paragraph (which explains *why*).
- `observations.js` — neutral, factual bullet points (not commentary),
  scored and ranked the same way the Roast Engine ranks its templates, but
  kept fully independent from it to avoid a circular dependency.
- `highlights.js` — rare, standout "record" strings (e.g. crossing 1000
  total messages), distinct from the routine `observations`.
- `presenter.js` — assembles the final stable profile object.

Risk and activity rules are deterministic and intentionally isolated so their
thresholds can be tuned without changing data access or command UI.
