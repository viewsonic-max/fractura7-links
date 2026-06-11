// Generate data.js (embedded app data) from matches.json
const fs = require('fs');
const { matches, groups } = JSON.parse(fs.readFileSync('matches.json', 'utf8'));

const TEAMS = {
  ALG: ['Algeria', 'dz'], ARG: ['Argentina', 'ar'], AUS: ['Australia', 'au'],
  AUT: ['Austria', 'at'], BEL: ['Belgium', 'be'], BIH: ['Bosnia & Herzegovina', 'ba'],
  BRA: ['Brazil', 'br'], CAN: ['Canada', 'ca'], CIV: ['Ivory Coast', 'ci'],
  COD: ['DR Congo', 'cd'], COL: ['Colombia', 'co'], CPV: ['Cape Verde', 'cv'],
  CRO: ['Croatia', 'hr'], CUW: ['Curaçao', 'cw'], CZE: ['Czechia', 'cz'],
  ECU: ['Ecuador', 'ec'], EGY: ['Egypt', 'eg'], ENG: ['England', 'gb-eng'],
  ESP: ['Spain', 'es'], FRA: ['France', 'fr'], GER: ['Germany', 'de'],
  GHA: ['Ghana', 'gh'], HAI: ['Haiti', 'ht'], IRN: ['Iran', 'ir'],
  IRQ: ['Iraq', 'iq'], JOR: ['Jordan', 'jo'], JPN: ['Japan', 'jp'],
  KOR: ['South Korea', 'kr'], KSA: ['Saudi Arabia', 'sa'], MAR: ['Morocco', 'ma'],
  MEX: ['Mexico', 'mx'], NED: ['Netherlands', 'nl'], NOR: ['Norway', 'no'],
  NZL: ['New Zealand', 'nz'], PAN: ['Panama', 'pa'], PAR: ['Paraguay', 'py'],
  POR: ['Portugal', 'pt'], QAT: ['Qatar', 'qa'], RSA: ['South Africa', 'za'],
  SCO: ['Scotland', 'gb-sct'], SEN: ['Senegal', 'sn'], SUI: ['Switzerland', 'ch'],
  SWE: ['Sweden', 'se'], TUN: ['Tunisia', 'tn'], TUR: ['Turkey', 'tr'],
  URU: ['Uruguay', 'uy'], USA: ['United States', 'us'], UZB: ['Uzbekistan', 'uz'],
};

// stadium name (as parsed) -> [host-city label, country, lat, lng, capacity, town]
const VENUES = {
  'Estadio Azteca':          ['Mexico City', 'MEX', 19.3029, -99.1505, 80824, 'Mexico City'],
  'Estadio Akron':           ['Guadalajara', 'MEX', 20.6817, -103.4626, 45664, 'Zapopan'],
  'Estadio BBVA':            ['Monterrey', 'MEX', 25.6692, -100.2445, 51243, 'Guadalupe'],
  'SoFi Stadium':            ['Los Angeles', 'USA', 33.9535, -118.3392, 70492, 'Inglewood'],
  "Levi's Stadium":          ['SF Bay Area', 'USA', 37.4030, -121.9696, 68827, 'Santa Clara'],
  'Lumen Field':             ['Seattle', 'USA', 47.5952, -122.3316, 66925, 'Seattle'],
  'BC Place':                ['Vancouver', 'CAN', 49.2768, -123.1119, 52497, 'Vancouver'],
  'AT&T Stadium':            ['Dallas', 'USA', 32.7473, -97.0945, 70649, 'Arlington'],
  'NRG Stadium':             ['Houston', 'USA', 29.6847, -95.4107, 68777, 'Houston'],
  'Arrowhead Stadium':       ['Kansas City', 'USA', 39.0489, -94.4839, 69045, 'Kansas City'],
  'Mercedes-Benz Stadium':   ['Atlanta', 'USA', 33.7554, -84.4010, 68239, 'Atlanta'],
  'Hard Rock Stadium':       ['Miami', 'USA', 25.9580, -80.2389, 64478, 'Miami Gardens'],
  'Gillette Stadium':        ['Boston', 'USA', 42.0909, -71.2643, 64146, 'Foxborough'],
  'Lincoln Financial Field': ['Philadelphia', 'USA', 39.9008, -75.1675, 68324, 'Philadelphia'],
  'MetLife Stadium':         ['New York New Jersey', 'USA', 40.8135, -74.0745, 80663, 'East Rutherford'],
  'BMO Field':               ['Toronto', 'CAN', 43.6332, -79.4186, 43036, 'Toronto'],
};

const fmtTeam = (t) => t.code ? t.code : '?' + t.placeholder
  .replace('Winner Group ', 'W·').replace('Runner-up Group ', '2nd·')
  .replace('3rd Group ', '3rd·').replace('Winner Match ', 'W Match ')
  .replace('Loser Match ', 'L Match ');

const out = matches.map((m) => {
  if (!VENUES[m.stadium]) throw new Error('unknown stadium: ' + m.stadium);
  return {
    n: m.matchNum, d: m.date, t: m.time, utc: m.utcOffset,
    a: fmtTeam(m.team1), b: fmtTeam(m.team2),
    v: m.stadium, r: m.round, g: m.group || null,
    sec: m.section, src: m.source,
    ...(m.s1 != null ? {s1: m.s1, s2: m.s2} : {}),
    ...(m.aet ? {aet: 1} : {}),
    ...(m.pens ? {pens: m.pens} : {}),
  };
}).sort((x, y) => x.d.localeCompare(y.d) || x.t.localeCompare(y.t) || x.n - y.n);

const data = { teams: TEAMS, venues: VENUES, groups, matches: out };
fs.writeFileSync('data.js', 'window.WC = ' + JSON.stringify(data) + ';\n');
console.log('wrote data.js —', out.length, 'matches,', Object.keys(VENUES).length, 'venues,', Object.keys(TEAMS).length, 'teams');
