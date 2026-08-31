import fs from 'node:fs';

const workerPath = 'src/worker.js';
const indexPath = 'public/index.html';
const apiPath = 'public/api-data.js';

let worker = fs.readFileSync(workerPath, 'utf8');
let html = fs.readFileSync(indexPath, 'utf8');
let api = fs.readFileSync(apiPath, 'utf8');

// Keep About > Spine datasets static: only GBIF + MyBIS.
worker = worker.replace('<script src="/data-sources.js" defer></script>', '');

const staticSpineBody = `<tbody class="divide-y divide-slate-100">
          <tr>
            <td class="py-4 pr-4 font-display font-bold text-forest-950 whitespace-nowrap">GBIF occurrence records</td>
            <td class="py-4 pr-4 text-slate-600"><span data-en>Which species occur, aggregated to state level</span><span data-bm>Spesies yang wujud, digabung mengikut negeri</span></td>
            <td class="py-4 pr-4"><span class="rounded-full bg-emerald-50 text-forest-700 text-[11px] font-bold px-2.5 py-0.5 border border-emerald-200 whitespace-nowrap">CC BY 4.0 / CC0</span></td>
            <td class="py-4"><a href="https://gbif.org" target="_blank" rel="noopener" class="text-forest-600 hover:text-forest-800 font-semibold inline-flex items-center gap-1">gbif.org ↗</a></td>
          </tr>
          <tr>
            <td class="py-4 pr-4 font-display font-bold text-forest-950 whitespace-nowrap">MyBIS</td>
            <td class="py-4 pr-4 text-slate-600"><span data-en>Malay and English names, protected status</span><span data-bm>Nama Melayu dan Inggeris, status dilindungi</span></td>
            <td class="py-4 pr-4"><span class="rounded-full bg-amber-50 text-amber-700 text-[11px] font-bold px-2.5 py-0.5 border border-amber-200 whitespace-nowrap"><span data-en>Non-commercial</span><span data-bm>Bukan komersial</span></span></td>
            <td class="py-4"><a href="https://mybis.gov.my" target="_blank" rel="noopener" class="text-forest-600 hover:text-forest-800 font-semibold inline-flex items-center gap-1">mybis.gov.my ↗</a></td>
          </tr>
        </tbody>`;
html = html.replace(/<tbody id="about_database_sources"[^>]*>[\s\S]*?<\/tbody>/, staticSpineBody);

// Remove duplicate Step 0 badge if still present.
html = html.replace(/\n\s*\/\/ ---- Step 0 — snake safety gate ----[\s\S]*?gateInner\.insertBefore\(snakeStepLabel, gateInner\.firstChild\);\n\s*\}/, '');

// Snake visual/source consistency.
html = html.replace(
  `    if (s.id === 'snake') {\n      iconBox.innerHTML = ICONS.alert;`,
  `    if (s.id === 'snake') {\n      iconBox.innerHTML = '<img src="/assets/naja-sumatrana.jpg" alt="Snake" class="w-full h-full object-cover">';`
);

// Home Snake must use dedicated route.
html = html.replace(
  `      warning.classList.add('hidden');\n      goTo('whattodo', { id: animalVal, state: stateVal });`,
  `      warning.classList.add('hidden');\n      if (animalVal === 'snake') {\n        APP.speciesId = 'snake';\n        APP.stateId = stateVal;\n        goTo('snakewhattodo');\n        return;\n      }\n      goTo('whattodo', { id: animalVal, state: stateVal });`
);

// Ensure About's static render is always followed by the database source table.
if (!html.includes('ABOUT_DB_SOURCE_REFRESH_V4')) {
  const aboutEndAnchor = `  setAboutPhotoSourceTab('species');\n  setLang(localStorage.getItem('owm-lang') || 'en');\n}\n</script>`;
  const aboutEndReplacement = `  setAboutPhotoSourceTab('species');\n  setLang(localStorage.getItem('owm-lang') || 'en');\n\n  /* ABOUT_DB_SOURCE_REFRESH_V4 */\n  if (window.RoomForBothDB && window.RoomForBothDB.renderActionSourcesFromDb) {\n    Promise.resolve(window.RoomForBothDB.ready).then(function () {\n      return window.RoomForBothDB.renderActionSourcesFromDb();\n    }).catch(function (err) {\n      console.warn('[RoomForBoth] About source refresh failed', err && err.message ? err.message : err);\n    });\n  }\n}\n</script>`;
  html = html.replace(aboutEndAnchor, aboutEndReplacement);
}

// ---------------- API-DATA SOURCE LINK NORMALISATION ----------------
// What to do now: direct to each database row's real source_url.
api = api.replace(
  `(source ? '<a href="#" onclick="goTo(\\'about\\');return false;" class="mt-1 inline-block text-[11px] text-slate-400 hover:text-forest-700 underline underline-offset-2">' + escapeHtml(source) + '</a>' : '')`,
  `(source ? (visibleText(row.source_url)\n            ? '<a href="' + escapeHtml(visibleText(row.source_url)) + '" target="_blank" rel="noopener" class="mt-1 inline-block text-[11px] text-slate-400 hover:text-forest-700 underline underline-offset-2">' + escapeHtml(source) + ' ↗</a>'\n            : '<span class="mt-1 inline-block text-[11px] text-slate-400">' + escapeHtml(source) + '</span>') : '')`
);

// Prevention: attach each row's own database source link directly beneath
// the recommendation, instead of only exposing the first source at the end.
if (!api.includes('PREVENTION_ROW_SOURCE_V4')) {
  api = api.replace(
    `(tags ? '<div class="mt-1.5 flex flex-wrap gap-1.5">' + tags + '</div>' : '') +\n            '</div></div>';`,
    `(tags ? '<div class="mt-1.5 flex flex-wrap gap-1.5">' + tags + '</div>' : '') +\n            /* PREVENTION_ROW_SOURCE_V4 */\n            '<div class="mt-1.5">' + sourceLinkHtml(row) + '</div>' +\n            '</div></div>';`
  );
}

// Prevention summary footer: list every distinct source, not results[0].
api = api.replace(
  `        var firstSource = usable.map(sourceLabel).filter(Boolean)[0] || '';\n        if (source) {\n          if (firstSource) {\n            source.textContent = firstSource;\n            source.classList.remove('hidden');\n          } else {\n            source.textContent = '';\n            source.classList.add('hidden');\n          }\n        }`,
  `        if (source) {\n          var preventionSourceHtml = sourceLinksHtml(usable);\n          source.innerHTML = preventionSourceHtml;\n          source.classList.toggle('hidden', !uniqueSourceRows(usable).length);\n        }`
);

// About table already requests every immediate/prevention row. De-duplicate
// by the real source identity so several actions from one URL show once,
// while multiple institutions/URLs for one species all remain visible.
api = api.replace(
  `      var key = [\n        visibleText(row.source_url),\n        visibleText(row.source_institution),\n        visibleText(row.source_person),\n        visibleText(row.date_verified)\n      ].join('|');`,
  `      var key = [\n        visibleText(row.source_url),\n        visibleText(row.source_institution),\n        visibleText(row.source_person)\n      ].join('|');`
);

// Make source links visually obvious and always direct when source_url exists.
api = api.replace(
  `return '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener" class="text-forest-600 hover:text-forest-800 font-semibold inline-flex items-start gap-1">' +`,
  `return '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener" class="text-forest-600 hover:text-forest-800 font-semibold inline-flex items-start gap-1 underline underline-offset-2">' +`
);

fs.writeFileSync(workerPath, worker);
fs.writeFileSync(indexPath, html);
fs.writeFileSync(apiPath, api);
console.log('Applied full database source-link rendering for immediate actions, prevention, and About Data.');
