// AI3-T2: the note check on submit. Runs every note in ai3-t2-notes.json through the Worker's check
// (detectPersonalDetail) and writes the result table. No network, no cost.
//   node tests/ai3/run-ai3-t2.mjs "Your name"
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectPersonalDetail } from '../../src/iteration3-validators.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const set = JSON.parse(fs.readFileSync(path.join(here, 'ai3-t2-notes.json'), 'utf8'));
const runBy = process.argv[2] || 'not named';
const date = new Date().toISOString().slice(0, 10);

const rows = set.notes.map(n => {
  const kind = detectPersonalDetail(n.text);
  return { ...n, held: !!kind, kind: kind || '' };
});
const g = name => rows.filter(r => r.group === name);
const phone = g('phone'), other = g('other'), clean = g('clean');
const phoneHeld = phone.filter(r => r.held).length;
const otherHeld = other.filter(r => r.held).length;
const cleanHeld = clean.filter(r => r.held).length;
const pass = phoneHeld === phone.length && otherHeld >= 9;

let md = `# AI3-T2 result\n\nRun by: ${runBy}. Date: ${date}. Check: detectPersonalDetail (src/iteration3-validators.js).\n\n`;
md += `| Mark | Result | Met |\n|---|---|---|\n`;
md += `| Every note with a telephone number held | ${phoneHeld} of ${phone.length} | ${phoneHeld === phone.length ? 'Yes' : 'No'} |\n`;
md += `| Other identifying notes held, at least 9 of 10 | ${otherHeld} of ${other.length} | ${otherHeld >= 9 ? 'Yes' : 'No'} |\n`;
md += `| Clean notes held by mistake (recorded, no mark) | ${cleanHeld} of ${clean.length} | |\n\n`;
md += `**Result: ${pass ? 'PASS' : 'FAIL'}**\n\n| Id | Group | Note | Held | Matched as |\n|---|---|---|---|---|\n`;
rows.forEach(r => { md += `| ${r.id} | ${r.group} | ${r.text.replace(/\|/g, '/')} | ${r.held ? 'held' : 'not held'} | ${r.kind} |\n`; });

const outDir = path.join(here, 'results');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, `ai3-t2-${date}.md`), md);
fs.writeFileSync(path.join(outDir, `ai3-t2-${date}.json`), JSON.stringify({ run_by: runBy, date, phoneHeld, otherHeld, cleanHeld, pass, rows }, null, 2));
console.log(md);
