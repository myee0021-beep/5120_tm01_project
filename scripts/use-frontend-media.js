const fs = require('fs');
const cp = require('child_process');

const historicalCommit = 'e65f662c1713e238c11235c183871de6ed366236';
const routes = ['house-crow', 'macaque', 'water-monitor', 'wild-boar', 'common-myna'];

const oldHtml = cp.execFileSync('git', ['show', `${historicalCommit}:public/index.html`], {
  encoding: 'utf8',
  maxBuffer: 80 * 1024 * 1024,
});

function extractPhoto(id) {
  const startToken = `id: '${id}'`;
  const start = oldHtml.indexOf(startToken);
  if (start < 0) throw new Error(`Historical species not found: ${id}`);
  const next = oldHtml.indexOf("\n  {\n    id: '", start + startToken.length);
  const end = next >= 0 ? next : oldHtml.indexOf('\n];', start);
  const block = oldHtml.slice(start, end >= 0 ? end : start + 2_000_000);
  const dataUri = block.match(/dataUri:\s*'([^']+)'/);
  const creditEn = block.match(/creditEn:\s*'([^']*)'/);
  const creditBm = block.match(/creditBm:\s*'([^']*)'/);
  const sourceUrl = block.match(/sourceUrl:\s*'([^']+)'/);
  if (!dataUri) throw new Error(`Historical photo not found: ${id}`);
  return {
    dataUri: dataUri[1],
    creditEn: creditEn ? creditEn[1] : 'Frontend presentation photo.',
    creditBm: creditBm ? creditBm[1] : 'Foto persembahan bahagian hadapan.',
    sourceUrl: sourceUrl ? sourceUrl[1] : '',
  };
}

const media = {};
for (const id of routes) media[id] = extractPhoto(id);

const mediaJs = `// Presentation media only.\n// Business data is loaded from Neon; these static images intentionally remain frontend assets.\nwindow.FRONTEND_SPECIES_MEDIA = ${JSON.stringify(media, null, 2)};\n`;
fs.writeFileSync('public/frontend-media.js', mediaJs);

let api = fs.readFileSync('public/api-data.js', 'utf8');

// Species records still come from Neon. Only the visual photo is resolved from the frontend media map.
api = api.replace(
  /\s*var mediaRows = cache\.mediaBySpecies\[Number\(row\.species_id\)\] \|\| \[\];\n/,
  `\n    var frontendPhoto = (window.FRONTEND_SPECIES_MEDIA || {})[routeForSpecies(row)] || null;\n`
);
api = api.replace(/photo:\s*mediaToPhoto\(mediaRows\[0\]\),/, 'photo: frontendPhoto,');

// Do not call species_media while loading the UI. The table remains available through the read-only API for diagnostics.
api = api.replace(
  /\n\s*return Promise\.all\(cache\.species\.map\(function \(row\) \{[\s\S]*?cache\.mediaBySpecies\[Number\(row\.species_id\)\] = \[\]; \}\);\n\s*\}\)\);/,
  '\n        return null;'
);

const aboutStart = api.indexOf('  function renderAboutFromDb() {');
const hooksStart = api.indexOf('  function installRenderHooks()', aboutStart);
if (aboutStart >= 0 && hooksStart > aboutStart) {
  const replacement = `  function renderAboutFromDb() {\n    var photoList = document.getElementById('about_photoList');\n    if (!photoList) return;\n    var frontendMedia = window.FRONTEND_SPECIES_MEDIA || {};\n    var rows = cache.species\n      .filter(function (sp) { return sp.is_snake !== true; })\n      .map(function (sp) { return { sp: sp, photo: frontendMedia[routeForSpecies(sp)] || null }; })\n      .filter(function (item) { return item.photo && item.photo.dataUri; });\n    photoList.innerHTML = rows.length ? rows.map(function (item) {\n      return '<div class="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">' +\n        '<div class="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-white"><img src="' + esc(item.photo.dataUri) + '" alt="" class="w-full h-full object-cover"></div>' +\n        '<div class="min-w-0 flex-1"><div class="font-display font-bold text-sm text-slate-900">' + esc(text(item.sp.english_name)) + '</div>' +\n        '<div class="text-xs text-slate-500 mt-0.5">' + esc(item.photo.creditEn || 'Frontend presentation photo.') + '</div></div>' +\n        (item.photo.sourceUrl ? '<a href="' + esc(item.photo.sourceUrl) + '" target="_blank" rel="noopener" class="shrink-0 text-forest-600 hover:text-forest-800 text-xs font-bold">View source ↗</a>' : '') +\n        '</div>';\n    }).join('') : dbEmptyHtml('No frontend presentation photos are configured.');\n    photoList.setAttribute('data-source', 'frontend:static-media');\n  }\n\n`;
  api = api.slice(0, aboutStart) + replacement + api.slice(hooksStart);
}

if (!api.includes('photo: frontendPhoto,')) throw new Error('Failed to switch species photo to frontend media');
fs.writeFileSync('public/api-data.js', api);

let html = fs.readFileSync('public/index.html', 'utf8');
if (!html.includes('/frontend-media.js')) {
  html = html.replace('<script src="/api-data.js"></script>', '<script src="/frontend-media.js"></script>\n<script src="/api-data.js"></script>');
}
fs.writeFileSync('public/index.html', html);

console.log('Frontend photos restored; Neon remains the source for non-media business data.');
