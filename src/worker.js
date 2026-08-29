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

function validIdentifier(value) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
}

async function handleApi(request, env) {
  const url = new URL(request.url);

  // This backend is intentionally read-only.
  if (request.method !== 'GET') {
    return json(
      { ok: false, error: 'Read-only API. Only GET requests are allowed.' },
      405,
      { Allow: 'GET' }
    );
  }

  try {
    const sql = getSql(env);

    // Simple database connectivity check. SELECT only.
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

    // Returns the list of user tables in the public schema.
    if (url.pathname === '/api/tables') {
      const rows = await sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `;
      return json({ ok: true, tables: rows.map((row) => row.table_name) });
    }

    // Generic read-only table endpoint:
    // GET /api/table?name=species&limit=100
    if (url.pathname === '/api/table') {
      const tableName = String(url.searchParams.get('name') || '').trim();
      const limitRaw = Number(url.searchParams.get('limit') || 100);
      const limit = Math.max(1, Math.min(Number.isFinite(limitRaw) ? Math.trunc(limitRaw) : 100, 500));

      if (!validIdentifier(tableName)) {
        return json({ ok: false, error: 'A valid table name is required.' }, 400);
      }

      // Do not trust the URL parameter by itself. First verify that the table
      // actually exists in the public schema, then quote the identifier.
      const found = await sql`
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          AND table_name = ${tableName}
        LIMIT 1
      `;

      if (!found.length) {
        return json({ ok: false, error: 'Table not found.' }, 404);
      }

      const quotedTable = '"' + tableName.replace(/"/g, '""') + '"';
      const rows = await sql.query(`SELECT * FROM ${quotedTable} LIMIT $1`, [limit]);
      return json({ ok: true, table: tableName, count: rows.length, rows });
    }

    return json({ ok: false, error: 'API route not found.' }, 404);
  } catch (err) {
    console.error('[RoomForBoth Worker]', err);
    return json({ ok: false, error: 'Backend request failed.' }, 500);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env);
    }

    // All non-API requests continue to serve the existing static frontend.
    return env.ASSETS.fetch(request);
  },
};
