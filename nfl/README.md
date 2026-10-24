# NFL 2026 — Season Map (nflviz)

NFL retarget of the World Cup 26 "Match Day Map" (`../wcviz`). Same idea: an
interactive map of every game of the 2026 NFL season (Sept 10, 2026 – Super Bowl LXI,
Feb 14, 2027) across the 30 NFL stadiums plus the International Series venues.

Status: **data layer + core app done** (map, week timeline, game cards, follow-a-team
travel route, division standings drawer, live ESPN polling, PWA, en/es). Playoff
predictor, odds model and the season-recap card are the next steps (see below).

**To use: open `index.html` in a browser.** `node verify.js [desk|team|div|mobile|es|ff|layout]`
runs a headless-Edge smoke test (uses `../wcviz/node_modules/playwright-core`) and
writes `_shot-<scenario>.png`. The `layout` scenario asserts phone geometry — nothing
floating over the timeline bar, one row of header chips, no colliding stadium labels or
game pins, every game pin inside the visible band — and exits non-zero on a regression.

### Mobile layout rules (2026-10-23 polish pass)

A OnePlus 6T screenshot showed the floating buttons sitting on top of the week chips and
the map reduced to a blob of overlapping pins. The fixes worth knowing before editing CSS:

- **`--tlH`** is the timeline bar's measured height, set in `layoutPanel()`. The panel,
  drawer, FAB row, clock chip and tile attribution all position off it. Never hard-code a
  bottom offset — the bar's height changes with form factor and chip content.
- **Zoom bands.** `zoomBand()` flips at zoom 5; `pinSizes()` returns smaller markers when
  zoomed out and smaller again on phones (28/12 vs 40/22), and `body.zlow` hides stadium
  labels on phones. The whole country only fits a phone at about zoom 3, where full-size
  pins merge into one blob.
- **Clustering** (`clusterVenues`). Even at 28px the eastern stadiums collide, so the
  week's venues are grouped in projected-pixel space on every zoom change. Each pass takes
  the busiest unclaimed stadium as an **anchor** and absorbs every unclaimed venue within
  `pinSize × 1.3`. Anything left over was farther than that from every earlier anchor, so
  **all anchors end up at least one threshold apart** — rendering each group at its anchor
  therefore cannot overlap, and because the marker never moves to a centroid there is no
  drift that would chain the whole East Coast into a single pin. A group of two or more
  draws a dashed collar, shows the group's **game** count (same meaning as a single pin)
  and a "N stadiums" label, and flies to its members' bounds when tapped; the resulting
  zoom change re-clusters and splits it. Member markers get a zero-size icon, and
  `hotMarker()` matches on `data-v~=` so hovering a game card still lights up the cluster
  holding that venue. Verified: 14 games on screen at every zoom, zero pin collisions.
- **`fitDay()`** pads the fit by the real header and timeline heights, so a week's games
  land in the band between them rather than behind the chrome.
- **Phones get one chip row.** `cities` is dropped (it tracks games), the bye chip becomes
  a count, and the full bye list moves to a tappable footer row under the game list.
- **The week strip owns its own row** on phones (`#days{order:-1; flex-basis:100%}`), which
  takes it from ~25% to ~95% of the bar — it is the primary control.

## What the app does today

- **Map** of all 38 venues on Esri's keyless World Dark Gray canvas (CARTO's free dark
  tiles started watermarking "API KEY REQUIRED" in Oct 2026). Active stadiums pulse with
  the week's game count; the Super Bowl bounces a 🏆; idle labels hide below zoom 5.
- **Week timeline** — 22 chips (18 regular weeks + Wild Card, Divisional, Conference,
  Super Bowl), colored by round, with the current week flagged NOW. `←`/`→`, ▶ plays the
  season week by week flashing stadiums in kickoff order (the Sunday 1pm wave together).
- **Game cards** grouped by the viewer's local calendar day: away @ home, logos, kickoff
  in stadium-local and your time, broadcaster, division-game and International Series
  tags, final score with OT, live clock. Week 18 / playoff games with unset times show TBD.
- **Follow a team** (select grouped by division) → their weeks star on the timeline, the
  bye week dims, and their season draws as flights out and back from home (round trips;
  consecutive international games fly direct) with a live odometer and ▶ fly-through.
  Journey card lists every week (vs/@ opponent, W/L underline) plus record, PF/PA.
- **Division drawer** — standings (W-L-T, PCT, NET, DIV record) ordered by the full NFL
  tiebreakers, every division game, green for the division leader and blue for a club
  currently holding a wild-card seed, and a 🏆 shortcut to the playoff picture.
- **🏆 Playoff picture** — both conferences seeded 1–7, who is in the hunt and how far
  back, and the wild-card matchups the seeding implies. See below.
- **Live** — ESPN scoreboard polled every 45 s during game windows (score, quarter/clock,
  final), backfill on load for any kicked-off game missing a score, playoff pairings
  picked up automatically once Week 18 ends. Score fanfare + confetti burst and
  notifications for the followed team only (NFL scoring is too frequent for everyone).
- **📊 Fantasy leaders** (timeline button or the points chip) — top 10 fantasy scorers for
  any completed week or the season, expandable to 25, in Standard / Half-PPR / PPR (choice
  persists), with headshot, team, position, stat line, and per-game average on the season
  tab. Players only (QB/RB/WR/TE/K) — no team defenses.
- **PWA** (`manifest.json`, `sw.js` cache `nflviz-v1`, generated 🏈 icons), **en/es**
  toggle in the help overlay, deep links `?w=7`, `?d=2026-10-25`, `?team=KC`,
  `?div=AFC West`, `?play=1`, `?sheet=1`, `?ff=1`.

## Tiebreakers and seeding

`TB()` builds per-club game logs, records, strength of victory/schedule and the combined
points rankings from final scores, cached on a results signature. `pickBest(pool, mode)`
then runs the real NFL procedure rather than a sort comparator, because three rules make
it one:

- **Only one club is separated per pass.** Once it is taken, the rest revert to step 1.
- **A step that narrows the field without resolving it restarts the chain** at step 1.
- **In a wild-card tie, same-division clubs are first reduced to their highest-ranked
  member**, so a club can never be seeded above a division rival it ranks behind.

Chains, both starting at win percentage:

| | Division | Wild card / conference |
|---|---|---|
| 1 | head-to-head | head-to-head (3+ clubs: sweep only) |
| 2 | division record | conference record |
| 3 | common games | common games, min. 4 |
| 4 | conference record | strength of victory |
| 5–6 | strength of victory, then schedule | strength of schedule, conference points rank |
| 7–8 | combined points rank, conference then league | league points rank, net points in conference games |
| 9–11 | net points in common games, all games, net touchdowns | net points all games, net touchdowns |

Net touchdowns come from `fantasy-data.js` (`tds`), counted off the cached box scores.
A tie surviving every step is a coin toss in reality; here it falls back to code order.

**One deliberate addition.** The rule book assumes all 17 games are played. Mid-season
they are not, and a literal reading seats a 6-0 club behind a 5-0 one on strength of
victory — which is not how ESPN or the league display it. So when the clubs in a tie have
played a *different* number of games, more wins ranks first. The step is skipped once
schedules are equal, leaving the chain exactly as written. Without it the 2026 Week 7 NFC
put Minnesota (5-0) over San Francisco (6-0); with it, all 32 seeds match ESPN.

`clinchOf()` marks y/x/e by record alone and conservatively: a rival who can merely draw
level counts as a threat, since head-to-head cannot be projected. A marker may therefore
appear a week after the league announces it, but never wrongly.

`node verify.js seeds` checks internal consistency and compares every seed against ESPN's
published `playoffSeed`.

## Fantasy pipeline (`fantasy.js`)

`node refresh.js` runs it automatically (skip with `--no-fantasy`); `node fantasy.js
[--offline]` runs it alone. One ESPN game summary is ~560 KB, so the browser can't pull
them — the script caches each **final** game's summary once in `raw/sum/<eventId>.json`
(immutable after the final whistle), looks up each player's position once via the core
athletes endpoint (`raw/athletes.json`), scores every offensive player and kicker under
three formats and writes `fantasy-data.js` (`window.NFLF`, ~80 KB):

```
weeksDone  [1,2,…]                                  weeks with at least one final
weeks      { "6": [ {id,n,tm,pos,pts:[std,half,ppr],st:{py,ptd,int,ry,rtd,rec,recy,rectd,fl,tp,fgm,fga,xpm,xpa}} … ] }
seasonTop  [ same rows + g (games) + best {w,pts} ]  union of each format's top 60
```

Scoring = ESPN defaults: pass yds 0.04, pass TD 4, INT −2, rush/rec yds 0.1, TD 6, two-point
conversion 2 (each player named in the play), fumble lost −2, reception 0 / 0.5 / 1; kickers
FG 3/4/5 by distance (distances from the scoring-play log), XP 1, missed FG −1.
Each week's list is the union of the top 30 under each format, so re-sorting in the page is
exact. **Validation (2026-10-23):** season PPR totals match ESPN's own fantasy API
(`lm-api-reads.fantasy.espn.com … leaguedefaults/3`) to the decimal for the top-40 most-owned
players once the same games are included.

## Data pipeline

One source, one script. ESPN's public scoreboard API carries the full schedule,
venues, broadcasters, results, and live state, so there is no Wikipedia parsing.

```
node refresh.js            # fetch every week into raw/, build data.js + matches.json, run checks
node refresh.js --offline  # rebuild from raw/ without touching the network
```

Endpoints used (all `site.api.espn.com`):

- `/apis/site/v2/sports/football/nfl/scoreboard?dates=2026&seasontype=2&week=N` (N = 1..18)
- `/apis/site/v2/sports/football/nfl/scoreboard?dates=2026&seasontype=3&week=N` (N = 1..4: Wild Card, Divisional, Conference, Super Bowl)
- `/apis/site/v2/sports/football/nfl/teams` (names, colors, logo slugs)
- `/apis/v2/sports/football/nfl/standings?season=2026&level=3` (conference → division → teams)

ESPN exposes **no stadium coordinates**, so `refresh.js` carries a hand-maintained
`VENUES` table keyed by ESPN venue id: display name, city, country, lat/lng, capacity,
IANA timezone, state. An unknown venue id makes the script throw with the ESPN name
so it can be added. Team logos: `https://a.espncdn.com/i/teamlogos/nfl/500/{slug}.png`
(CDN sends `Access-Control-Allow-Origin: *`, so canvas use is safe).

## `data.js` shape (`window.NFL`)

```
meta        { league, season, label, superBowl, final (game n of the Super Bowl), fetched }
teams       { KC: { name, city, nick, slug, color, alt, conf, div, home } ... }
divisions   { "AFC East": ["BUF","MIA","NE","NYJ"], ... }          (8 × 4)
conferences { AFC: [16 codes], NFC: [16 codes] }
venues      { "SoFi Stadium": [city, country, lat, lng, capacity, tz, indoor, state, espnId, espnName] }
weeks       [ { w, label, st, pw, from, to, games, byes? } ... ]    (22: Week 1–18, then 19–22 playoffs)
games       [ { n, id, d, t, utc, iso, de, a, b, v, w, r, st, pw, s1?, s2?, ot?, neutral?, div?, conf?, tv?, tbd?, live? } ... ]
```

Game fields follow `wcviz`'s match shape so the map/timeline/card code ports over:

| field | meaning |
|---|---|
| `n` | 1..285 in kickoff order |
| `id` | ESPN event id (string) — the live poller matches on this |
| `d`, `t`, `utc` | kickoff date/time in the **venue's** zone, DST-correct per game, plus the offset in hours |
| `iso` | kickoff instant, UTC |
| `de` | kickoff date in US Eastern (NFL week calendar; Monday night is still "Monday") |
| `a`, `b` | **away, home** — reads "A @ B". `null` + `tbd:true` for unresolved playoff games |
| `v` | venue name, key into `venues`; `null` for TBD playoff games |
| `w`, `r` | timeline week 1..22 and label ("Week 7", "Wild Card", "Divisional", "Conference", "Super Bowl") |
| `st`, `pw` | ESPN season type (2 regular / 3 post) and ESPN week within it |
| `s1`, `s2` | score for `a` and `b`, present only once FINAL (or `live:true`) |
| `ot` | decided in overtime (ESPN period > 4) |
| `neutral` | International Series / neutral site (ESPN still designates a home team for records) |
| `div`, `conf` | the two teams share a division / conference (needed for NFL tiebreakers) |
| `tv` | national broadcaster(s) |
| `tt` | kickoff **time** not set yet (ESPN `timeValid:false`, parked at midnight ET): Week 18 and unresolved playoff games. Show the date only. |

`check()` in `refresh.js` enforces: 272 regular + 13 postseason games, unique ESPN ids,
17 games and exactly one bye (weeks 5–14) per team, 8 divisions × 4, every venue has
coordinates and a timezone, scores only on games that have kicked off, Super Bowl at
SoFi on 2027-02-14.

## Next (per the plan)

1. ~~Retarget `index.html`~~ — done 2026-10-21.
2. Full NFL tiebreakers (add common games, strength of victory / schedule, conference
   wild-card procedure) + a conference-wide playoff-picture view.
3. Playoff seeding (7 per conference, 1-seed bye) + reseeding bracket predictor and a
   road-to-the-Super-Bowl tracer on the journey card.
4. Odds: points-margin model (rating + home field, normal margin, small tie prob) feeding the
   Monte Carlo and the "how the odds evolved" week-by-week chart; then the season-recap share card.
