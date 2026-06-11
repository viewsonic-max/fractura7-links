// Parse Wikipedia raw wikitext for 2026 FIFA World Cup match schedule -> matches.json
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'data');

function parseBlocks(text, source) {
  const matches = [];
  // each match: <section begin=NAME />{{#invoke:football box|main ... }}<section end=NAME />
  const re = /<section begin="?([^" \/]+)"? *\/>\{\{#invoke:football box\|main([\s\S]*?)\}\}<section end=/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const section = m[1];
    const body = m[2];
    const get = (field) => {
      const r = new RegExp('^\\|' + field + '=(.*)$', 'm');
      const mm = body.match(r);
      return mm ? mm[1].trim() : '';
    };
    const dateRaw = get('date');
    const dm = dateRaw.match(/Start date\|(\d{4})\|(\d{1,2})\|(\d{1,2})/);
    const date = dm ? `${dm[1]}-${String(dm[2]).padStart(2, '0')}-${String(dm[3]).padStart(2, '0')}` : null;

    const timeRaw = get('time');
    // e.g. 1:00&nbsp;p.m. [[UTC−06:00|UTC−6]]
    const tm = timeRaw.match(/(\d{1,2}):(\d{2})(?:&nbsp;|\s)*([ap])\.?m\.?/i);
    let time = null;
    if (tm) {
      let h = parseInt(tm[1], 10);
      const min = tm[2];
      const ap = tm[3].toLowerCase();
      if (ap === 'p' && h !== 12) h += 12;
      if (ap === 'a' && h === 12) h = 0;
      time = `${String(h).padStart(2, '0')}:${min}`;
    }
    const utcm = timeRaw.match(/UTC[−-](\d{1,2})(?::(\d{2}))?/);
    const utcOffset = utcm ? -parseInt(utcm[1], 10) : null;

    const parseTeam = (field) => {
      const raw = get(field);
      const code = raw.match(/fb(?:-rt)?\|([A-Z]{3})/);
      if (code) return { code: code[1] };
      // knockout placeholder: <!--...-->Winner Group C
      const txt = raw.replace(/<!--[\s\S]*?-->/g, '').replace(/\{\{[^}]*\}\}/g, '').trim();
      return { placeholder: txt || null };
    };

    const stadiumRaw = get('stadium');
    // [[Estadio Azteca]], [[Mexico City]]  or  [[SoFi Stadium]], [[Inglewood, California|Inglewood]]
    const links = [...stadiumRaw.matchAll(/\[\[([^\]\|]+)(?:\|([^\]]+))?\]\]/g)];
    const stadium = links[0] ? links[0][1] : stadiumRaw;
    const town = links[1] ? (links[1][2] || links[1][1]) : '';

    // match number is the score-link display label (after the last pipe),
    // NOT the anchor text, which for knockout rounds references earlier matches
    const scoreRaw = get('score');
    const num = scoreRaw.match(/\|\s*Match (\d+)\s*(?:\|[^}]*)?\}\}/);

    // result: once played, the score field carries "2–1" (possibly inside the
    // score-link label); aet/penaltyscore are separate footballbox params
    const sm = scoreRaw.match(/(\d+)\s*[–—-]\s*(\d+)/);
    const aet = /^y/i.test(get('aet'));
    const pm = get('penaltyscore').match(/(\d+)\s*[–—-]\s*(\d+)/);

    matches.push({
      section,
      source,
      matchNum: num ? parseInt(num[1], 10) : null,
      date,
      time,
      utcOffset,
      team1: parseTeam('team1'),
      team2: parseTeam('team2'),
      stadium,
      town,
      s1: sm ? +sm[1] : null,
      s2: sm ? +sm[2] : null,
      aet,
      pens: pm ? `${pm[1]}–${pm[2]}` : null,
    });
  }
  return matches;
}

let all = [];
for (const g of 'ABCDEFGHIJKL') {
  const text = fs.readFileSync(path.join(DATA, `group_${g}.txt`), 'utf8');
  const ms = parseBlocks(text, `group_${g}`).map((x) => ({ ...x, round: 'Group Stage', group: g }));
  all = all.concat(ms);
}
{
  const text = fs.readFileSync(path.join(DATA, 'knockout.txt'), 'utf8');
  const roundOf = (s) =>
    s.startsWith('R32') ? 'Round of 32' :
    s.startsWith('R16') ? 'Round of 16' :
    s.startsWith('QF') ? 'Quarterfinal' :
    s.startsWith('SF') ? 'Semifinal' :
    s === '3rd' ? 'Third Place' : s;
  const ms = parseBlocks(text, 'knockout')
    .filter((x) => x.section !== 'Bracket')
    .map((x) => ({ ...x, round: roundOf(x.section) }));
  all = all.concat(ms);
}
{
  const text = fs.readFileSync(path.join(DATA, 'final.txt'), 'utf8');
  const ms = parseBlocks(text, 'final').map((x) => ({ ...x, round: 'Final' }));
  all = all.concat(ms);
}

// group memberships from group files
const groups = {};
for (const m of all) {
  if (m.group) {
    groups[m.group] = groups[m.group] || new Set();
    if (m.team1.code) groups[m.group].add(m.team1.code);
    if (m.team2.code) groups[m.group].add(m.team2.code);
  }
}

const codes = new Set();
for (const m of all) {
  if (m.team1.code) codes.add(m.team1.code);
  if (m.team2.code) codes.add(m.team2.code);
}

console.log('total matches:', all.length);
console.log('group stage:', all.filter((m) => m.round === 'Group Stage').length);
console.log('missing date/time:', all.filter((m) => !m.date || !m.time).map((m) => m.section));
console.log('missing matchNum:', all.filter((m) => m.matchNum == null).map((m) => m.section));
console.log('stadiums:', [...new Set(all.map((m) => `${m.stadium} | ${m.town}`))].sort().join('\n'));
console.log('codes (' + codes.size + '):', [...codes].sort().join(' '));
console.log('groups:', Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, [...v].join(',')])));
console.log('placeholders:', all.filter((m) => m.team1.placeholder).map((m) => `${m.section}: ${m.team1.placeholder} vs ${m.team2.placeholder}`).join('\n'));

fs.writeFileSync(path.join(__dirname, 'matches.json'), JSON.stringify({ matches: all, groups: Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, [...v]])) }, null, 1));
