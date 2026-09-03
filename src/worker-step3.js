import baseWorker from './worker.js';

const FUZZY_DESCRIBE_SPECIES = [
  { id: 'house-crow', en: 'House Crow', bm: 'Gagak Rumah', hints: 'black bird, feathers, wings, noisy calls, rubbish or food waste, roof or tree nest' },
  { id: 'macaque', en: 'Long-tailed Macaque', bm: 'Kera', hints: 'furry mammal, four legs plus grasping hands, long tail, monkey-like, troop, climbs roofs or trees, takes food' },
  { id: 'water-monitor', en: 'Water Monitor Lizard', bm: 'Biawak', hints: 'large four-legged reptile, scales, long tail, low to the ground, drain, canal, pond or river' },
  { id: 'wild-boar', en: 'Wild Boar', bm: 'Babi Hutan', hints: 'furry or bristly four-legged mammal, pig-like body or snout, large, roots or digs soil, garden damage, often at night' },
  { id: 'common-myna', en: 'Common Myna', bm: 'Gembala Kerbau', hints: 'small brown bird, feathers, wings, yellow beak, noisy calls, roof eaves or cavities' },
];

const FUZZY_ALLOWED_IDS = new Set(FUZZY_DESCRIBE_SPECIES.map((s) => s.id));
const SNAKE_LIKE_RE = /\b(snake|ular|python|cobra|viper|tedung|sawa|serpent|slither(?:ing|ed)?|no\s+legs?|legless|hiss(?:ing|ed)?|fang(?:s|ed)?|strik(?:e|ing)|patuk)\b/i;

function fuzzyJson(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function normaliseMatches(matches) {
  if (!Array.isArray(matches)) return [];
  const seen = new Set();
  const out = [];
  for (const match of matches) {
    const id = String(match?.species_id || '');
    if (!FUZZY_ALLOWED_IDS.has(id) || seen.has(id)) continue;
    seen.add(id);
    const confidence = ['high', 'medium', 'low'].includes(match?.confidence) ? match.confidence : 'low';
    out.push({ species_id: id, confidence });
    if (out.length === 3) break;
  }
  return out;
}

function deterministicFuzzyFallback(text) {
  const lower = String(text || '').toLowerCase();
  const matches = [];
  const add = (id) => {
    if (!matches.some((m) => m.species_id === id)) matches.push({ species_id: id, confidence: 'low' });
  };

  // Broad mammal appearance: deliberately return alternatives rather than
  // pretending one species is confirmed from a weak feature.
  if (/\b(furry|fur|hairy|berbulu)\b/i.test(lower)) {
    add('macaque');
    add('wild-boar');
  }

  // Four legs is useful only as a broad body-shape feature in this tiny
  // allow-list. Keep several plausible candidates and let the resident confirm.
  if (/\b(4|four|empat)\s*[- ]?leg(?:s|ged)?\b/i.test(lower) || /\bfour[- ]legged\b/i.test(lower)) {
    add('macaque');
    add('wild-boar');
    add('water-monitor');
  }

  if (/\b(feather(?:s|ed)?|wing(?:s|ed)?|bird|burung)\b/i.test(lower)) {
    add('house-crow');
    add('common-myna');
  }

  if (/\b(scale(?:s|d)?|lizard|reptile|biawak|drain|canal|pond)\b/i.test(lower)) add('water-monitor');
  if (/\b(monkey|macaque|kera|troop|long tail)\b/i.test(lower)) add('macaque');
  if (/\b(boar|pig|babi|snout|root(?:ing|ed)?|dug up|digging)\b/i.test(lower)) add('wild-boar');
  if (/\b(crow|gagak|black bird)\b/i.test(lower)) add('house-crow');
  if (/\b(myna|yellow beak|gembala kerbau)\b/i.test(lower)) add('common-myna');

  return matches.slice(0, 3);
}

async function handleFuzzyDescribe(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return fuzzyJson({ ok: false, error: 'Request body must be JSON.' }, 400);
  }

  const text = String(body?.text || '').trim().slice(0, 500);
  if (!text) return fuzzyJson({ ok: false, error: 'text is required.' }, 400);

  // Defence in depth. The browser normally catches these first and routes to
  // snake safety, but the AI fuzzy layer must never turn snake-like text into
  // a lizard or mammal guess.
  if (SNAKE_LIKE_RE.test(text)) {
    return fuzzyJson({ ok: true, status: 'snake_safety', species_ids: [], matches: [] });
  }

  const fallback = deterministicFuzzyFallback(text);

  if (!env.MINIMAX_API_KEY) {
    return fuzzyJson({
      ok: true,
      status: fallback.length ? 'needs_clarification' : 'no_match',
      species_ids: fallback.map((m) => m.species_id),
      matches: fallback,
      source: 'fuzzy_fallback',
    });
  }

  const speciesList = FUZZY_DESCRIBE_SPECIES
    .map((s) => `- id: "${s.id}" | ${s.en} / ${s.bm} — ${s.hints}`)
    .join('\n');

  const systemPrompt = `You are a cautious fuzzy candidate ranker for a Malaysian household-wildlife website. You do NOT need an exact species keyword. Infer plausible candidates from partial semantic features such as body covering, number of legs, approximate size, movement, sound, behaviour, habitat and location.\n\nYou may ONLY choose from this fixed allow-list:\n${speciesList}\n\nRules:\n1. Treat the task as fuzzy candidate ranking, NOT exact species identification.\n2. For vague but relevant animal descriptions, return plausible LOW-confidence candidates instead of an empty list.\n3. If one weak feature fits multiple species, return multiple candidates. Examples:\n   - "I saw a furry animal" => macaque + wild-boar, both low confidence.\n   - "an animal with 4 legs" => macaque + wild-boar + water-monitor, all low confidence.\n   - "a bird on the roof" => house-crow + common-myna, low or medium confidence depending on other details.\n4. Use medium/high confidence only when the description contains discriminating evidence (for example monkey/troop/long tail; pig-like snout and rooting soil; scales and drain/canal; yellow beak; black crow).\n5. Return an empty list only for unrelated text, an animal clearly outside the allow-list, meaningless text, or snake-like descriptions. Never force a snake-like description into water-monitor.\n6. The user's text may be English, Malay, or mixed.\n\nReturn ONLY JSON in this exact shape: {"matches":[{"species_id":"allowed-id","confidence":"high"|"medium"|"low"}]}. Maximum 3, most plausible first.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch('https://api.minimax.io/v1/text/chatcompletion_v2', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.MINIMAX_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'MiniMax-Text-01',
        temperature: 0.2,
        max_tokens: 300,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.warn('[RoomForBoth Worker] fuzzy MiniMax request failed; using fallback', response.status);
      return fuzzyJson({
        ok: true,
        status: fallback.length ? 'needs_clarification' : 'no_match',
        species_ids: fallback.map((m) => m.species_id),
        matches: fallback,
        source: 'fuzzy_fallback',
      });
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    let aiMatches = [];
    if (jsonMatch) {
      try {
        aiMatches = normaliseMatches(JSON.parse(jsonMatch[0])?.matches);
      } catch {
        aiMatches = [];
      }
    }

    // If the model is still over-conservative on a broad but meaningful
    // feature, use the deterministic candidates as a safety net.
    const matches = aiMatches.length ? aiMatches : fallback;
    const lowOnly = matches.length > 0 && matches.every((m) => m.confidence === 'low');
    const status = matches.length === 0 ? 'no_match' : (lowOnly || matches.length > 1 ? 'needs_clarification' : 'candidate');

    return fuzzyJson({
      ok: true,
      status,
      species_ids: matches.map((m) => m.species_id),
      matches,
      source: aiMatches.length ? 'minimax_fuzzy' : 'fuzzy_fallback',
    });
  } catch (error) {
    clearTimeout(timeout);
    console.warn('[RoomForBoth Worker] fuzzy identify failed; using fallback', error?.message || error);
    return fuzzyJson({
      ok: true,
      status: fallback.length ? 'needs_clarification' : 'no_match',
      species_ids: fallback.map((m) => m.species_id),
      matches: fallback,
      source: 'fuzzy_fallback',
    });
  }
}

export default {
  async fetch(request, env, ctx) {
    const requestUrl = new URL(request.url);
    if (request.method === 'POST' && requestUrl.pathname === '/api/identify-describe') {
      return handleFuzzyDescribe(request, env);
    }

    const response = await baseWorker.fetch(request, env, ctx);
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('text/html')) return response;

    // Keep HTML delivery non-blocking. The homepage state dropdown is populated
    // asynchronously by iteration1-fixes.js from /api/states after the page renders.
    // Do not make the initial HTML response wait on Neon.
    const html = await response.text();

    let updatedHtml = html
      .replace(/Step 2 · Authority (?:&amp;|&) Contact/g, 'Step 3 · Authority &amp; Contact')
      .replace(/Langkah 2 · Agensi (?:&amp;|&) Hubungan/g, 'Langkah 3 · Agensi &amp; Hubungan');

    // Version injected assets so a fresh deployment bypasses stale browser/edge cache.
    const assetVersion = '20260903-8';

    updatedHtml = updatedHtml.replace(
      /<\/body>/i,
      `<script src="/iteration1-fixes.js?v=${assetVersion}"></script><script src="/bilingual-fallback.js?v=${assetVersion}"></script><script src="/provenance-links.js?v=${assetVersion}"></script><script src="/hide-prevention-source-summary.js?v=${assetVersion}"></script><script src="/state-occurrence-data.js?v=${assetVersion}"></script><script src="/species-state-occurrence.js?v=${assetVersion}"></script><script src="/general-guidance-image-fix.js?v=${assetVersion}"></script><script src="/authority-db.js?v=${assetVersion}"></script><script src="/snake-safety-cleanup.js?v=${assetVersion}"></script><script src="/mentor-review-fixes.js?v=${assetVersion}"></script><script src="/identify-confirm-bilingual.js?v=${assetVersion}"></script><script src="/describe-fuzzy-guidance.js?v=${assetVersion}"></script></body>`
    );

    const headers = new Headers(response.headers);
    headers.delete('content-length');

    return new Response(updatedHtml, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
