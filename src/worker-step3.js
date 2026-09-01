import baseWorker from './worker.js';

const STATE_ID_BY_NAME = {
  'Johor': 'johor',
  'Kedah': 'kedah',
  'Kelantan': 'kelantan',
  'Melaka': 'melaka',
  'Negeri Sembilan': 'negeri-sembilan',
  'Pahang': 'pahang',
  'Perak': 'perak',
  'Perlis': 'perlis',
  'Pulau Pinang': 'penang',
  'Sabah': 'sabah',
  'Sarawak': 'sarawak',
  'Selangor': 'selangor',
  'Terengganu': 'terengganu',
  'Kuala Lumpur': 'kl',
  'Putrajaya': 'putrajaya',
  'Labuan': 'labuan',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function stateValue(name) {
  return STATE_ID_BY_NAME[name] || String(name || '').trim().toLowerCase().replace(/\s+/g, '-');
}

async function buildStateOptions(request, env, ctx) {
  try {
    const apiUrl = new URL('/api/states', request.url);
    const apiRequest = new Request(apiUrl.toString(), {
      method: 'GET',
      headers: { accept: 'application/json' },
    });
    const apiResponse = await baseWorker.fetch(apiRequest, env, ctx);
    if (!apiResponse.ok) return null;

    const payload = await apiResponse.json();
    const states = Array.isArray(payload?.states) ? payload.states : [];
    if (!states.length) return null;

    const rows = states.map((row) => {
      const name = String(row.state_name || '').trim();
      if (!name) return '';
      return `            <option value="${escapeHtml(stateValue(name))}" data-state-code="${escapeHtml(row.state_code)}" data-jurisdiction-type="${escapeHtml(row.jurisdiction_type)}">${escapeHtml(name)}</option>`;
    }).filter(Boolean).join('\n');

    return [
      '            <option value="" data-en>Select state…</option>',
      '            <option value="" data-bm>Pilih negeri…</option>',
      rows,
    ].join('\n');
  } catch (error) {
    console.warn('[Room for Both] Failed to build home state options from /api/states', error?.message || error);
    return null;
  }
}

export default {
  async fetch(request, env, ctx) {
    const response = await baseWorker.fetch(request, env, ctx);
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('text/html')) return response;

    const html = await response.text();
    const stateOptions = await buildStateOptions(request, env, ctx);

    let updatedHtml = html
      .replace(/Step 2 · Authority (?:&amp;|&) Contact/g, 'Step 3 · Authority &amp; Contact')
      .replace(/Langkah 2 · Agensi (?:&amp;|&) Hubungan/g, 'Langkah 3 · Agensi &amp; Hubungan');

    if (stateOptions) {
      updatedHtml = updatedHtml.replace(
        /(<select\s+id="home_stateSelect"[^>]*>)[\s\S]*?(<\/select>)/i,
        `$1\n${stateOptions}\n          $2`
      );
    }

    updatedHtml = updatedHtml.replace(/<\/body>/i, '<script src="/iteration1-fixes.js"></script></body>');

    const headers = new Headers(response.headers);
    headers.delete('content-length');

    return new Response(updatedHtml, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
