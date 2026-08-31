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
fs.writeFileSync(indexPath, html);

console.log('Database-backed About Data migration applied.');
