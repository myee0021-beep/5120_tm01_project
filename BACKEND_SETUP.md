# Room for Both backend setup

This branch adds a read-only Cloudflare Worker in front of the existing static frontend and connects `/api/*` routes to Neon PostgreSQL.

## Architecture

- Static frontend: `public/index.html`
- Worker entry: `src/worker.js`
- Database: Neon PostgreSQL through `@neondatabase/serverless`

The Worker serves the existing frontend through the `ASSETS` binding. No frontend event tracking or database write logic is included.

## Read-only API

The backend only accepts `GET` requests for API routes. `POST`, `PUT`, `PATCH`, and `DELETE` are rejected with HTTP 405.

### `GET /api/health`

Checks whether the Worker can connect to Neon using a `SELECT` query.

### `GET /api/tables`

Lists the base tables in the PostgreSQL `public` schema.

### `GET /api/table?name=TABLE_NAME&limit=100`

Reads rows from one existing table. The table name is validated and checked against `information_schema` before the query runs.

The default limit is 100 rows and the maximum is 500.

Example:

`/api/table?name=species&limit=50`

## Cloudflare configuration

Do not put the Neon connection string in GitHub.

In Cloudflare, open the Worker for this project and add a secret named exactly:

`DATABASE_URL`

Use the Neon pooled PostgreSQL connection string as its value.

For local development, copy `.dev.vars.example` to `.dev.vars` and put the real value there. Do not commit `.dev.vars`.

## Local commands

```bash
npm install
npm run dev
```

Deployment:

```bash
npm run deploy
```

## Recommended database permission

For stronger protection, use a PostgreSQL role that has `SELECT` permission only for the tables the website needs. That way the database itself also prevents INSERT, UPDATE, DELETE, ALTER, DROP, and CREATE operations even if application code changes later.

## Security

If a database password has ever been pasted into chat, an issue, a commit, or another shared location, rotate that Neon password before production deployment and update the Cloudflare `DATABASE_URL` secret.
