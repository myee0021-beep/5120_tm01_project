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
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured');
  }
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

async function handleApi(request, env) {
  const url = new URL(request.url);

  // Public database access is intentionally read-only.
  if (request.method !== 'GET') {
    return json(
      { ok: false, error: 'Read-only API. Only GET requests are allowed.' },
      405,
      { Allow: 'GET' }
    );
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

    if (url.pathname === '/api/categories') {
      const rows = await sql`
        SELECT category_id, category_name, description, responsible_body_type
        FROM animal_category
        ORDER BY category_id
      `;
      return json({ ok: true, count: rows.length, categories: rows });
    }

    // state.state_code is an integer in the latest ERD.
    // GET /api/states
    // GET /api/states?state_code=1
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

      const speciesSelect = sql`
        SELECT
          s.species_id,
          s.order_family_species,
          s.scientific_name,
          s.malay_name,
          s.english_name,
          s.category_id,
          s.protected_status,
          s.introduced_status,
          s.is_snake,
          s.id_keywords,
          s.taxonkey AS "taxonKey",
          c.category_name,
          c.description AS category_description,
          c.responsible_body_type
        FROM species s
        LEFT JOIN animal_category c ON c.category_id = s.category_id
      `;

      if (id !== null) {
        const rows = await sql`
          SELECT
            s.species_id,
            s.order_family_species,
            s.scientific_name,
            s.malay_name,
            s.english_name,
            s.category_id,
            s.protected_status,
            s.introduced_status,
            s.is_snake,
            s.id_keywords,
            s.taxonkey AS "taxonKey",
            c.category_name,
            c.description AS category_description,
            c.responsible_body_type
          FROM species s
          LEFT JOIN animal_category c ON c.category_id = s.category_id
          WHERE s.species_id = ${id}
          LIMIT 1
        `;
        if (!rows.length) return json({ ok: false, error: 'Species not found.' }, 404);
        return json({ ok: true, species: rows[0] });
      }

      let rows;
      if (categoryId !== null && isSnake !== null) {
        rows = await sql`
          SELECT
            s.species_id, s.order_family_species, s.scientific_name, s.malay_name,
            s.english_name, s.category_id, s.protected_status, s.introduced_status,
            s.is_snake, s.id_keywords, s.taxonkey AS "taxonKey",
            c.category_name, c.responsible_body_type
          FROM species s
          LEFT JOIN animal_category c ON c.category_id = s.category_id
          WHERE s.category_id = ${categoryId} AND s.is_snake = ${isSnake}
          ORDER BY s.english_name, s.species_id
        `;
      } else if (categoryId !== null) {
        rows = await sql`
          SELECT
            s.species_id, s.order_family_species, s.scientific_name, s.malay_name,
            s.english_name, s.category_id, s.protected_status, s.introduced_status,
            s.is_snake, s.id_keywords, s.taxonkey AS "taxonKey",
            c.category_name, c.responsible_body_type
          FROM species s
          LEFT JOIN animal_category c ON c.category_id = s.category_id
          WHERE s.category_id = ${categoryId}
          ORDER BY s.english_name, s.species_id
        `;
      } else if (isSnake !== null) {
        rows = await sql`
          SELECT
            s.species_id, s.order_family_species, s.scientific_name, s.malay_name,
            s.english_name, s.category_id, s.protected_status, s.introduced_status,
            s.is_snake, s.id_keywords, s.taxonkey AS "taxonKey",
            c.category_name, c.responsible_body_type
          FROM species s
          LEFT JOIN animal_category c ON c.category_id = s.category_id
          WHERE s.is_snake = ${isSnake}
          ORDER BY s.english_name, s.species_id
        `;
      } else {
        rows = await sql`
          SELECT
            s.species_id, s.order_family_species, s.scientific_name, s.malay_name,
            s.english_name, s.category_id, s.protected_status, s.introduced_status,
            s.is_snake, s.id_keywords, s.taxonkey AS "taxonKey",
            c.category_name, c.responsible_body_type
          FROM species s
          LEFT JOIN animal_category c ON c.category_id = s.category_id
          ORDER BY s.english_name, s.species_id
        `;
      }

      return json({ ok: true, count: rows.length, species: rows });
    }

    if (url.pathname === '/api/species-media') {
      const speciesId = positiveInt(url.searchParams.get('species_id'));
      if (speciesId === null) return json({ ok: false, error: 'species_id must be a positive integer.' }, 400);

      const rows = await sql`
        SELECT media_id, species_id, image_url, photographer, licence, gbif_occurrence_id
        FROM species_media
        WHERE species_id = ${speciesId}
        ORDER BY media_id
      `;
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

      let rows;
      if (speciesId !== null) {
        rows = await sql`
          SELECT * FROM prevention_action
          WHERE species_id = ${speciesId}
            AND (${categoryId}::int IS NULL OR category_id = ${categoryId})
            AND (${housingType || null}::text IS NULL OR LOWER(housing_type) = LOWER(${housingType || null}))
            AND (${causeGroup || null}::text IS NULL OR LOWER(cause_group) = LOWER(${causeGroup || null}))
          ORDER BY harm_rank NULLS LAST, prevention_id
        `;
      } else {
        rows = await sql`
          SELECT * FROM prevention_action
          WHERE category_id = ${categoryId}
            AND (${housingType || null}::text IS NULL OR LOWER(housing_type) = LOWER(${housingType || null}))
            AND (${causeGroup || null}::text IS NULL OR LOWER(cause_group) = LOWER(${causeGroup || null}))
          ORDER BY harm_rank NULLS LAST, prevention_id
        `;
      }
      return json({ ok: true, count: rows.length, actions: rows });
    }

    // authority.jurisdiction is a varchar field in the ERD; it is not a foreign key to state.
    if (url.pathname === '/api/authority') {
      const categoryId = positiveInt(url.searchParams.get('category_id'));
      const jurisdiction = String(url.searchParams.get('jurisdiction') || '').trim();
      if (categoryId === null) return json({ ok: false, error: 'category_id must be a positive integer.' }, 400);

      let rows;
      if (jurisdiction) {
        rows = await sql`
          SELECT authority_id, jurisdiction, category_id, agency_name, contact_route,
                 contact_value, what_they_do, response_standard, source_url, last_verified
          FROM authority
          WHERE category_id = ${categoryId}
            AND LOWER(jurisdiction) = LOWER(${jurisdiction})
          ORDER BY authority_id
        `;
      } else {
        rows = await sql`
          SELECT authority_id, jurisdiction, category_id, agency_name, contact_route,
                 contact_value, what_they_do, response_standard, source_url, last_verified
          FROM authority
          WHERE category_id = ${categoryId}
          ORDER BY jurisdiction, authority_id
        `;
      }
      return json({ ok: true, count: rows.length, authorities: rows });
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

    return json({ ok: false, error: 'API route not found.' }, 404);
  } catch (err) {
    console.error('[RoomForBoth Worker]', err);
    return json({ ok: false, error: 'Backend request failed.' }, 500);
  }
}

class ApiDataInjector {
  element(element) {
    element.append('<script src="/api-data.js" defer></script>', { html: true });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env);
    }

    const response = await env.ASSETS.fetch(request);
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      return new HTMLRewriter().on('body', new ApiDataInjector()).transform(response);
    }
    return response;
  },
};
