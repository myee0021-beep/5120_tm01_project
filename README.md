# Room for Both

**Room for Both** is a wildlife-coexistence web application for Malaysian residents. It helps users identify supported wildlife, see verified immediate safety guidance, understand likely behaviour, reduce repeat encounters, and find the relevant authority.

## Iteration 1 architecture

```text
Browser
  ↓
Cloudflare Worker + static frontend
  ↓
Read-only /api/* endpoints
  ↓
Neon PostgreSQL
```

The production application is intentionally **database-driven for business data**. Business content defined by the project ERD is loaded from Neon; the frontend does not keep a second embedded copy as a business-data fallback.

The one deliberate presentation exception is **species photography**. The V1.2 species photos remain static frontend presentation assets so the existing visual interface can be retained reliably. Those images do not supply species names, safety actions, behaviour guidance, prevention guidance, authority records, state records, or other business content.

If a database record is missing, the UI shows an empty/not-verified state or omits the field. It does **not** silently replace missing data with hard-coded business content.

Values such as `NA`, `N/A`, null, undefined, or an empty string are treated as empty and are not rendered as resident-facing business content.

## Frontend

The Iteration 1 V1.2 user flow is retained, including Identify, Immediate Safety, Authority, Keep It Findable, Species Information, About/Data Sources, and supporting state views.

Static HTML/CSS/JavaScript is responsible for layout, navigation, labels, interaction, presentation logic, and presentation photos. Wildlife records, categories, actions, authority records, state records, behaviour guidance, and prevention guidance come from Neon.

The generic snake route intentionally avoids exposing a specific snake species identity to residents. Snake safety content is loaded by category where appropriate.

## Database tables

| Table | Purpose |
|---|---|
| `species` | Core species data and identification keywords |
| `animal_category` | Wildlife categories and responsible-body type |
| `species_media` | Media/source metadata retained in the ERD and read-only API |
| `species_behaviour` | Likely location, movement, safe-distance and lost-sight guidance |
| `immediate_action` | Ordered immediate safety actions |
| `prevention_action` | Prevention actions, housing/cause/cost/harm metadata |
| `authority` | Jurisdiction-specific agency and contact information |
| `state` | Malaysian state/jurisdiction reference data |

### Key relationships

```text
animal_category.category_id
   ├─ species.category_id
   ├─ immediate_action.category_id
   ├─ prevention_action.category_id
   └─ authority.category_id

species.species_id
   ├─ species_media.species_id
   ├─ species_behaviour.species_id
   ├─ immediate_action.species_id
   └─ prevention_action.species_id
```

Implementation notes:

- `state.state_code` is an integer primary key.
- `authority.jurisdiction` is a varchar field, not a foreign key to `state` in the current ERD.
- PostgreSQL exposes the unquoted `taxonKey` column as `taxonkey`; the API aliases it back to `taxonKey`.
- The current ERD field is `action_kind`, not `action_type`.
- `species_media` stores URLs/metadata and remains queryable through the read-only API, but it is not used to render the V1.2 presentation photos.

## Read-only API

Only `GET` requests are accepted. The website backend does not implement `INSERT`, `UPDATE`, `DELETE`, or schema-changing operations.

```http
GET /api/health
GET /api/data-status
GET /api/species
GET /api/species?id=1
GET /api/species?category_id=1
GET /api/species?is_snake=true
GET /api/categories
GET /api/states
GET /api/states?state_code=1
GET /api/species-media?species_id=1
GET /api/species-behaviour?species_id=1
GET /api/immediate-actions?species_id=1
GET /api/immediate-actions?category_id=1
GET /api/prevention-actions?species_id=1
GET /api/prevention-actions?category_id=1
GET /api/authority?category_id=1&jurisdiction=Selangor
GET /api/tables
```

`/api/data-status` is a read-only deployment diagnostic that reports row counts for the eight ERD tables and media coverage. It does not expose credentials or arbitrary SQL access.

## Presentation media

Species photography is intentionally separated from business data:

```text
public/frontend-media.js  -> presentation photos only
Neon /api/*               -> business data
```

`frontend-media.js` contains the V1.2 presentation images and their visual-source attribution. It does not contain safety guidance, authority details, state statistics, species behaviour, prevention actions, or other business rules.

The `species_media` database table remains part of the ERD and can still be inspected through `/api/species-media`, but the current database rows contain source-page URLs rather than direct image-file URLs. The resident-facing V1.2 UI therefore does not use those rows as `<img src>` values.

## Security

- API routes are GET-only.
- Database credentials are read from the Cloudflare runtime secret `DATABASE_URL`.
- Real credentials must not be committed to GitHub.
- `.gitignore` excludes `.dev.vars`, `.env`, `.env.*`, `node_modules/`, and Wrangler local state.
- Repository-side credential review evidence is recorded in `SECURITY_CONFIRMATION.md`.
- A database role limited to `SELECT` is recommended for production defence in depth.

## Project structure

```text
5120_tm01_project/
├── public/
│   ├── index.html              # production frontend
│   ├── frontend-media.js       # static V1.2 presentation photos only
│   ├── api-data.js             # Neon-backed business data/rendering layer
│   └── v12-ui.js               # Iteration 1 V1.2 UI/flow compatibility
├── src/
│   └── worker.js               # Cloudflare Worker + read-only API
├── scripts/
│   ├── apply_db_only_frontend.py
│   └── use-frontend-media.js
├── .github/workflows/
│   ├── apply-db-only-frontend.yml
│   └── verify-production-data.yml
├── archive/legacy-html/        # superseded development snapshots
├── BACKEND_SETUP.md
├── SECURITY_CONFIRMATION.md
├── package.json
├── wrangler.jsonc
└── README.md
```

The source-level sanitizer prevents the old embedded prototype business dataset from being reintroduced into `public/index.html`. Production business data remains Neon-backed; presentation photography remains frontend-managed by design.

## Local development

Create `.dev.vars` locally with the Neon connection string, then run:

```bash
npm install
npm run dev
```

Manual deployment:

```bash
npm run deploy
```

Do not commit `.dev.vars` or any real connection string.

---

**Room for Both** — supporting safer interactions between people and urban wildlife.
