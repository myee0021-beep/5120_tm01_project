# Room for Both — Iteration 2

**Room for Both** is a bilingual wildlife-coexistence web application for Malaysian residents. Iteration 2 focuses on four resident tasks:

1. identify what animal may be involved;
2. get immediate safety guidance without delaying urgent action;
3. understand evidence-based signals for the selected state/species;
4. generate and print a sourced prevention plan for the home.

**Iteration 2 deployment target:** `https://iteration2.myee0021.workers.dev`

The application is designed for resident-facing use rather than expert wildlife identification. It deliberately avoids presenting a probability or synthetic “risk score” for a household. Where evidence is incomplete, the UI shows the underlying records, source and verification status instead of inventing a result.

---

## 1. Iteration 2 architecture

```text
Browser / SPA
  │
  ├─ Home / Plan / Plan Result / Ecosystem / Emergency / Print
  │
  ▼
Cloudflare Worker
  ├─ SPA routing and runtime script injection
  ├─ Neon-backed Iteration 2 APIs
  ├─ MiniMax AI routes
  └─ print / state-persistence compatibility layer
  │
  ├──────────────► Neon PostgreSQL
  │                 ├─ prevention_action
  │                 ├─ complaint_series
  │                 ├─ attractant_rule
  │                 ├─ species / category data
  │                 └─ optional search-failure log
  │
  └──────────────► MiniMax API
                    ├─ Describe it — wildlife matching
                    └─ Plan in plain words — grounded plan summary
```

The active Cloudflare entry point is:

```text
src/worker-plan-print-entry.js
```

as configured in `wrangler.jsonc`.

The Worker stack is intentionally layered so later fixes can be isolated without rewriting the original SPA:

```text
worker-plan-print-entry.js
  → worker-state-persistence.js
      → worker-plan-summary.js
          → worker-iteration2.js
```

Dedicated handlers are also used for:

```text
src/plan-db-route.js       POST /api/i2/plan
src/identify-describe.js   POST /api/identify-describe
```

---

## 2. Main resident flow

### Home

The resident chooses a state and provides basic information about the encounter/home. State selection is persisted across SPA navigation so the same state is reused by Plan Result and Print.

The Home complaint figure is loaded from the reconciled complaint dataset. It uses a **species-specific state row** where available rather than substituting the all-species total.

### Plan questionnaire

The Plan questionnaire records resident answers such as:

- species seen;
- food / waste conditions;
- neighbour feeding;
- fruit trees or other documented attractants;
- housing-related conditions.

These answers are used to select database-backed prevention actions and evidence signals.

### Plan Result

Plan Result separates three evidence types instead of merging them into one risk score:

- **Recorded occurrences** — GBIF occurrence records for the selected state/species;
- **Conflict complaints** — reconciled PERHILITAN complaint rows for the selected state/species;
- **Documented attractants matched** — home answers matched to sourced attractant guidance.

The page also includes:

- species-by-species seasonality;
- sourced prevention actions;
- optional AI “Plan in plain words” summary;
- resident-specific summary line generated from the actual answers;
- print workflow.

### Print

The print page rebuilds the current plan from the stored plan snapshot. Prevention actions are selectable before printing and default to included. Print recovery logic avoids falling back to stale fixed plan content.

---

## 3. Emergency flow

The emergency flow starts with one question:

> **Is it a snake?**

The routing rule is intentionally conservative:

```text
Yes / Not sure
    → go directly to snake safety guidance
    → do not ask for species name or photo first

No, definitely not a snake
    → resident may use Describe it or Guided Q&A
```

This prevents the identification interface from delaying safety guidance when a snake may be involved.

The emergency flow also provides state/jurisdiction options and resident-facing navigation to the next relevant step.

---

# 4. AI features

Iteration 2 contains **two active AI features**. AI is used only where it adds a resident-facing explanation or matching step; the core complaint, occurrence, attractant and prevention data remain deterministic and source-backed.

## 4.1 Describe it — AI wildlife matching

**Route**

```http
POST /api/identify-describe
```

**Backend**

```text
src/identify-describe.js
```

**Model**

```text
MiniMax-Text-01
```

### Purpose

Residents can describe a non-snake animal in ordinary English, Malay or mixed language. The model returns likely matches from a **fixed whitelist only**.

Current AI whitelist:

- House Crow;
- Long-tailed Macaque;
- Water Monitor Lizard;
- Wild Boar;
- Common Myna.

The model is not allowed to invent a new species ID or name. It returns at most three candidates and the server filters the result against the approved identifiers before sending it to the browser.

Expected model shape:

```json
{
  "matches": [
    {
      "species_id": "macaque",
      "confidence": "high"
    }
  ]
}
```

### Safety behaviour

Snake-like descriptions do not become a free-form AI snake identification task. The emergency interface routes snake / uncertain-snake cases to the dedicated snake safety path instead.

### Failure behaviour

The AI request has a short timeout and returns a controlled error if the provider is unavailable or returns malformed output. The resident can continue with **Guided Q&A** instead.

The resident’s typed description is used for the request; the application does not persist the free-text description as a business-data record.

---

## 4.2 Plan in plain words — grounded AI summary

**Route**

```http
POST /api/i2/plan-summary
```

**Backend**

```text
src/worker-plan-summary.js
```

**Frontend**

```text
public/plan-ai-summary.js
```

**Model**

```text
MiniMax-Text-01
```

### Purpose

The AI converts the already displayed prevention-action rows into a short plain-language paragraph.

The AI does **not** receive the resident’s full free-text description. Its source of truth is the small set of sourced prevention rows already displayed on Plan Result.

### Grounding rules

The server validates every generated summary before it is displayed:

- output must contain **4–6 sentences**;
- the model must not introduce a number absent from the source rows;
- the model must not introduce an animal/species term absent from the source rows;
- the prompt forbids adding new risk, place, date, cause, action, recommendation, prediction or safety advice;
- synonymous/plain-language wording is allowed;
- one retry is allowed after a validation failure.

If validation fails twice, the AI paragraph is hidden and the resident is directed back to the verified action table.

Validated summaries are cached using a key derived from the displayed action rows and language, so repeated requests for the same plan do not unnecessarily call the model again.

### Important design decision

**AI does not calculate the household risk level.**

Iteration 2 intentionally removed the earlier combined-risk presentation. Occurrence records, complaints and attractant matches remain separate documented signals.

---

## 5. Database-backed Plan generation

**Route**

```http
POST /api/i2/plan
```

**Handler**

```text
src/plan-db-route.js
```

The Plan API reads `prevention_action` from Neon and selects actions using the resident’s submitted context.

Matching considers:

- selected species;
- documented cause groups;
- housing type where applicable;
- available English / Bahasa Melayu action text;
- source information;
- verification date.

If there is no exact cause/housing match, the API may fall back to general actions for the selected species. It still requires each returned resident-facing action to have a usable action text, source and verification date.

The frontend stores the successfully loaded plan as a session snapshot so the print page can reproduce the same plan rather than generating unrelated static content.

---

## 6. Complaint data

The Iteration 2 complaint dataset uses an explicit aggregate-row convention:

```text
one row = one state / species / year aggregate
species_id IS NULL = authoritative all-species state total
```

For resident-facing species cards, Plan Result and Home select the **matching species row** and do not substitute the all-species total when a species-specific number is required.

Example:

```text
Selangor / Long-tailed Macaque / 2020 → species-specific complaint cases
```

The UI shows the source and a plain verification date.

Relevant API:

```http
GET /api/i2/complaints?state=selangor
GET /api/i2/complaints?state=selangor&species=macaque
```

---

## 7. Occurrence records and seasonality

Occurrence data are kept separate from complaint data.

Iteration 2 distinguishes:

```text
total       = all occurrence records for the selected state/species
datedTotal  = records with a usable year and month
```

`total` is used for the **Recorded occurrences** signal.

`datedTotal` is used for the monthly seasonality profile.

The monthly profile uses a threshold of **30 dated records**:

- below 30: no chart is drawn and the actual dated record count is shown;
- 30 or above: a 12-month bar chart is rendered for that species.

The chart represents records of where the species was reported, **not a count of individual animals and not a probability for the resident’s address**.

The current reconciled occurrence total used by the resident-facing copy is **47,033**, and GRIIS is spelled consistently as **GRIIS**.

---

## 8. Documented attractants

The frontend loads documented attractant rows from:

```http
GET /api/i2/attractants
```

Resident answers are normalised and deduplicated before matching.

Important matching behaviour:

- `no`, `false`, `none`, `not sure` and equivalent empty answers are ignored;
- generic `yes` is not displayed as an attractant label;
- neighbour feeding can be normalised to a meaningful label;
- one resident answer produces at most one best matching attractant row per species;
- a species-only match is not enough — there must first be a lexical answer/row match before a species bonus is applied;
- displayed rows require source information and a verification date.

This prevents duplicated rows and avoids showing unrelated guidance simply because it belongs to the same species.

---

## 9. Resident-specific summary line

`public/plan-result-consistency.js` rebuilds the Plan Result summary line from the actual session answers.

This prevents old state mock copy such as a fixed “macaque and monitor” sentence from appearing when the resident selected only one of those animals.

The same corrected summary is written back into the current plan snapshot so Print remains consistent with Plan Result.

---

## 10. Important APIs

```http
GET  /api/health
GET  /api/i2/status
GET  /api/i2/complaints
GET  /api/i2/attractants
GET  /api/i2/prevention-actions
POST /api/i2/plan
POST /api/i2/plan-summary
POST /api/identify-describe
POST /api/i2/search-failure
```

These APIs are served through the layered Cloudflare Worker. The outer Worker intercepts the active AI and stable Plan routes before delegating to the lower Iteration 2 worker.

---

## 11. Main files

```text
5120_tm01_project/
├── public/
│   ├── index0914.html                # main Iteration 2 SPA
│   ├── home-live-data.js             # Home complaint signal
│   ├── plan-db-client.js             # database-backed Plan Result actions
│   ├── plan-signals-client.js        # occurrences, complaints, attractants, seasonality
│   ├── plan-ai-summary.js            # Plan in plain words frontend
│   ├── plan-result-consistency.js    # resident-answer summary/data consistency
│   ├── plan-snapshot-sync.js         # current-plan snapshot synchronisation
│   ├── print-plan-recovery.js        # rebuild/recover current print plan
│   ├── print-selected-actions.js     # selectable actions for print
│   ├── emergency-flow-ac.js          # emergency-flow AC fixes
│   ├── emergency-identify-fix.js     # Guided Q&A / Describe interaction fixes
│   ├── ac-compliance.js              # resident-facing AC/data corrections
│   └── about-ai-routes.js            # AI explanation on About the Data
├── src/
│   ├── worker-plan-print-entry.js    # active Wrangler entry point
│   ├── worker-state-persistence.js   # SPA/state/script runtime layer
│   ├── worker-plan-summary.js        # grounded MiniMax Plan summary
│   ├── worker-iteration2.js          # Iteration 2 Neon/API worker
│   ├── plan-db-route.js              # stable database Plan API
│   └── identify-describe.js          # MiniMax Describe-it backend
├── database_code/
│   └── iteration2_complaint_series.sql
├── .dev.vars.example
├── package.json
├── wrangler.jsonc
└── README.md
```

---

## 12. Environment variables

Local development uses `.dev.vars`.

Required secrets:

```text
DATABASE_URL       Neon PostgreSQL connection string
MINIMAX_API_KEY    MiniMax API key for active AI routes
```

Example:

```bash
cp .dev.vars.example .dev.vars
```

Never commit real credentials.

Production secrets should be configured through Wrangler, for example:

```bash
npx wrangler secret put DATABASE_URL
npx wrangler secret put MINIMAX_API_KEY
```

---

## 13. Local development

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Deploy Iteration 2:

```bash
npm run deploy
```

or:

```bash
npx wrangler deploy
```

The project uses `@neondatabase/serverless` for Neon access and Cloudflare Wrangler for local/runtime deployment.

---

## 14. Iteration 2 design principles

Iteration 2 follows these implementation rules:

- **Safety before identification** — “Yes” or “Not sure” for snake routes directly to snake guidance.
- **No invented risk score** — evidence signals remain separate.
- **Species-specific complaints where required** — do not replace them with the all-species state total.
- **Occurrence records are not animal counts** — the UI states this explicitly.
- **Monthly seasonality uses dated records only** — total occurrence count and dated count are separate values.
- **Source + verification date** — resident-facing prevention and attractant guidance must be traceable.
- **AI is constrained and optional** — deterministic / guided paths remain usable if AI fails.
- **AI output is validated before display** — model text is not automatically trusted.
- **Resident answers drive resident copy** — fixed mock summary text is not treated as user-specific truth.
- **Print should reproduce the current plan** — not a stale or unrelated plan.

---

## 15. Privacy and security

- Database credentials and AI provider keys are stored as runtime secrets, not source code.
- `.dev.vars` and real environment files must not be committed.
- The Describe-it free-text request is used for matching and is not inserted into the project business tables.
- Plan AI receives the displayed prevention rows rather than the resident’s full free-text description.
- API responses use `cache-control: no-store` where resident/context-sensitive data are involved.
- AI failures return controlled fallback states rather than exposing provider credentials or raw internal errors to the resident UI.

---

**Room for Both — Iteration 2**  
Supporting safer, more evidence-based coexistence between Malaysian residents and urban wildlife.
