import fs from 'node:fs';

const indexPath = 'public/index.html';
let html = fs.readFileSync(indexPath, 'utf8');

const bombaFallback = `function sourceHtml(rows, speciesName) {
    var sources=uniqueSources(rows);
    if(!sources.length && speciesName==='Snake') {
      return '<div><a href="https://www.bomba.gov.my/" target="_blank" rel="noopener" class="text-forest-600 hover:text-forest-800 font-semibold underline underline-offset-2">Source: Bomba public safety advisory ↗</a></div>';
    }
    if(!sources.length) return '<span class="text-slate-400">No database source URL</span>';`;

if (!html.includes("speciesName==='Snake'")) {
  const pattern = /function sourceHtml\(rows\)\s*\{\s*var sources\s*=\s*uniqueSources\(rows\);\s*if\s*\(!sources\.length\)\s*return\s*'<span class="text-slate-400">No database source URL<\/span>';/;
  if (!pattern.test(html)) {
    throw new Error('Could not find current v5 sourceHtml(rows) block in public/index.html');
  }
  html = html.replace(pattern, bombaFallback);
}

html = html.replace(/sourceHtml\(row\.immediate\)(?!\s*,\s*row\.name)/g, 'sourceHtml(row.immediate,row.name)');
html = html.replace(/sourceHtml\(row\.prevention\)(?!\s*,\s*row\.name)/g, 'sourceHtml(row.prevention,row.name)');

if (!html.includes("speciesName==='Snake'")) {
  throw new Error('Snake Bomba fallback was not installed');
}
if (!html.includes('sourceHtml(row.immediate,row.name)') || !html.includes('sourceHtml(row.prevention,row.name)')) {
  throw new Error('Snake species name was not wired into About source rendering');
}

fs.writeFileSync(indexPath, html);
console.log('Installed Snake Bomba fallback directly into About DB source renderer.');
