// One-command data refresh: download wikitext -> parse -> gen -> test
// Usage: node refresh.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const HEADERS = { 'User-Agent': 'wcviz/1.0 (personal World Cup schedule map; one-off refresh)' };
const PAGES = [
  ...'ABCDEFGHIJKL'.split('').map(g => [`group_${g}.txt`, `2026_FIFA_World_Cup_Group_${g}`]),
  ['knockout.txt', '2026_FIFA_World_Cup_knockout_stage'],
  ['final.txt', '2026_FIFA_World_Cup_final'],
];

(async () => {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
  for (const [file, title] of PAGES) {
    const r = await fetch(`https://en.wikipedia.org/wiki/${title}?action=raw`, { headers: HEADERS });
    if (!r.ok) throw new Error(`${title}: HTTP ${r.status}`);
    const text = await r.text();
    if (!text.includes('football box')) throw new Error(`${title}: unexpected content (no match boxes)`);
    fs.writeFileSync(path.join(__dirname, 'data', file), text);
    process.stdout.write(`fetched ${title}\n`);
  }
  execSync('node parse.js', { cwd: __dirname, stdio: 'inherit' });
  execSync('node gen.js', { cwd: __dirname, stdio: 'inherit' });
  execSync('node test.js', { cwd: __dirname, stdio: 'inherit' });
  console.log('\n✅ refresh complete — reload index.html to see the latest data');
})().catch(e => { console.error('❌ refresh failed:', e.message); process.exit(1); });
