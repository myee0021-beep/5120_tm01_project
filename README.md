# Room for Both

**Room for Both** is a web-based wildlife coexistence project designed to help people in Malaysia respond safely and responsibly when wild animals appear around homes and neighbourhoods.

The project combines species information, behaviour guidance, immediate safety actions, prevention advice, media references, and relevant authority information in one accessible interface.

## Project Purpose

Wildlife encounters in residential areas can create confusion, fear, and unsafe responses. Room for Both aims to provide clear, practical guidance so users can:

- identify common wildlife species;
- understand whether an animal may present a risk;
- learn what to do immediately during an encounter;
- reduce the likelihood of repeated encounters;
- understand the animal's typical behaviour;
- find the appropriate authority or wildlife agency when professional assistance is required.

The project focuses on coexistence and harm reduction rather than encouraging users to capture, handle, or remove wildlife themselves.

## Current Species Coverage

The current database includes seven example species:

- Long-tailed Macaque (*Macaca fascicularis*)
- Wild Boar (*Sus scrofa*)
- Common Myna (*Acridotheres tristis*)
- Reticulated Python (*Malayopython reticulatus*)
- House Crow (*Corvus splendens*)
- Common Water Monitor (*Varanus salvator*)
- Equatorial Spitting Cobra (*Naja sumatrana*)

Species are grouped into five categories: monkey, bird, snake, pig, and lizard.

## Main Features

### Species information

Stores and returns species information such as English, Malay and scientific names, taxonomy, protected status, introduced status, snake classification, identification keywords, category, and GBIF taxon key.

### Wildlife behaviour guidance

Provides species-specific information such as likely locations, what may cause the animal to move, safe-distance guidance, what to do if the animal is no longer visible, and source metadata.

### Immediate actions

Provides ordered safety actions for wildlife encounters, including English and Malay action text and source verification fields.

### Prevention actions

Provides practical recommendations for reducing repeated wildlife encounters. Prevention records may be associated with species, animal category, cause group, action type, harm rank, housing type, and whether the action costs money.

### Authority information

Stores relevant agencies, jurisdictions, contact routes, contact values, response guidance, and source verification metadata.

### Species media

The database stores **external image URLs and attribution metadata rather than image binary files**. A media record can contain the image URL, photographer, licence, and GBIF occurrence ID.

## Architecture

```text
User Browser
     |
     v
Static Frontend
(public/index.html)
     |
     v
Cloudflare Worker
(src/worker.js)
     |
     v
Read-only REST API
     |
     v
Neon PostgreSQL
```

The Cloudflare Worker serves both the static frontend and `/api/*` routes.

## Technology Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Cloudflare Workers, JavaScript / ES Modules
- Database client: `@neondatabase/serverless`
- Database: Neon PostgreSQL
- Deployment: Cloudflare Workers
- Source control: GitHub

## Database Schema

The current ERD contains eight tables.

| Table | Primary key | Purpose |
|---|---|---|
| `species` | `species_id` | Core species information |
| `animal_category` | `category_id` | Wildlife category definitions |
| `species_media` | `media_id` | External image URLs and attribution |
| `species_behaviour` | `behaviour_id` | Behaviour and encounter guidance |
| `immediate_action` | `action_id` | Immediate safety actions |
| `prevention_action` | `prevention_id` | Long-term prevention guidance |
| `authority` | `authority_id` | Agencies and contact routes |
| `state` | `state_code` | Malaysian state/jurisdiction reference data |

### ERD relationships

```text
animal_category.category_id
   |-- species.category_id
   |-- immediate_action.category_id
   |-- prevention_action.category_id
   `-- authority.category_id

species.species_id
   |-- species_media.species_id
   |-- species_behaviour.species_id
   |-- immediate_action.species_id
   `-- prevention_action.species_id
```

Important implementation notes:

- `state.state_code` is an integer primary key.
- `authority.jurisdiction` is stored as a varchar field and is not currently modelled as a foreign key to `state`.
- `species.category_id` and `authority.category_id` are required in the current schema.
- `species_media.species_id` and `species_behaviour.species_id` are required in the current schema.
- PostgreSQL exposes the unquoted `taxonKey` database column as lowercase `taxonkey`; the API aliases it back to `taxonKey`.

## Read-only API

The production backend is intentionally **read only**. Only `GET` requests are accepted for API routes.

### Health check

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

### Animal categories

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

### Table diagnostic

```http
GET /api/tables
```

This returns table names only. There is no generic endpoint that allows a caller to choose and query arbitrary tables.

## Security Design

- API routes accept `GET` only.
- `POST`, `PUT`, `PATCH`, and `DELETE` requests are rejected.
- The website backend does not implement `INSERT`, `UPDATE`, `DELETE`, or schema-changing operations.
- The Neon connection string is stored as a Cloudflare secret named `DATABASE_URL`.
- Database credentials must not be committed to GitHub.
- A PostgreSQL role with `SELECT`-only permissions is recommended for production use.

## Environment Configuration

The Cloudflare Worker requires:

```text
DATABASE_URL
```

Use a Neon pooled PostgreSQL connection string as the value.

For local development, create `.dev.vars` from `.dev.vars.example` and add the real connection string. Do not commit `.dev.vars`.

## Local Development

```bash
npm install
npm run dev
```

Deploy manually with:

```bash
npm run deploy
```

## Project Structure

```text
5120_tm01_project/
├── public/
│   ├── index.html
│   ├── api-data.js
│   └── ...static frontend assets
├── src/
│   └── worker.js
├── .dev.vars.example
├── BACKEND_SETUP.md
├── package.json
├── wrangler.jsonc
└── README.md
```

Earlier standalone HTML files remain in the repository as development snapshots. The deployed frontend is served from the `public` directory.

## Project Status

The current implementation includes a static wildlife coexistence frontend, Cloudflare Worker deployment, Neon PostgreSQL connectivity, the eight-table ERD above, dedicated read-only REST endpoints, and a frontend API data layer with fallback support.

---

**Room for Both** — supporting safer interactions between people and urban wildlife.
