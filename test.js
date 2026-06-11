// Headless sanity tests for data.js (run after every refresh)
const window = {};
eval(require('fs').readFileSync(require('path').join(__dirname, 'data.js'), 'utf8'));
const {teams: TEAMS, venues: VENUES, groups: GROUPS, matches: MATCHES} = window.WC;

const ROUND_SHORT = {'Round of 32':'R32','Round of 16':'R16','Quarterfinal':'QF','Semifinal':'SF','Final':'FINAL'};
const mdOf = d => d <= '2026-06-17' ? 1 : d <= '2026-06-23' ? 2 : 3;
const groupOf = code => Object.keys(GROUPS).find(g => GROUPS[g].includes(code));
const kickoffUTC = m => {
  const [y, mo, da] = m.d.split('-').map(Number);
  const [h, mi] = m.t.split(':').map(Number);
  return Date.UTC(y, mo - 1, da, h - m.utc, mi);
};

function chainFromTag(tag) {
  let cur = MATCHES.find(m => m.a === tag || m.b === tag);
  const out = [];
  while (cur && out.length < 6) {
    out.push({v: cur.v, label: ROUND_SHORT[cur.r] || cur.r, d: cur.d, n: cur.n});
    if (cur.r === 'Final') break;
    cur = MATCHES.find(m => (m.a === `?W Match ${cur.n}` || m.b === `?W Match ${cur.n}`) && m.r !== 'Third Place');
  }
  return out;
}

let fails = 0;
const fail = (...args) => { fails++; console.log('FAIL', ...args); };

// basics
if (MATCHES.length !== 104) fail('match count', MATCHES.length);
if (MATCHES.filter(m => m.r === 'Group Stage').length !== 72) fail('group-stage count');
MATCHES.forEach(m => {
  if (!VENUES[m.v]) fail('unknown venue', m.n, m.v);
  if (!m.d || !m.t || m.utc == null) fail('missing date/time', m.n);
});

// road chains: while a group's placeholder tags still exist, the bracket walk
// must reach the Final at MetLife; resolved slots simply drop out of the test
let chains = 0;
for (const g of Object.keys(GROUPS)) {
  for (const tag of [`?W·${g}`, `?2nd·${g}`]) {
    if (!MATCHES.some(m => m.a === tag || m.b === tag)) continue;
    chains++;
    const c = chainFromTag(tag);
    const datesAscend = c.every((s, i) => !i || c[i-1].d < s.d);
    if (c[c.length-1].label !== 'FINAL' || c[c.length-1].v !== 'MetLife Stadium' || !datesAscend || !c.every(s => VENUES[s.v]))
      fail('road chain', tag, c.map(s => s.label).join('>'));
  }
}
console.log(`road chains: ${chains} placeholder paths checked${chains ? '' : ' (all resolved)'}`);

// team journeys: 3 group matches always; knockout appearances accumulate as slots resolve
for (const code of Object.keys(TEAMS)) {
  const mine = MATCHES.filter(m => m.a === code || m.b === code);
  const grp = mine.filter(m => m.r === 'Group Stage');
  if (grp.length !== 3) fail('group matches', code, grp.length);
  if (mine.length > 3 + 5) fail('too many matches', code, mine.length);
  if (!groupOf(code)) fail('groupOf', code);
}
console.log('team journeys: 48 teams x 3 group matches OK');

// results sanity: scores paired, only on matches that have kicked off,
// penalties only with a drawn knockout score
const now = Date.now();
const scored = MATCHES.filter(m => m.s1 != null);
for (const m of scored) {
  if (m.s2 == null) fail('half score', m.n);
  if (kickoffUTC(m) > now) fail('future score', m.n, m.d);
  if (m.pens && (m.r === 'Group Stage' || m.s1 !== m.s2)) fail('bad pens', m.n);
}
console.log(`results: ${scored.length}/104 matches have scores`);

console.log(fails ? `\n❌ ${fails} failure(s)` : '\n✅ all checks passed');
process.exit(fails ? 1 : 0);
