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

async function ensureEventTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS app_event (
      event_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      session_id VARCHAR(80),
      event_type VARCHAR(80) NOT NULL,
      page VARCHAR(80),
      species_id VARCHAR(80),
      state_id VARCHAR(80),
      language VARCHAR(10),
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `;
}

async function handleApi(request, env) {
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,POST,OPTIONS',
        'access-control-allow-headers': 'content-type',
      },
    });
  }

  try {
    const sql = getSql(env);

    if (url.pathname === '/api/health' && request.method === 'GET') {
      const rows = await sql`SELECT NOW() AS database_time`;
      return json({ ok: true, service: 'room-for-both-worker', database: 'connected', database_time: rows[0]?.database_time });
    }

    if (url.pathname === '/api/events' && request.method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ ok: false, error: 'Request body must be valid JSON.' }, 400);
      }

      const eventType = String(body.eventType || body.event_type || '').trim();
      if (!eventType || eventType.length > 80) {
        return json({ ok: false, error: 'eventType is required and must be 80 characters or fewer.' }, 400);
      }

      const sessionId = String(body.sessionId || body.session_id || '').slice(0, 80) || null;
      const page = String(body.page || '').slice(0, 80) || null;
      const speciesId = String(body.speciesId || body.species_id || '').slice(0, 80) || null;
      const stateId = String(body.stateId || body.state_id || '').slice(0, 80) || null;
      const language = String(body.language || '').slice(0, 10) || null;
      const metadata = body.metadata && typeof body.metadata === 'object' ? body.metadata : {};

      await ensureEventTable(sql);
      const rows = await sql`
        INSERT INTO app_event
          (session_id, event_type, page, species_id, state_id, language, metadata)
        VALUES
          (${sessionId}, ${eventType}, ${page}, ${speciesId}, ${stateId}, ${language}, ${JSON.stringify(metadata)}::jsonb)
        RETURNING event_id, created_at
      `;

      return json({ ok: true, saved: true, event_id: rows[0]?.event_id, created_at: rows[0]?.created_at }, 201);
    }

    if (url.pathname === '/api/events' && request.method === 'GET') {
      const limitRaw = Number(url.searchParams.get('limit') || 20);
      const limit = Math.max(1, Math.min(Number.isFinite(limitRaw) ? Math.trunc(limitRaw) : 20, 100));
      await ensureEventTable(sql);
      const rows = await sql`
        SELECT event_id, session_id, event_type, page, species_id, state_id, language, metadata, created_at
        FROM app_event
        ORDER BY event_id DESC
        LIMIT ${limit}
      `;
      return json({ ok: true, events: rows });
    }

    return json({ ok: false, error: 'API route not found.' }, 404);
  } catch (err) {
    console.error('[RoomForBoth Worker]', err);
    return json({ ok: false, error: 'Backend request failed.' }, 500);
  }
}

class BackendScriptInjector {
  element(element) {
    element.append('<script src="/backend.js" defer></script>', { html: true });
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
      return new HTMLRewriter()
        .on('body', new BackendScriptInjector())
        .transform(response);
    }
    return response;
  },
};
