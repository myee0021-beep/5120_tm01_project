# Room for Both backend setup

This branch adds a Cloudflare Worker in front of the existing static frontend and connects `/api/*` routes to Neon PostgreSQL.

## Architecture

- Static frontend: `public/index.html`
- Worker entry: `src/worker.js`
- Frontend bridge: `public/backend.js`
- Database: Neon PostgreSQL through `@neondatabase/serverless`

The Worker serves static assets through the `ASSETS` binding and injects `backend.js` into HTML responses. The existing frontend file does not need to be rewritten.

## API

### `GET /api/health`

Checks whether the Worker can connect to Neon.

Expected response:

```json
{
  "ok": true,
  "service": "room-for-both-worker",
  "database": "connected"
}
```

### `POST /api/events`

Stores frontend interaction events. The Worker creates the `app_event` table automatically the first time this endpoint is used.

Example request:

```json
{
  "eventType": "click",
  "page": "identify",
  "speciesId": "macaque",
  "stateId": "selangor",
  "language": "en",
  "metadata": {
    "element_id": "example-button"
  }
}
```

### `GET /api/events?limit=20`

Returns the newest saved events. The maximum limit is 100.

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

## Security

If a database password has ever been pasted into chat, an issue, a commit, or another shared location, rotate that Neon password before production deployment and update the Cloudflare `DATABASE_URL` secret.
