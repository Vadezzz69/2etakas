# UI utilities

A shared UI layer used by commands to build embeds consistently — spacing,
colors, footer, timestamp, icons, and progress bars are all handled here
instead of being assembled by hand in every command file.

```js
const { stats, formatDuration, mentionUser } = require("../../utils/ui");

const embed = stats({
    title: "Palvelimen aktiivisuus",
    description: `${mentionUser(userId)} vietti ${formatDuration(seconds)} äänessä.`,
    fields: [{ name: "Viestejä", value: "42", inline: true }]
});
```

Available embed factories: `info`, `success`, `warning`, `error`, `stats`,
`ranking`, and `report`. They use the existing palette and add the project
footer and timestamp by default. Pass `footer: false` or `timestamp: false`
when a view intentionally needs to omit either one.

## Profile embeds

For commands built around a Stats Engine profile (see `utils/statsEngine`),
`buildProfileEmbed` assembles the whole embed — Discord account fields,
command-specific stat fields, an activity/risk progress bar pair, badges,
highlights, and an optional Roast Engine comment — with consistent spacing
and icons, and picks the accent color from the profile's risk level
automatically:

```js
const { buildProfileEmbed, ICONS, formatNumber } = require("../../utils/ui");
const { analyzeUserStats } = require("../../utils/statsEngine");

const profile = await analyzeUserStats(guildId, userId);

const embed = buildProfileEmbed({
    title: `${ICONS.committee} Salainen tiedosto — ${user.tag}`,
    thumbnail: user.displayAvatarURL(),
    statFields: [
        { name: `${ICONS.messages} Viestejä`, value: formatNumber(profile.roastContext.messages.total), inline: true }
    ],
    profile
});
```

## Formatters

`formatNumber`, `formatPercent`, `formatDuration`, `formatDate`,
`mentionUser`, `formatProgressBar` (block-character bar, delegates to
`utils/tyyli.js` so there is one implementation of "what a bar looks like"),
and `formatRanking` (renders a `{position, total}` pair or a fallback).

## Icons

`ICONS` is a named emoji registry (`ICONS.messages`, `ICONS.voice`,
`ICONS.risk`, ...) so commands reference a concept instead of a bare emoji
literal.
