// Builds public/ecosystem-districts-data.js: the Ecosystem map by district.
//
//   node scripts/build-ecosystem-districts.mjs
//
// Inputs
//   public/iteration2_map_aggregated_V2.json            GBIF records by species, state, year, month and a free-text locality
//   ml/data/raw/geoBoundaries-MYS-ADM2_simplified.geojson   district outlines (geoBoundaries, CC BY 3.0, source citypopulation.de)
//   public/index0914.html                               ECOSYSTEM_STATES_GEOJSON, used to give each district its state
//
// The V2 file has no district column, so a record is placed in a district only when one of these holds,
// tried in this order:
//   1. single   the state is one district on its own (Kuala Lumpur, Labuan, Putrajaya, Perlis)
//   2. coords   the locality text carries a latitude and longitude that falls inside a district of the record's state
//   3. name     the locality text contains the name of a district of the record's state
//   4. alias    the locality text contains a place name listed in ALIASES below (hand written, each tied to a state)
// Every other record stays in the output as "not placed" with its state, so the totals match the state view.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const V2 = path.join(root, 'public', 'iteration2_map_aggregated_V2.json');
const GEO = path.join(root, 'ml', 'data', 'raw', 'geoBoundaries-MYS-ADM2_simplified.geojson');
const HTML = path.join(root, 'public', 'index0914.html');
const OUT = path.join(root, 'public', 'ecosystem-districts-data.js');

const SPECIES = {
  'Macaca fascicularis': 'macaque', 'Sus scrofa': 'boar', 'Acridotheres tristis': 'myna',
  'Malayopython reticulatus': 'python', 'Corvus splendens': 'crow',
  'Varanus salvator': 'monitor', 'Naja sumatrana': 'cobra'
};
const STATE_KEY = {
  'Pulau Pinang': 'penang', 'Kuala Lumpur': 'kl', 'Negeri Sembilan': 'negeri-sembilan',
  Labuan: 'labuan', Putrajaya: 'putrajaya'
};
const stateKey = (s) => STATE_KEY[s] || s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ---- geometry helpers
const round = (n) => Math.round(n * 1000) / 1000;           // about 110 m
function inRing(x, y, ring) { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
function inPoly(x, y, poly) { if (!inRing(x, y, poly[0])) return false; for (let k = 1; k < poly.length; k++) if (inRing(x, y, poly[k])) return false; return true; }
const polysOf = (g) => g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
function ringArea(r) { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return a / 2; }
function centroid(polys) {
  let best = polys[0], bestA = 0;
  for (const p of polys) { const a = Math.abs(ringArea(p[0])); if (a >= bestA) { bestA = a; best = p; } }
  const r = best[0]; let cx = 0, cy = 0, A = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const f = r[j][0] * r[i][1] - r[i][0] * r[j][1]; cx += (r[j][0] + r[i][0]) * f; cy += (r[j][1] + r[i][1]) * f; A += f; }
  return A ? [cx / (3 * A), cy / (3 * A)] : r[0];
}

// ---- states (for district -> state)
const html = fs.readFileSync(HTML, 'utf8');
const s0 = html.indexOf('var ECOSYSTEM_STATES_GEOJSON'); const b0 = html.indexOf('{', s0);
let depth = 0, e0 = b0;
for (let i = b0; i < html.length; i++) { const ch = html[i]; if (ch === '{') depth++; else if (ch === '}') { depth--; if (depth === 0) { e0 = i + 1; break; } } }
const states = JSON.parse(html.slice(b0, e0)).features.map((f) => ({ key: f.properties.stateKey, polys: polysOf(f.geometry) }));
function stateAt(x, y) {
  for (const s of states) for (const p of s.polys) if (inPoly(x, y, p)) return s.key;
  let best = null, bd = Infinity;                           // coastal sliver: nearest state outline vertex
  for (const s of states) for (const p of s.polys) for (const [px, py] of p[0]) { const d = (px - x) ** 2 + (py - y) ** 2; if (d < bd) { bd = d; best = s.key; } }
  return best;
}

// ---- districts
const gj = JSON.parse(fs.readFileSync(GEO, 'utf8'));
const districts = gj.features.map((f) => {
  const polys = polysOf(f.geometry);
  const [cx, cy] = centroid(polys);
  return { name: f.properties.shapeName, id: slug(f.properties.shapeName), polys, state: stateAt(cx, cy) };
});
// Putrajaya has no outline of its own in geoBoundaries (it sits inside Sepang): use the state outline.
const putra = states.find((s) => s.key === 'putrajaya');
if (putra && !districts.some((d) => d.state === 'putrajaya')) districts.push({ name: 'Putrajaya', id: 'putrajaya', polys: putra.polys, state: 'putrajaya' });
const SINGLE = { kl: 'kuala-lumpur', labuan: 'labuan', putrajaya: 'putrajaya', perlis: 'perlis' };
const idx = new Map(districts.map((d, i) => [d.id, i]));
for (const [st, did] of Object.entries(SINGLE)) {
  if (!idx.has(did)) throw new Error('no district for single-district state ' + st);
  districts[idx.get(did)].state = st;
}

// ---- name match
// Names that are also ordinary Malay words are left out of text matching (they still match by coordinates).
const TEXT_SKIP = new Set(['pekan', 'sik', 'yan', 'bera', 'song', 'daro', 'pusa', 'bau', 'matu', 'julau', 'subis', 'selama', 'pakan', 'tatau']);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const variants = (d) => {
  const n = d.name.toLowerCase();
  const out = new Set([n]);
  if (n.startsWith('ulu ')) out.add('hulu ' + n.slice(4));
  if (n === 'kulaijaya') out.add('kulai');
  if (n === 'larut dan matang') { out.add('larut'); out.add('matang'); }
  if (n.startsWith('nabawan')) out.add('nabawan');
  if (n === 'kecil lojing') out.add('lojing');
  return [...out];
};
const nameRules = [];
for (const d of districts) {
  if (TEXT_SKIP.has(d.id)) continue;
  for (const v of variants(d)) nameRules.push({ id: d.id, state: d.state, re: new RegExp('\\b' + esc(v).replace(/\s+/g, '\\s*') + '\\b') });
}

// ---- hand written place names (each tied to a state). Only places whose district is not in doubt.
const ALIASES = [
  ['selangor', 'petaling', ['shah alam', 'petaling jaya', 'subang', 'bukit jelutong', 'kota damansara']],
  ['selangor', 'sepang', ['klia', 'kuala lumpur international airport', 'cyberjaya', 'dengkil']],
  ['selangor', 'klang', ['kapar']],
  ['selangor', 'kuala-selangor', ['tanjung karang', 'batang berjuntai', 'bestari jaya']],
  ['penang', 'timur-laut', ['george town', 'georgetown', 'batu ferringhi', 'gurney', 'jelutong', 'penang botanical', 'tanjung bungah', 'tanjong bungah']],
  ['penang', 'barat-daya', ['bayan lepas', 'balik pulau']],
  ['penang', 'seberang-perai-tengah', ['permatang pauh', 'bukit mertajam']],
  ['penang', 'seberang-perai-utara', ['butterworth', 'bagan ajam']],
  ['penang', 'seberang-perai-selatan', ['nibong tebal', 'pulau burung']],
  ['pahang', 'jerantut', ['kuala tahan']],
  ['johor', 'pontian', ['tanjung piai']],
  ['johor', 'kulaijaya', ['senai']],
  ['johor', 'kota-tinggi', ['panti']],
  ['perak', 'larut-dan-matang', ['taiping']]
];
for (const [st, did, places] of ALIASES) {
  if (!idx.has(did)) throw new Error('alias district missing: ' + did);
  if (districts[idx.get(did)].state !== st) throw new Error(`alias ${did} is in ${districts[idx.get(did)].state}, not ${st}`);
  for (const p of places) nameRules.push({ id: did, state: st, re: new RegExp('\\b' + esc(p).replace(/\s+/g, '\\s*') + '\\b'), alias: true });
}

// ---- place the records
const coordRe = /(-?\d{1,2}\.\d{2,})\s*[,x ]\s*(\d{2,3}\.\d{2,})/;
const v2 = JSON.parse(fs.readFileSync(V2, 'utf8'));
const agg = new Map();
const explain = {};
const by = { single: 0, coords: 0, name: 0, alias: 0, none: 0 };
let total = 0;
for (const r of v2) {
  const code = SPECIES[r.species]; if (!code) throw new Error('unknown species ' + r.species);
  const st = stateKey(r.state_normalised);
  const n = Number(r.count) || 0; if (n <= 0) continue;
  const year = Number(r.year), month = Number(r.month);
  let di = -1, how = 'none';
  if (SINGLE[st]) { di = idx.get(SINGLE[st]); how = 'single'; }
  if (di < 0) {
    const m = coordRe.exec(r.locality || '');
    if (m) {
      const lat = +m[1], lon = +m[2];
      if (lat > 0.5 && lat < 8 && lon > 99 && lon < 120) {
        for (let i = 0; i < districts.length && di < 0; i++) if (districts[i].state === st) for (const p of districts[i].polys) if (inPoly(lon, lat, p)) { di = i; how = 'coords'; break; }
      }
    }
  }
  if (di < 0) {
    const t = (r.locality || '').toLowerCase();
    for (const rule of nameRules) if (rule.state === st && rule.re.test(t)) { di = idx.get(rule.id); how = rule.alias ? 'alias' : 'name'; break; }
  }
  by[how] += n; total += n;
  if (how === 'name' || how === 'alias') { const k = how + ' | ' + r.locality + ' | ' + st + ' -> ' + districts[di].name; explain[k] = (explain[k] || 0) + n; }
  const key = [di, code, year, month, st].join('|');
  agg.set(key, (agg.get(key) || 0) + n);
}
const rows = [...agg.entries()].map(([k, n]) => { const [di, code, y, m, st] = k.split('|'); return [Number(di), code, Number(y), Number(m), n, st]; })
  .sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1]) || a[2] - b[2] || a[3] - b[3]);

const outDistricts = districts.map((d) => [d.id, d.name, d.state, d.polys.map((p) => p.map((ring) => ring.map(([x, y]) => [round(x), round(y)])))]);
const placed = total - by.none;
const meta = {
  generatedBy: 'scripts/build-ecosystem-districts.mjs',
  records: 'public/iteration2_map_aggregated_V2.json',
  outlines: 'geoBoundaries MYS ADM2 (simplified), CC BY 3.0, source citypopulation.de, boundary year 2020',
  totalRecords: total, placedRecords: placed, notPlacedRecords: by.none,
  placedBy: { single: by.single, coords: by.coords, name: by.name, alias: by.alias },
  districtCount: districts.length,
  aliases: ALIASES.map(([st, did, places]) => ({ state: st, district: did, places }))
};
fs.writeFileSync(OUT,
  '// Generated by scripts/build-ecosystem-districts.mjs. Do not edit by hand.\n' +
  'window.ECOSYSTEM_DISTRICTS=' + JSON.stringify({ meta, districts: outDistricts, rows }) + ';\n');
console.log('records', total, 'placed', placed, `(${(placed / total * 100).toFixed(1)}%)`, by);
if (process.argv.includes('--explain')) {
  // the 40 localities placed by name or alias that carry the most records, to check them by eye
  console.log(Object.entries(explain).sort((a, b) => b[1] - a[1]).slice(0, 40).map((e) => e[1] + '  ' + e[0]).join('\n'));
}
console.log('districts', districts.length, 'rows', rows.length, 'bytes', fs.statSync(OUT).size);
const noState = districts.filter((d) => !d.state); console.log('districts without a state:', noState.map((d) => d.name));
const perState = {}; for (const d of districts) perState[d.state] = (perState[d.state] || 0) + 1; console.log(perState);
