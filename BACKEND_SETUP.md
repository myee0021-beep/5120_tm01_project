# Room for Both backend setup

This repository uses a read-only Cloudflare Worker in front of the existing static frontend and connects `/api/*` routes to Neon PostgreSQL.

## Architecture

- Static frontend: `public/index.html`
- Frontend API bridge: `public/api-data.js`
- Worker entry: `src/worker.js`
- Database: Neon PostgreSQL through `@neondatabase/serverless`

The Worker serves the frontend through the `ASSETS` binding and handles database-backed `/api/*` routes.

## Current ERD

The backend is aligned to the current Room for Both schema:

- `species`
- `animal_category`
- `species_media`
- `species_behaviour`
- `immediate_action`
- `prevention_action`
- `authority`
- `state`

Important schema details:

- `species.category_id` references `animal_category.category_id`.
- `species_media.species_id`, `species_behaviour.species_id`, `immediate_action.species_id`, and `prevention_action.species_id` relate records to `species.species_id`.
- `immediate_action.category_id`, `prevention_action.category_id`, and `authority.category_id` relate records to `animal_category.category_id`.
- `state.state_code` is an integer primary key.
- `authority.jurisdiction` is a varchar field and is not treated as a foreign key to `state` by the API.
- `species_media` stores external image URLs and attribution metadata; image binary files are not stored in PostgreSQL.

## Read-only API

Only `GET` requests are accepted for API routes. `POST`, `PUT`, `PATCH`, and `DELETE` are rejected with HTTP 405.

### Health

```http
GET /api/health
```

### Species

```http
GET /api/species
GET /api/species?id=1
GET /api/species?category_id=1
GET /api/species?is_snake=true
```

The PostgreSQL column is stored as lowercase `taxonkey`; the API returns it as `taxonKey` to match the ERD naming.

### Categories

```http
GET /api/categories
```

### States

```http
GET /api/states
GET /api/states?state_code=1
```

### Species media

```http
GET /api/species-media?species_id=1
```

### Species behaviour

```http
GET /api/species-behaviour?species_id=1
```

### Immediate actions

```http
GET /api/immediate-actions?species_id=1
GET /api/immediate-actions?category_id=1
```

### Prevention actions

```http
GET /api/prevention-actions?species_id=1
GET /api/prevention-actions?species_id=1&housing_type=landed
GET /api/prevention-actions?species_id=1&cause_group=food
```

### Authorities

```http
GET /api/authority?category_id=1
GET /api/authority?category_id=1&jurisdiction=Selangor
```

### Diagnostic table list

```http
GET /api/tables
```

This exposes table names only. There is no generic arbitrary-table query endpoint.

## Cloudflare configuration

Do not put the Neon connection string in GitHub.

Add a Cloudflare Worker secret named:

```text
DATABASE_URL
```

Use the Neon pooled PostgreSQL connection string as its value.

For local development, copy `.dev.vars.example` to `.dev.vars` and add the real value there. Do not commit `.dev.vars`.

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

For stronger protection, use a PostgreSQL role that has `SELECT` permission only for the tables the website needs. This protects the database even if application code changes later.
