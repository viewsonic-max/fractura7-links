# World Cup 26 — Match Day Map

Interactive map of all 104 matches of the 2026 FIFA World Cup (June 11 – July 19, 2026)
across the 16 host stadiums in Canada, Mexico, and the United States.

**To use: just open `index.html` in a browser.** (Needs internet for map tiles, flags, and fonts.)

## Features
- **Timeline scrubber** — every game day as a chip with match count, color-coded by round
  (green = groups, blue = R32, purple = R16, orange = QF, pink = SF, gold = Final).
  Navigate with the buttons, by clicking a day, or with `←` / `→` keys.
- **Play button** (`▶` / spacebar) — auto-plays the whole tournament day by day.
- **Stadium markers** pulse on days they host matches (badge = number of games);
  click one for that day's fixtures, kickoff times, and capacity. Idle stadiums tell you
  when their next match is. The Final gets a bouncing trophy + confetti.
- **Match cards** — kickoff in stadium-local time *and* your own timezone, team flags,
  group/round, and match number. Hover a card to highlight its stadium on the map.
- **Follow a team** — pick any of the 48 teams to star their match days on the timeline,
  highlight their fixtures, and light up the stadium where they play in gold.
- **Team journey arcs** — following a team draws their group-stage route as glowing arcs
  city-to-city (MD1 → MD2 → MD3) with a traveling soccer ball and total travel mileage.
- **Road to the Final** — toggle in the journey card traces the bracket path to MetLife
  as a gold dashed route, as group winners or runners-up (R32 → R16 → QF → SF → Final).
- **Live mode** — the header strip shows what's live right now or counts down to the next
  kickoff; live matches get red pulsing markers and LIVE cards, finished matches dim to FT.
  During a match the app polls live scores itself: ESPN's public scoreboard every 60 s for
  the real-time score and actual match clock, and the Wikipedia article every 2 min for
  full-time/a.e.t./penalty confirmation. No refresh or reload needed while watching.
- **Kickoff-order playback** — play mode sweeps through each day chronologically: stadiums
  flash in kickoff order with a clock chip showing who's kicking off (in your local time).
- **Group drawer** — click any "Group X" label (or "Group X →" in the journey card) for the
  group's four teams (click to follow) and all six fixtures (click to jump to that match).
- **Deep links** — `index.html?d=2026-07-04` opens a specific day; `?team=MEX&road=1` follows
  a team with the road shown (`road=2` for the runner-up path); `?group=B` opens a group
  drawer. On a tournament date, the app opens to "today" automatically.

## Results
The app is results-aware. After a data refresh, played matches show the final score
(plus a.e.t. / penalty shootout results) on their cards, popups, and group fixtures;
the group drawer computes a live standings table from the scores using FIFA's
tiebreakers (points → head-to-head → goal difference → goals). As knockout slots
resolve on Wikipedia, the real teams replace the "Winner Group A"-style placeholders
automatically, a followed team's journey extends into the knockout rounds, and the
champion's road re-roots from their latest actual fixture.

## Data pipeline
Schedule and results scraped from Wikipedia ([2026 FIFA World Cup](https://en.wikipedia.org/wiki/2026_FIFA_World_Cup)
per-group and knockout-stage articles). To refresh — during the tournament, any time
you want the latest scores:

```
node refresh.js
```

That downloads the wikitext into `data/`, then runs `parse.js` (→ `matches.json`),
`gen.js` (→ `data.js`, the file `index.html` loads), and `test.js` (sanity checks:
match counts, bracket paths reach the Final at MetLife, scores are paired and only
on matches that have kicked off). The steps can also be run individually.
