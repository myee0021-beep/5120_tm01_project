import fs from 'node:fs';

function mustReplace(text, from, to, label) {
  if (text.includes(to)) return text;
  if (!text.includes(from)) throw new Error('Anchor not found for ' + label);
  return text.replace(from, to);
}

// 1) Backend: add /api/data-sources and inject its renderer script.
const workerPath = 'src/worker.js';
let worker = fs.readFileSync(workerPath, 'utf8');

const apiAnchor = "    if (url.pathname === '/api/tables') {";
const apiBlock = `    if (url.pathname === '/api/data-sources') {
      const rows = await sql\`
        SELECT
          'species_behaviour'::text AS source_table,
          behaviour_id::int AS record_id,
          sb.species_id::int AS species_id,
          s.english_name::text AS species_name,
          s.category_id::int AS category_id,
          c.category_name::text AS category_name,
          NULL::text AS jurisdiction,
          sb.source_person::text AS source_person,
          sb.source_institution::text AS source_institution,
          sb.source_url::text AS source_url,
          sb.date_verified::text AS date_verified
        FROM species_behaviour sb
        LEFT JOIN species s ON s.species_id = sb.species_id
        LEFT JOIN animal_category c ON c.category_id = s.category_id
        WHERE COALESCE(NULLIF(BTRIM(sb.source_person), ''), NULLIF(BTRIM(sb.source_institution), ''), NULLIF(BTRIM(sb.source_url), '')) IS NOT NULL

        UNION ALL

        SELECT
          'immediate_action'::text,
          ia.action_id::int,
          ia.species_id::int,
          s.english_name::text,
          ia.category_id::int,
          c.category_name::text,
          NULL::text,
          ia.source_person::text,
          ia.source_institution::text,
          ia.source_url::text,
          ia.date_verified::text
        FROM immediate_action ia
        LEFT JOIN species s ON s.species_id = ia.species_id
        LEFT JOIN animal_category c ON c.category_id = ia.category_id
        WHERE COALESCE(NULLIF(BTRIM(ia.source_person), ''), NULLIF(BTRIM(ia.source_institution), ''), NULLIF(BTRIM(ia.source_url), '')) IS NOT NULL

        UNION ALL

        SELECT
          'prevention_action'::text,
          pa.prevention_id::int,
          pa.species_id::int,
          s.english_name::text,
          pa.category_id::int,
          c.category_name::text,
          NULL::text,
          pa.source_person::text,
          pa.source_institution::text,
          pa.source_url::text,
          pa.date_verified::text
        FROM prevention_action pa
        LEFT JOIN species s ON s.species_id = pa.species_id
        LEFT JOIN animal_category c ON c.category_id = pa.category_id
        WHERE COALESCE(NULLIF(BTRIM(pa.source_person), ''), NULLIF(BTRIM(pa.source_institution), ''), NULLIF(BTRIM(pa.source_url), '')) IS NOT NULL

        UNION ALL

        SELECT
          'authority'::text,
          a.authority_id::int,
          NULL::int,
          NULL::text,
          a.category_id::int,
          c.category_name::text,
          a.jurisdiction::text,
          NULL::text,
          a.agency_name::text,
          a.source_url::text,
          a.last_verified::text
        FROM authority a
        LEFT JOIN animal_category c ON c.category_id = a.category_id
        WHERE COALESCE(NULLIF(BTRIM(a.agency_name), ''), NULLIF(BTRIM(a.source_url), '')) IS NOT NULL

        ORDER BY source_table, record_id
      \`;

      const sources = rows.filter((row) => {
        const values = [row.source_person, row.source_institution, row.source_url];
        return values.some((value) => value && !['NA', 'N/A'].includes(String(value).trim().toUpperCase()));
      });

      return json({
        ok: true,
        count: sources.length,
        generated_from: ['species_behaviour', 'immediate_action', 'prevention_action', 'authority'],
        sources,
      });
    }

${apiAnchor}`;
worker = mustReplace(worker, apiAnchor, apiBlock, 'data-sources route');

const injectorOld = "'<script src=\"/api-data.js\" defer></script><script src=\"/snake-thumbnail.js\" defer></script>',";
const injectorNew = "'<script src=\"/api-data.js\" defer></script><script src=\"/data-sources.js\" defer></script><script src=\"/snake-thumbnail.js\" defer></script>',";
worker = mustReplace(worker, injectorOld, injectorNew, 'data-sources script injection');
fs.writeFileSync(workerPath, worker);

// 2) Frontend: remove the static source rows from About the Data.
const indexPath = 'public/index.html';
let html = fs.readFileSync(indexPath, 'utf8');
if (!html.includes('id="about_database_sources"')) {
  const marker = '<!-- ===================== SPINE DATASETS TABLE ===================== -->';
  const markerPos = html.indexOf(marker);
  if (markerPos < 0) throw new Error('About Data spine table marker not found');
  const tbodyStart = html.indexOf('<tbody', markerPos);
  const tbodyOpenEnd = html.indexOf('>', tbodyStart);
  const tbodyEnd = html.indexOf('</tbody>', tbodyOpenEnd);
  if (tbodyStart < 0 || tbodyOpenEnd < 0 || tbodyEnd < 0) throw new Error('About Data tbody not found');
  html = html.slice(0, tbodyStart) +
    '<tbody id="about_database_sources" data-database-sources class="divide-y divide-slate-100">\n' +
    '  <tr><td colspan="4" class="py-6 text-sm text-slate-500">Loading verified database sources…</td></tr>\n' +
    '</tbody>' +
    html.slice(tbodyEnd + '</tbody>'.length);
}

// 3) What-to-do page: install a self-contained live DB renderer directly in
// index.html. This removes reliance on the external api-data.js hook for the
// critical immediate_action list, so SPA navigation cannot leave stale
// embedded safetySteps on screen.
if (!html.includes('id="db-immediate-actions-inline-v3"')) {
  const liveRenderer = String.raw`
<script id="db-immediate-actions-inline-v3">
(function () {
  'use strict';

  var ROUTE_TO_DB_ID = {
    'macaque': 1,
    'wild-boar': 2,
    'boar': 2,
    'common-myna': 3,
    'myna': 3,
    'python': 4,
    'reticulated-python': 4,
    'house-crow': 5,
    'crow': 5,
    'water-monitor': 6,
    'monitor': 6,
    'spitting-cobra': 7,
    'cobra': 7
  };

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function clean(v) {
    var t = String(v == null ? '' : v).trim();
    if (!t || /^(NA|N\/A)$/i.test(t)) return '';
    return t;
  }

  function currentDbSpeciesId() {
    var route = '';
    try { route = String((window.APP && window.APP.speciesId) || '').trim().toLowerCase(); } catch (e) {}
    if (ROUTE_TO_DB_ID[route]) return ROUTE_TO_DB_ID[route];
    if (window.RoomForBothDB && typeof window.RoomForBothDB.resolveSpeciesId === 'function') {
      var resolved = window.RoomForBothDB.resolveSpeciesId(route);
      if (resolved) return Number(resolved);
    }
    return null;
  }

  function sourceHtml(row) {
    var institution = clean(row.source_institution) || clean(row.source_person);
    var verified = clean(row.date_verified);
    var url = clean(row.source_url);
    var label = institution ? 'Source: ' + institution : 'Source';
    if (verified) label += ', verified ' + verified;
    if (!url) return '<span class="mt-1 inline-block text-[11px] text-slate-400">' + esc(label) + '</span>';
    return '<a href="' + esc(url) + '" target="_blank" rel="noopener" class="mt-1 inline-block text-[11px] text-slate-400 hover:text-forest-700 underline underline-offset-2">' + esc(label) + '</a>';
  }

  function renderRows(rows, list) {
    list.innerHTML = rows.map(function (row, index) {
      var en = clean(row.action_text_en);
      var bm = clean(row.action_text_ms);
      var step = Number(row.step_order) > 0 ? Number(row.step_order) : index + 1;
      return '<div class="rounded-xl border border-rose-200 bg-white px-4 py-3.5 border-l-4 border-l-rose-500">' +
        '<div class="flex gap-3">' +
          '<span class="shrink-0 w-6 h-6 rounded-full bg-rose-600 text-white text-xs font-bold flex items-center justify-center">' + step + '</span>' +
          '<div class="min-w-0">' +
            '<p class="text-sm font-semibold text-slate-700 leading-relaxed">' +
              (en ? '<span data-en>' + esc(en) + '</span>' : '') +
              (bm ? '<span data-bm>' + esc(bm) + '</span>' : '') +
            '</p>' +
            sourceHtml(row) +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
    list.setAttribute('data-source', 'neon:immediate_action:inline-v3');
    if (typeof window.setLang === 'function') {
      window.setLang(localStorage.getItem('owm-lang') || 'en');
    }
  }

  function refreshImmediateActions() {
    var page = '';
    try { page = String((window.APP && window.APP.currentPage) || ''); } catch (e) {}
    if (page !== 'whattodo') return Promise.resolve(false);

    var speciesId = currentDbSpeciesId();
    var list = document.getElementById('wtd_safetyList');
    if (!speciesId || !list) return Promise.resolve(false);

    var token = String(speciesId) + ':' + Date.now();
    list.setAttribute('data-db-request-token', token);

    return fetch('/api/immediate-actions?species_id=' + encodeURIComponent(speciesId), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function (payload) {
      if (list.getAttribute('data-db-request-token') !== token) return false;
      var rows = (payload && payload.actions || []).filter(function (row) {
        return clean(row.action_text_en) || clean(row.action_text_ms);
      });
      if (!rows.length) return false;
      renderRows(rows, list);
      return true;
    }).catch(function (err) {
      console.warn('[RoomForBoth] live immediate_action render failed', err && err.message ? err.message : err);
      return false;
    });
  }

  function scheduleRefresh() {
    setTimeout(refreshImmediateActions, 0);
    setTimeout(refreshImmediateActions, 80);
    setTimeout(refreshImmediateActions, 250);
  }

  function install() {
    if (typeof window.goTo === 'function' && !window.goTo.__liveImmediateV3) {
      var originalGoTo = window.goTo;
      window.goTo = function () {
        var result = originalGoTo.apply(this, arguments);
        scheduleRefresh();
        return result;
      };
      window.goTo.__liveImmediateV3 = true;
    }
    scheduleRefresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
  window.addEventListener('roomforboth:db-ready', scheduleRefresh);
})();
</script>`;

  if (!html.includes('</body>')) throw new Error('Closing body tag not found');
  html = html.replace('</body>', liveRenderer + '\n</body>');
}

fs.writeFileSync(indexPath, html);

console.log('Database-backed About Data + live immediate_action rendering applied.');
