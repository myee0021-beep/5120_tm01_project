import fs from 'node:fs';

const workerPath = 'src/worker.js';
const indexPath = 'public/index.html';
const apiPath = 'public/api-data.js';

let worker = fs.readFileSync(workerPath, 'utf8');
let html = fs.readFileSync(indexPath, 'utf8');
let api = fs.readFileSync(apiPath, 'utf8');

worker = worker.replace('<script src="/data-sources.js" defer></script>', '');

// Critical fix: render_about() used to repaint the action/prevention source
// table from static SPECIES.safetySource/checklistSource every time About was
// opened. Remove that entire fallback so the inline v5 database renderer is
// the only owner of #about_actionSourceBody.
html = html.replace(
  /\n\s*\/\/ AC-driven fix: this table used to show SPECIES\.safetySource \/[\s\S]*?\n\s*if \(actionBody\) \{[\s\S]*?\n\s*\}\n(?=\})/,
  '\n'
);

// What to do now: each database row links directly to its own source_url.
api = api.replace(
  `(source ? '<a href="#" onclick="goTo(\\'about\\');return false;" class="mt-1 inline-block text-[11px] text-slate-400 hover:text-forest-700 underline underline-offset-2">' + escapeHtml(source) + '</a>' : '')`,
  `(source ? (visibleText(row.source_url)\n            ? '<a href="' + escapeHtml(visibleText(row.source_url)) + '" target="_blank" rel="noopener" class="mt-1 inline-block text-[11px] text-slate-400 hover:text-forest-700 underline underline-offset-2">' + escapeHtml(source) + ' ↗</a>'\n            : '<span class="mt-1 inline-block text-[11px] text-slate-400">' + escapeHtml(source) + '</span>') : '')`
);

// Prevention: each database row shows its own source underneath.
if (!api.includes('PREVENTION_ROW_SOURCE_V4')) {
  api = api.replace(
    `(tags ? '<div class="mt-1.5 flex flex-wrap gap-1.5">' + tags + '</div>' : '') +\n            '</div></div>';`,
    `(tags ? '<div class="mt-1.5 flex flex-wrap gap-1.5">' + tags + '</div>' : '') +\n            /* PREVENTION_ROW_SOURCE_V4 */\n            '<div class="mt-1.5">' + sourceLinkHtml(row) + '</div>' +\n            '</div></div>';`
  );
}

// Prevention footer: list all distinct sources.
api = api.replace(
  `        var firstSource = usable.map(sourceLabel).filter(Boolean)[0] || '';\n        if (source) {\n          if (firstSource) {\n            source.textContent = firstSource;\n            source.classList.remove('hidden');\n          } else {\n            source.textContent = '';\n            source.classList.add('hidden');\n          }\n        }`,
  `        if (source) {\n          var preventionSourceHtml = sourceLinksHtml(usable);\n          source.innerHTML = preventionSourceHtml;\n          source.classList.toggle('hidden', !uniqueSourceRows(usable).length);\n        }`
);

api = api.replace(
  `      var key = [\n        visibleText(row.source_url),\n        visibleText(row.source_institution),\n        visibleText(row.source_person),\n        visibleText(row.date_verified)\n      ].join('|');`,
  `      var key = [\n        visibleText(row.source_url),\n        visibleText(row.source_institution),\n        visibleText(row.source_person)\n      ].join('|');`
);

// Install the inline About database renderer if it is not already present.
if (!html.includes('id="about-db-sources-inline-v5"')) {
  const inline = String.raw`
<script id="about-db-sources-inline-v5">
(function () {
  'use strict';
  var ABOUT_SPECIES = [
    { name: 'House Crow', id: 5 },
    { name: 'Long-tailed Macaque', id: 1 },
    { name: 'Water Monitor Lizard', id: 6 },
    { name: 'Wild Boar', id: 2 },
    { name: 'Snake', id: 7 },
    { name: 'Common Myna', id: 3 }
  ];
  function esc(v) { return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
  function clean(v) { var t=String(v==null?'':v).trim(); return (!t || /^(NA|N\/A)$/i.test(t)) ? '' : t; }
  function getJson(url) { return fetch(url,{headers:{Accept:'application/json'},cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); }); }
  function uniqueSources(rows) {
    var seen={};
    return (rows||[]).filter(function(row){
      var url=clean(row&&row.source_url), inst=clean(row&&row.source_institution), person=clean(row&&row.source_person);
      if(!url&&!inst&&!person) return false;
      var key=[url,inst,person].join('|');
      if(seen[key]) return false; seen[key]=true; return true;
    });
  }
  function sourceHtml(rows) {
    var sources=uniqueSources(rows);
    if(!sources.length) return '<span class="text-slate-400">No database source URL</span>';
    return '<div class="space-y-2">'+sources.map(function(row){
      var inst=clean(row.source_institution)||clean(row.source_person)||'Source';
      var verified=clean(row.date_verified), url=clean(row.source_url);
      var label='Source: '+inst+(verified?', verified '+verified:'');
      return url ? '<div><a href="'+esc(url)+'" target="_blank" rel="noopener" class="text-forest-600 hover:text-forest-800 font-semibold underline underline-offset-2">'+esc(label)+' ↗</a></div>' : '<div class="text-slate-500">'+esc(label)+'</div>';
    }).join('')+'</div>';
  }
  function renderAboutDbSourcesV5() {
    var body=document.getElementById('about_actionSourceBody');
    if(!body) return Promise.resolve(false);
    body.innerHTML='<tr><td colspan="3" class="py-5 text-slate-500">Loading database source links…</td></tr>';
    return Promise.all(ABOUT_SPECIES.map(function(sp){
      return Promise.all([
        getJson('/api/immediate-actions?species_id='+sp.id),
        getJson('/api/prevention-actions?species_id='+sp.id)
      ]).then(function(result){ return {name:sp.name, immediate:(result[0]&&result[0].actions)||[], prevention:(result[1]&&result[1].actions)||[]}; })
        .catch(function(){ return {name:sp.name, immediate:[], prevention:[]}; });
    })).then(function(rows){
      body.innerHTML=rows.map(function(row){ return '<tr class="align-top"><td class="py-4 pr-5 font-display font-bold text-forest-950">'+esc(row.name)+'</td><td class="py-4 pr-5 text-sm">'+sourceHtml(row.immediate)+'</td><td class="py-4 text-sm">'+sourceHtml(row.prevention)+'</td></tr>'; }).join('');
      body.setAttribute('data-source','database:inline-v5');
      return true;
    });
  }
  window.renderAboutDbSourcesV5=renderAboutDbSourcesV5;
  function install(){
    if(typeof window.render_about==='function'&&!window.render_about.__dbSourcesV5){
      var original=window.render_about;
      window.render_about=function(){ var result=original.apply(this,arguments); setTimeout(renderAboutDbSourcesV5,0); return result; };
      window.render_about.__dbSourcesV5=true;
    }
    var current=''; try{current=(window.APP&&window.APP.currentPage)||'';}catch(e){}
    if(current==='about') setTimeout(renderAboutDbSourcesV5,0);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
})();
</script>`;
  html = html.replace('</body>', inline + '\n</body>');
}

// Update About explanatory copy to match direct-link behaviour.
html = html.replace(
  /Every "Source" note under an immediate-safety step or a prevention recommendation links here first,\s*\n?\s*rather than to an external page directly\./,
  'Database source links for every immediate-safety and prevention record are listed below. Each link opens the original external source directly.'
);

fs.writeFileSync(workerPath, worker);
fs.writeFileSync(indexPath, html);
fs.writeFileSync(apiPath, api);
console.log('Removed static About source fallback; database renderer v5 is now sole owner.');
