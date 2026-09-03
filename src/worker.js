import { neon } from '@neondatabase/serverless';

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders,
    },
  });
}

function getSql(env) {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  return neon(env.DATABASE_URL);
}

function positiveInt(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function boolParam(value) {
  if (value === null) return null;
  const normalized = String(value).toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return undefined;
}

function directImageUrl(value) {
  return /\.(?:avif|gif|jpe?g|png|webp)(?:$|[?#])/i.test(String(value || ''));
}

function decodeHtmlAttribute(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

async function resolveDisplayImageUrl(sourceUrl) {
  if (!sourceUrl) return null;
  if (directImageUrl(sourceUrl)) return sourceUrl;

  try {
    const parsed = new URL(sourceUrl);

    if (parsed.hostname === 'www.inaturalist.org' || parsed.hostname === 'inaturalist.org') {
      const match = parsed.pathname.match(/^\/taxa\/(\d+)/);
      if (match) {
        const response = await fetch(`https://api.inaturalist.org/v1/taxa/${match[1]}`, {
          headers: { accept: 'application/json' },
        });
        if (response.ok) {
          const payload = await response.json();
          const photo = payload?.results?.[0]?.default_photo;
          const image = photo?.medium_url || photo?.url || photo?.square_url;
          if (image) return image;
        }
      }
    }

    const response = await fetch(sourceUrl, {
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': 'RoomForBoth/1.0 (+read-only media preview resolver)',
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    const patterns = [
      /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return decodeHtmlAttribute(match[1]);
    }
  } catch (error) {
    console.warn('[RoomForBoth Worker] Media preview resolution failed', error?.message || error);
  }
  return null;
}

// The 5 species this product covers that "Describe it" is allowed to
// identify (snake is excluded on purpose — AC 1.1.2 requires snake reports
// to skip identification entirely and go straight to safety guidance, so it
// must never reach the AI or be offered as a candidate here; "general" is a
// fallback shown when nothing matches, not something the AI should pick).
const DESCRIBE_SPECIES = [
  { id: 'house-crow', en: 'House Crow', bm: 'Gagak Rumah', sci: 'Corvus splendens', hints: 'noisy black bird, raids open rubbish bins and food waste, nests on roofs/eaves' },
  { id: 'macaque', en: 'Long-tailed Macaque', bm: 'Kera', sci: 'Macaca fascicularis', hints: 'monkey, often in a troop, enters through windows/roofs, takes food from kitchens or bins' },
  { id: 'water-monitor', en: 'Water Monitor Lizard', bm: 'Biawak', sci: 'Varanus salvator', hints: 'large lizard, follows drains/canals/rivers, preys on poultry or fish ponds' },
  { id: 'wild-boar', en: 'Wild Boar', bm: 'Babi Hutan', sci: 'Sus scrofa', hints: 'pig-like animal, roots up soil/gardens at night, forest-fringe housing' },
  { id: 'common-myna', en: 'Common Myna', bm: 'Gembala Kerbau', sci: 'Acridotheres tristis', hints: 'small brown bird with a yellow beak, noisy, nests in roof eaves and cavities' },
];

async function handleIdentifyDescribe(request, env) {
  if (!env.MINIMAX_API_KEY) {
    return json({ ok: false, error: 'AI identification is not configured.' }, 501);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Request body must be JSON.' }, 400);
  }

  const text = String(body?.text || '').trim().slice(0, 500);
  if (!text) return json({ ok: false, error: 'text is required.' }, 400);

  const allowedIds = DESCRIBE_SPECIES.map((s) => s.id);
  const speciesList = DESCRIBE_SPECIES
    .map((s) => `- id: "${s.id}" | ${s.en} (${s.sci}, Malay: ${s.bm}) — ${s.hints}`)
    .join('\n');

  const systemPrompt = `You identify which wildlife species is most likely being described in a report of an animal causing a problem at a home in Malaysia. You may ONLY choose from this fixed list of species ids — never invent a new id or name:\n${speciesList}\n\nThe user's text may be in English, Malay, or a mix of the two.\n\nHow to decide:\n- If the text describes ANY behaviour, damage, sound, appearance, or location that is even loosely consistent with one of the species above (e.g. "rubbish bin knocked over", "something messed up my yard at night", "noisy bird on the roof"), include that species as a match — use "low" confidence if the description is vague or could fit more than one species, rather than leaving it out. The user will be shown the candidates as cards to pick from or dismiss, so it is safe to suggest a plausible low-confidence guess.\n- Only return an empty list when the text has NO real connection to any of these species at all — e.g. it names an unrelated animal not in the list, is empty of any incident description, is random/meaningless text, or is a completely different topic. Do not force a match onto text like that just to avoid an empty list.\n- None of the species above is a snake. This app handles snakes through a separate safety-first path that never names a species, and normally catches snake reports before they ever reach you — but if the text still sounds like it could be describing a snake or another legless/limbless reptile (long, slithering, no legs, hissing, striking, fanged), do NOT match it to water-monitor or any other species just because it is the closest available option. Return an empty list instead — a wrong lizard match is a safety failure here, an empty list is not.\n\nRespond with ONLY a JSON object matching this shape — no explanation, no reasoning steps, no markdown code fences, nothing before or after it: {"matches":[{"species_id":"<one of the ids above>","confidence":"high"|"medium"|"low"}]}. List at most 3 matches, most likely first.`;

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
        temperature: 0.1,
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
      console.error('[RoomForBoth Worker] MiniMax API error', response.status, await response.text().catch(() => ''));
      return json({ ok: false, error: 'AI identification request failed.' }, 502);
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // MiniMax can return HTTP 200 with an error inside base_resp instead of
      // a real completion (bad model name, quota, auth, etc.) — log the full
      // payload so this is diagnosable instead of a bare "no usable result".
      console.error('[RoomForBoth Worker] MiniMax returned no parseable content', JSON.stringify(payload));
      return json({ ok: false, error: 'AI returned no usable result.', debug: payload }, 502);
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return json({ ok: false, error: 'AI returned malformed JSON.' }, 502);
    }

    const speciesIds = Array.isArray(parsed?.matches)
      ? parsed.matches
          .map((m) => m?.species_id)
          .filter((id) => allowedIds.includes(id))
          .slice(0, 3)
      : [];

    return json({ ok: true, species_ids: speciesIds });
  } catch (err) {
    clearTimeout(timeout);
    console.error('[RoomForBoth Worker] identify-describe failed', err?.message || err);
    return json({ ok: false, error: 'AI identification request failed.' }, 502);
  }
}

async function handleApi(request, env) {
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return json({ ok: false, error: 'Read-only API. Only GET requests are allowed.' }, 405, { Allow: 'GET' });
  }

  try {
    const sql = getSql(env);

    if (url.pathname === '/api/health') {
      const rows = await sql`SELECT NOW() AS database_time`;
      return json({
        ok: true,
        service: 'room-for-both-worker',
        mode: 'read-only',
        database: 'connected',
        database_time: rows[0]?.database_time,
      });
    }

    if (url.pathname === '/api/data-status') {
      const rows = await sql`
        SELECT 'animal_category' AS table_name, COUNT(*)::int AS row_count FROM animal_category
        UNION ALL SELECT 'authority', COUNT(*)::int FROM authority
        UNION ALL SELECT 'immediate_action', COUNT(*)::int FROM immediate_action
        UNION ALL SELECT 'prevention_action', COUNT(*)::int FROM prevention_action
        UNION ALL SELECT 'species', COUNT(*)::int FROM species
        UNION ALL SELECT 'species_behaviour', COUNT(*)::int FROM species_behaviour
        UNION ALL SELECT 'species_media', COUNT(*)::int FROM species_media
        UNION ALL SELECT 'state', COUNT(*)::int FROM state
        ORDER BY table_name
      `;
      const mediaCoverage = await sql`
        SELECT COUNT(*)::int AS media_rows, COUNT(DISTINCT species_id)::int AS species_with_media
        FROM species_media
        WHERE image_url IS NOT NULL
          AND BTRIM(image_url) <> ''
          AND UPPER(BTRIM(image_url)) NOT IN ('NA','N/A')
      `;
      return json({
        ok: true,
        mode: 'read-only',
        tables: Object.fromEntries(rows.map((row) => [row.table_name, row.row_count])),
        media: mediaCoverage[0] || { media_rows: 0, species_with_media: 0 },
      });
    }

    if (url.pathname === '/api/categories') {
      const rows = await sql`
        SELECT category_id, category_name, description, responsible_body_type
        FROM animal_category
        ORDER BY category_id
      `;
      return json({ ok: true, count: rows.length, categories: rows });
    }

    if (url.pathname === '/api/states') {
      const rawStateCode = url.searchParams.get('state_code');
      const stateCode = positiveInt(rawStateCode);
      if (rawStateCode !== null && stateCode === null) {
        return json({ ok: false, error: 'state_code must be a positive integer.' }, 400);
      }

      if (stateCode !== null) {
        const rows = await sql`
          SELECT state_code, state_name, jurisdiction_type
          FROM state
          WHERE state_code = ${stateCode}
          LIMIT 1
        `;
        if (!rows.length) return json({ ok: false, error: 'State not found.' }, 404);
        return json({ ok: true, state: rows[0] });
      }

      const rows = await sql`
        SELECT state_code, state_name, jurisdiction_type
        FROM state
        ORDER BY state_name, state_code
      `;
      return json({ ok: true, count: rows.length, states: rows });
    }

    if (url.pathname === '/api/species') {
      const rawId = url.searchParams.get('id');
      const rawCategoryId = url.searchParams.get('category_id');
      const rawIsSnake = url.searchParams.get('is_snake');
      const id = positiveInt(rawId);
      const categoryId = positiveInt(rawCategoryId);
      const isSnake = boolParam(rawIsSnake);

      if (rawId !== null && id === null) return json({ ok: false, error: 'id must be a positive integer.' }, 400);
      if (rawCategoryId !== null && categoryId === null) return json({ ok: false, error: 'category_id must be a positive integer.' }, 400);
      if (rawIsSnake !== null && isSnake === undefined) return json({ ok: false, error: 'is_snake must be true or false.' }, 400);

      const rows = await sql`
        SELECT
          s.species_id, s.order_family_species, s.scientific_name, s.malay_name,
          s.english_name, s.category_id, s.protected_status, s.introduced_status,
          s.is_snake, s.id_keywords, s.taxonkey AS "taxonKey",
          c.category_name, c.description AS category_description, c.responsible_body_type
        FROM species s
        LEFT JOIN animal_category c ON c.category_id = s.category_id
        WHERE (${id}::int IS NULL OR s.species_id = ${id})
          AND (${categoryId}::int IS NULL OR s.category_id = ${categoryId})
          AND (${isSnake}::boolean IS NULL OR s.is_snake = ${isSnake})
        ORDER BY s.english_name, s.species_id
      `;

      if (id !== null) {
        if (!rows.length) return json({ ok: false, error: 'Species not found.' }, 404);
        return json({ ok: true, species: rows[0] });
      }
      return json({ ok: true, count: rows.length, species: rows });
    }

    if (url.pathname === '/api/species-media') {
      const speciesId = positiveInt(url.searchParams.get('species_id'));
      if (speciesId === null) return json({ ok: false, error: 'species_id must be a positive integer.' }, 400);

      const storedRows = await sql`
        SELECT media_id, species_id, image_url, photographer, licence, gbif_occurrence_id
        FROM species_media
        WHERE species_id = ${speciesId}
        ORDER BY media_id
      `;

      const rows = await Promise.all(storedRows.map(async (row) => {
        const storedImageUrl = row.image_url;
        const resolvedImageUrl = await resolveDisplayImageUrl(storedImageUrl);
        return {
          ...row,
          stored_image_url: storedImageUrl,
          image_url: resolvedImageUrl,
          source_url: storedImageUrl,
          image_resolved: Boolean(resolvedImageUrl),
        };
      }));

      return json({ ok: true, species_id: speciesId, count: rows.length, media: rows });
    }

    if (url.pathname === '/api/species-behaviour') {
      const speciesId = positiveInt(url.searchParams.get('species_id'));
      if (speciesId === null) return json({ ok: false, error: 'species_id must be a positive integer.' }, 400);
      const rows = await sql`
        SELECT behaviour_id, species_id, likely_location, what_moves_it, safe_distance_note,
               lost_sight_note, source_person, source_institution, source_url, date_verified
        FROM species_behaviour
        WHERE species_id = ${speciesId}
        ORDER BY behaviour_id
      `;
      return json({ ok: true, species_id: speciesId, count: rows.length, behaviour: rows });
    }

    if (url.pathname === '/api/immediate-actions') {
      const rawSpeciesId = url.searchParams.get('species_id');
      const rawCategoryId = url.searchParams.get('category_id');
      const speciesId = positiveInt(rawSpeciesId);
      const categoryId = positiveInt(rawCategoryId);

      if (rawSpeciesId !== null && speciesId === null) return json({ ok: false, error: 'species_id must be a positive integer.' }, 400);
      if (rawCategoryId !== null && categoryId === null) return json({ ok: false, error: 'category_id must be a positive integer.' }, 400);
      if (speciesId === null && categoryId === null) return json({ ok: false, error: 'Provide species_id or category_id.' }, 400);

      let rows;
      if (speciesId !== null && categoryId !== null) {
        rows = await sql`SELECT * FROM immediate_action WHERE species_id = ${speciesId} AND category_id = ${categoryId} ORDER BY step_order NULLS LAST, action_id`;
      } else if (speciesId !== null) {
        rows = await sql`SELECT * FROM immediate_action WHERE species_id = ${speciesId} ORDER BY step_order NULLS LAST, action_id`;
      } else {
        rows = await sql`SELECT * FROM immediate_action WHERE category_id = ${categoryId} ORDER BY step_order NULLS LAST, action_id`;
      }
      return json({ ok: true, count: rows.length, actions: rows });
    }

    if (url.pathname === '/api/prevention-actions') {
      const rawSpeciesId = url.searchParams.get('species_id');
      const rawCategoryId = url.searchParams.get('category_id');
      const speciesId = positiveInt(rawSpeciesId);
      const categoryId = positiveInt(rawCategoryId);
      const housingType = String(url.searchParams.get('housing_type') || '').trim();
      const causeGroup = String(url.searchParams.get('cause_group') || '').trim();

      if (rawSpeciesId !== null && speciesId === null) return json({ ok: false, error: 'species_id must be a positive integer.' }, 400);
      if (rawCategoryId !== null && categoryId === null) return json({ ok: false, error: 'category_id must be a positive integer.' }, 400);
      if (speciesId === null && categoryId === null) return json({ ok: false, error: 'Provide species_id or category_id.' }, 400);

      const rows = await sql`
        SELECT *
        FROM prevention_action
        WHERE (${speciesId}::int IS NULL OR species_id = ${speciesId})
          AND (${categoryId}::int IS NULL OR category_id = ${categoryId})
          AND (${housingType || null}::text IS NULL OR LOWER(housing_type) = LOWER(${housingType || null}))
          AND (${causeGroup || null}::text IS NULL OR LOWER(cause_group) = LOWER(${causeGroup || null}))
        ORDER BY harm_rank NULLS LAST, prevention_id
      `;
      return json({ ok: true, count: rows.length, actions: rows });
    }

    if (url.pathname === '/api/authority') {
      const categoryId = positiveInt(url.searchParams.get('category_id'));
      const jurisdiction = String(url.searchParams.get('jurisdiction') || '').trim();
      if (categoryId === null) return json({ ok: false, error: 'category_id must be a positive integer.' }, 400);

      const rows = await sql`
        SELECT authority_id, jurisdiction, category_id, agency_name, contact_route,
               contact_value, what_they_do, response_standard, source_url, last_verified
        FROM authority
        WHERE category_id = ${categoryId}
          AND (${jurisdiction || null}::text IS NULL OR LOWER(jurisdiction) = LOWER(${jurisdiction || null}))
        ORDER BY jurisdiction, authority_id
      `;
      return json({ ok: true, count: rows.length, authorities: rows });
    }

    if (url.pathname === '/api/data-sources') {
      const rows = await sql`
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
      `;

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

    if (url.pathname === '/api/tables') {
      const rows = await sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `;
      return json({ ok: true, tables: rows.map((row) => row.table_name) });
    }

    // AC-driven "About the Data" requirement: every source note on the site
    // must trace back to a real, named, dated record — not a curated list
    // maintained by hand in the frontend. This aggregates the source_*
    // columns that already exist on species_behaviour, immediate_action and
    // prevention_action (per-species) plus authority (per jurisdiction),
    // de-duplicating exact repeats (e.g. the same institution cited for
    // every step of one species' immediate actions collapses to one row;
    // the same authority contact repeated across animal_category rows for
    // one jurisdiction collapses to one row with its categories combined).
    if (url.pathname === '/api/data-sources') {
      const rows = await sql`
        WITH behaviour_sources AS (
          SELECT DISTINCT
            b.source_institution, b.source_person, b.source_url,
            b.date_verified::text AS date_verified,
            'species_behaviour' AS source_table,
            s.english_name AS species_name,
            NULL::text AS category_name,
            NULL::text AS jurisdiction
          FROM species_behaviour b
          JOIN species s ON s.species_id = b.species_id
          WHERE b.source_institution IS NOT NULL OR b.source_person IS NOT NULL
        ),
        action_sources AS (
          SELECT DISTINCT
            a.source_institution, a.source_person, a.source_url,
            a.date_verified::text AS date_verified,
            'immediate_action' AS source_table,
            s.english_name AS species_name,
            NULL::text AS category_name,
            NULL::text AS jurisdiction
          FROM immediate_action a
          JOIN species s ON s.species_id = a.species_id
          WHERE a.source_institution IS NOT NULL OR a.source_person IS NOT NULL
        ),
        prevention_sources AS (
          SELECT DISTINCT
            p.source_institution, p.source_person, p.source_url,
            p.date_verified::text AS date_verified,
            'prevention_action' AS source_table,
            s.english_name AS species_name,
            NULL::text AS category_name,
            NULL::text AS jurisdiction
          FROM prevention_action p
          JOIN species s ON s.species_id = p.species_id
          WHERE p.source_institution IS NOT NULL OR p.source_person IS NOT NULL
        ),
        authority_sources AS (
          -- authority has no source_person/source_institution columns —
          -- agency_name IS the institution for that record. Grouped by
          -- (jurisdiction, agency_name) since this database currently has
          -- one row per animal_category per jurisdiction, usually with an
          -- identical agency/contact for all 5 categories; this collapses
          -- those into one row per real distinct contact instead of
          -- repeating the same institution 5 times per state.
          SELECT
            a.agency_name AS source_institution,
            NULL::text AS source_person,
            MAX(a.source_url) AS source_url,
            MAX(a.last_verified)::text AS date_verified,
            'authority' AS source_table,
            NULL::text AS species_name,
            STRING_AGG(DISTINCT c.category_name, ', ' ORDER BY c.category_name) AS category_name,
            a.jurisdiction
          FROM authority a
          LEFT JOIN animal_category c ON c.category_id = a.category_id
          GROUP BY a.jurisdiction, a.agency_name
        )
        SELECT * FROM behaviour_sources
        UNION ALL SELECT * FROM action_sources
        UNION ALL SELECT * FROM prevention_sources
        UNION ALL SELECT * FROM authority_sources
        ORDER BY source_table, species_name NULLS LAST, jurisdiction NULLS LAST
      `;
      return json({ ok: true, count: rows.length, sources: rows });
    }

    return json({ ok: false, error: 'API route not found.' }, 404);
  } catch (err) {
    console.error('[RoomForBoth Worker]', err);
    return json({ ok: false, error: 'Backend request failed.' }, 500);
  }
}

class FrontendScriptInjector {
  element(element) {
    element.append(
      '<script src="/api-data.js" defer></script><script src="/snake-thumbnail.js" defer></script>',
      { html: true },
    );
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/identify-describe' && request.method === 'POST') {
      return handleIdentifyDescribe(request, env);
    }
    if (url.pathname.startsWith('/api/')) return handleApi(request, env);

    const response = await env.ASSETS.fetch(request);
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      return new HTMLRewriter().on('body', new FrontendScriptInjector()).transform(response);
    }
    return response;
  },
};
