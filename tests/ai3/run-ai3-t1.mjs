// AI3-T1: Report from your words. Sends each sentence in ai3-t1-sentences.json to POST /api/community/parse,
// three runs, and scores each reply against the expected fill. Calls the language model (about 150 calls).
// Paced at one call every 3.5 s to stay under the route's limit of 20 a minute; a full run takes about 10 minutes.
//   node tests/ai3/run-ai3-t1.mjs "Your name" [base address] [--delay 3300] [--label after-fix] [--set ai3-t1-holdout.json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { I3 } from '../../src/iteration3-validators.js';

const here = path.dirname(fileURLToPath(import.meta.url));

// Options: --delay <ms> (gap between calls, default 3500), --label <text> (added to the result file name).
const argv = process.argv.slice(2); const opt = (k, d) => { const i = argv.indexOf(k); if (i === -1) return d; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const GAP_MS = Number(opt('--delay', 3500)) || 3500;
const label = opt('--label', '');
// --set <file>: another sentence file in the same format, e.g. the held-out set (path from the project root or tests/ai3)
const setFile = opt('--set', 'ai3-t1-sentences.json');
const set = JSON.parse(fs.readFileSync(fs.existsSync(setFile) ? setFile : path.join(here, setFile), 'utf8'));
const runBy = argv[0] || 'not named';
const base = (argv[1] || 'https://roomforboth-final.myee0021.workers.dev').replace(/\/$/, '');
const RUNS = 3;
const FIELDS = ['species', 'kind', 'when', 'time', 'did', 'worked'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const now = new Date();
const myDay = new Date(now.getTime() + 8 * 3600 * 1000).getUTCDay(); // Malaysia time
const yesterday = myDay === 1 ? 'last-week' : 'this-week';
const date = new Date(now.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10);

function asList(v) { return v == null ? [] : Array.isArray(v) ? v : [v]; }
function expected(s, f) { return asList(s.expect?.[f]).map(v => (v === 'YESTERDAY' ? yesterday : v)); }
function accepted(s, f) { return new Set([...expected(s, f), ...asList(s.ok?.[f])]); }

async function parse(text) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(base + '/api/community/parse', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) });
    if (res.status === 429) { await sleep(20000); continue; }
    return { status: res.status, body: await res.json().catch(() => ({})) };
  }
  return { status: 429, body: {} };
}

function score(s, reply) {
  const r = { filled: 0, correct: 0, wrong: 0, saysNothing: 0, invalid: 0, snakeWrong: 0, notes: [] };
  const body = reply.body || {};
  if (s.snake) {
    const anyField = FIELDS.some(f => asList(body[f]).length);
    if (!body.snake) r.notes.push('no snake answer');
    if (body.species) { r.snakeWrong++; r.notes.push('species on a snake sentence: ' + body.species); }
    if (anyField) FIELDS.forEach(f => asList(body[f]).forEach(v => { r.filled++; r.wrong++; r.saysNothing++; r.notes.push(`${f}=${v} on a snake sentence`); }));
    return r;
  }
  if (reply.status !== 200 || body.ok === false) { r.notes.push(`no fill (HTTP ${reply.status}${body.error ? ', ' + body.error : ''})`); return r; }
  for (const f of FIELDS) {
    const got = asList(body[f]);
    const ok = accepted(s, f);
    const silent = !expected(s, f).length && !asList(s.ok?.[f]).length;
    for (const v of got) {
      r.filled++;
      if (!I3[f].has(v)) { r.invalid++; r.wrong++; r.notes.push(`${f}=${v} is not an option`); continue; }
      if (ok.has(v)) { r.correct++; continue; }
      r.wrong++;
      if (silent) { r.saysNothing++; r.notes.push(`${f}=${v} where the sentence says nothing`); }
      else r.notes.push(`${f}=${v}, expected ${[...ok].join(' or ')}`);
    }
  }
  return r;
}

const runs = [];
for (let run = 1; run <= RUNS; run++) {
  const rows = [];
  for (const s of set.sentences) {
    const reply = await parse(s.text);
    rows.push({ id: s.id, text: s.text, reply: reply.body, status: reply.status, ...score(s, reply) });
    process.stdout.write(`run ${run} sentence ${s.id}\r`);
    await sleep(GAP_MS);
  }
  const t = k => rows.reduce((a, r) => a + r[k], 0);
  const sum = { run, filled: t('filled'), correct: t('correct'), wrong: t('wrong'), saysNothing: t('saysNothing'), invalid: t('invalid'), snakeWrong: t('snakeWrong') };
  sum.wrongPer100 = sum.filled ? +(100 * sum.wrong / sum.filled).toFixed(1) : 0;
  sum.pass = sum.wrongPer100 <= 5 && sum.saysNothing === 0 && sum.invalid === 0 && sum.snakeWrong === 0;
  runs.push({ ...sum, rows });
  console.log(`\nrun ${run}: ${sum.wrong} wrong in ${sum.filled} filled (${sum.wrongPer100} per 100), says-nothing ${sum.saysNothing}, invalid ${sum.invalid}, snake ${sum.snakeWrong}, correct ${sum.correct}`);
}

const lowest = runs.slice().sort((a, b) => (a.pass - b.pass) || (b.wrongPer100 - a.wrongPer100) || (b.saysNothing - a.saysNothing))[0];
let md = `# AI3-T1 result\n\nRun by: ${runBy}. Date: ${date} (Malaysia time; "yesterday" counted as ${yesterday}). Address: ${base}. Route: POST /api/community/parse.\n\n`;
md += `| Run | Filled fields | Wrong | Wrong per 100 | Filled where the sentence says nothing | Invalid values | Species on a snake sentence | Correct | Pass |\n|---|---|---|---|---|---|---|---|---|\n`;
runs.forEach(r => { md += `| ${r.run} | ${r.filled} | ${r.wrong} | ${r.wrongPer100} | ${r.saysNothing} | ${r.invalid} | ${r.snakeWrong} | ${r.correct} | ${r.pass ? 'Yes' : 'No'} |\n`; });
md += `\nRecorded (lowest) run: **${lowest.run}**, ${lowest.wrong} wrong in ${lowest.filled} filled fields (${lowest.wrongPer100} per 100), ${lowest.saysNothing} filled where the sentence says nothing. **Result: ${lowest.pass ? 'PASS' : 'FAIL'}**\n\n`;
md += `## Wrong fills, every run\n\n| Run | Id | Sentence | What was wrong |\n|---|---|---|---|\n`;
runs.forEach(r => r.rows.filter(x => x.notes.length).forEach(x => { md += `| ${r.run} | ${x.id} | ${x.text.replace(/\|/g, '/')} | ${x.notes.join('; ')} |\n`; }));
const outDir = path.join(here, 'results');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, `ai3-t1-${date}${label ? '-' + label : ''}.md`), md);
fs.writeFileSync(path.join(outDir, `ai3-t1-${date}${label ? '-' + label : ''}.json`), JSON.stringify({ run_by: runBy, date, base, yesterday, recorded_run: lowest.run, pass: lowest.pass, runs }, null, 2));
console.log('\n' + md);
