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

The current database includes seven example species commonly relevant to the project:

- Long-tailed Macaque (*Macaca fascicularis*)
- Wild Boar (*Sus scrofa*)
- Common Myna (*Acridotheres tristis*)
- Reticulated Python (*Malayopython reticulatus*)
- House Crow (*Corvus splendens*)
- Common Water Monitor (*Varanus salvator*)
- Equatorial Spitting Cobra (*Naja sumatrana*)

Species are grouped into the following categories:

- monkey
- bird
- snake
- pig
- lizard

## Main Features

### Species information

Displays structured information such as:

- English, Malay, and scientific names;
- taxonomic information;
- protected status;
- native or introduced status;
- species identification keywords;
- animal category.

### Wildlife behaviour guidance

Provides species-specific information such as:

- likely locations;
- what may cause the animal to move;
- safe-distance guidance;
- what to do if the animal is no longer visible;
- supporting source information.

### Immediate actions

Provides ordered safety actions for wildlife encounters, with support for English and Malay content.

### Prevention actions

Provides practical recommendations for reducing future wildlife encounters. Advice can be associated with factors such as:

- species;
- animal category;
- housing type;
- cause group;
- action type;
- harm ranking;
- whether the action requires spending money.

### Authority information

Stores relevant authority and contact information based on animal category and jurisdiction.

### Species media

The database stores **media URLs and attribution metadata rather than image binary files**. This keeps the database lightweight while allowing the frontend to display externally hosted wildlife images.

Media records may include:

- image URL;
- photographer;
- licence;
- GBIF occurrence ID.

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

The same Cloudflare Worker serves both the static frontend and `/api/*` routes.

## Technology Stack

### Frontend

- HTML
- CSS
- JavaScript
- Static assets served through Cloudflare Workers Assets

### Backend

- Cloudflare Workers
- JavaScript / ES Modules
- `@neondatabase/serverless`

### Database

- Neon PostgreSQL

### Deployment

- Cloudflare Workers
- GitHub-based source control

## Database Schema

The PostgreSQL database currently contains the following tables:

| Table | Purpose |
|---|---|
| `species` | Core species information |
| `animal_category` | Wildlife category definitions |
| `species_behaviour` | Behaviour and encounter guidance |
| `species_media` | Image URLs and media attribution |
| `immediate_action` | Immediate safety actions |
| `prevention_action` | Long-term prevention guidance |
| `authority` | Relevant agencies and contact routes |
| `state` | Malaysian state and jurisdiction information |

### Main relationships

```text
animal_category
      |
      +---- species
      |
      +---- authority

species
  |
  +---- species_behaviour
  +---- species_media
  +---- immediate_action
  +---- prevention_action
```

## Read-only API

The production backend is intentionally designed as a **read-only API**.

Only `GET` requests are accepted for API routes. Database write operations are not implemented.

### Health check

```http
GET /api/health
```

Checks the Worker-to-Neon database connection using a `SELECT` query.

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

### Database table diagnostic

```http
GET /api/tables
```

This returns table names only and does not provide arbitrary SQL access.

## Security Design

The backend is intentionally limited to read operations.

- API routes accept `GET` only.
- `POST`, `PUT`, `PATCH`, and `DELETE` requests are rejected.
- Application code contains no `INSERT`, `UPDATE`, `DELETE`, or `CREATE TABLE` workflow for the website.
- The Neon database connection string is stored as a Cloudflare secret named `DATABASE_URL`.
- Database credentials must never be committed to GitHub.

For additional protection, a PostgreSQL role with `SELECT`-only permissions is recommended for production use.

## Environment Configuration

The Cloudflare Worker requires the following runtime secret:

```text
DATABASE_URL
```

Use a Neon pooled PostgreSQL connection string as its value.

For local development, create a `.dev.vars` file based on `.dev.vars.example`:

```text
DATABASE_URL=your_neon_connection_string
```

Do not commit `.dev.vars` or real database credentials.

## Local Development

Install dependencies:

```bash
npm install
```

Start the local Cloudflare Worker development server:

```bash
npm run dev
```

Deploy manually with Wrangler:

```bash
npm run deploy
```

## Project Structure

```text
5120_tm01_project/
├── public/
│   ├── index.html
│   └── ...static frontend assets
├── src/
│   └── worker.js
├── .dev.vars.example
├── BACKEND_SETUP.md
├── package.json
├── wrangler.jsonc
└── README.md
```

Some earlier standalone HTML versions remain in the repository as development snapshots. The deployed frontend is served from the `public` directory.

## API Design Principles

The API follows several simple principles:

1. **Read only** — the public website does not modify database records.
2. **Resource-based endpoints** — the frontend requests species, behaviours, actions, media, authorities, and states through dedicated routes.
3. **Parameterized queries** — request parameters are passed safely to PostgreSQL queries.
4. **Frontend resilience** — the frontend can retain embedded fallback information if database-backed content is temporarily unavailable.
5. **Separation of content and media** — PostgreSQL stores image links and attribution metadata rather than image binary files.

## Data Sources and Attribution

Wildlife information should be supported by appropriate source URLs and verification metadata stored in the relevant database tables.

Where external species media is used, the corresponding photographer, licence, and source information should be retained and displayed where required.

## Project Status

The current implementation includes:

- static wildlife coexistence frontend;
- Cloudflare Worker deployment;
- Neon PostgreSQL connectivity;
- structured wildlife database schema;
- dedicated read-only REST endpoints;
- database-backed species and category retrieval;
- frontend API integration layer with fallback support.

Further development can expand species coverage, improve frontend database integration, validate media availability, and extend state-specific authority information.

---

**Room for Both** — supporting safer interactions between people and urban wildlife.
