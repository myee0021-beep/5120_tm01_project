# Iteration 2 — AI-powered "Describe it" + snake-safety fixes

This note covers the changes made in this iteration on top of the Iteration 1
architecture described in `README.md`. It is meant as a handoff/PR-description
reference, not a replacement for the main README.

## Summary

1. The Identify page's **"Describe it"** free-text route is now backed by a
   real AI call (MiniMax API) instead of local keyword scoring only.
2. A live-testing bug report surfaced four safety-related gaps in the
   Identify flow, all fixed in this iteration (see below).

## 1. AI-powered "Describe it"

**Files:** `src/worker.js`, `public/index.html`, `.dev.vars.example`

- New endpoint: `POST /api/identify-describe`. Takes `{ text }`, sends it to
  the MiniMax API (`MiniMax-Text-01`, `https://api.minimax.io/v1/text/chatcompletion_v2`)
  with a system prompt listing the 5 non-snake species this product covers,
  and returns `{ ok: true, species_ids: [...] }`.
- The prompt is deliberately lenient: a vague-but-plausible description gets
  a low-confidence match rather than an empty result (the frontend shows it
  as a dismissible card, so a wrong low-confidence guess is safe to surface).
  It only returns an empty list when the text has no real connection to any
  of the 5 species.
- Snake is **not** in the species list the AI can choose from — snake
  reports are meant to be caught by a local keyword check before the AI is
  ever called (see fix #1 below). As defence in depth, the prompt also tells
  the model never to force a snake-sounding description onto a lizard/other
  species — return empty instead of guessing.
- Frontend (`id_describeBtn` handler in `public/index.html`) calls this
  endpoint with an 8s timeout and falls back to the original local
  keyword-scoring match if the call fails, times out, or the API key isn't
  configured — the feature never hard-fails.
- `public/iteration1-fixes.js` had a leftover `enforceDescribeHidden()`
  patch from when this tab was previously pulled from the UI pending this
  exact model/provider decision. That patch has been removed since the tab
  is back and AI-backed.

**Setup required to actually use it:**

- Local dev: create `.dev.vars` (gitignored, never commit) with
  `MINIMAX_API_KEY=...` — see `.dev.vars.example`.
- Production: `npx wrangler secret put MINIMAX_API_KEY` — a one-time step,
  independent of git pushes/deploys.
- If the key isn't set, the endpoint returns `501` and the frontend silently
  falls back to local matching — nothing breaks, "Describe it" just behaves
  like it did before this iteration.

## 2. Safety fixes from live testing

Found by manually testing the deployed site against edge-case inputs.

### a) Snake reports misidentified as a harmless species

`SNAKE_TERMS` in `public/index.html` only covered `ular`/`snake`/`cobra`.
"a reticulated python in my roof" and "I saw a viper" matched nothing, and
"there is a long reptile in my bathroom" came back as **Water Monitor
Lizard** — a snake described without the word "snake" was returned as a
harmless lizard.

Fix: widened the term list to
`['ular','snake','cobra','python','sawa','viper','tedung','serpent','reptile']`
and changed the regex to `\b(...)s?\b` so plurals ("vipers", "pythons")
match too. `reptile` is included deliberately even though it's ambiguous
with the water monitor (also a reptile) — routing an ambiguous case to the
snake safety gate is the safe failure mode; routing it to a wrong species
card is not. Also added a matching instruction in the MiniMax prompt so an
unlisted synonym doesn't get force-matched to a lizard either.

### b) Snake route was still showing a real photo + species name

The snake gate promises "no species name or photo is shown," but
`assets/naja-sumatrana.jpg` (plus its iNaturalist credit/source link, which
names the exact species) was still rendered on:

- the snake candidate card in Describe it / Keyword results,
- the snake "What to do now" page's hero image (a hardcoded `<img>`, not
  JS-rendered — easy to miss),
- the shared `renderIdentityHeader`/`renderPhotoIcon` header helpers.

All of these now show `ICONS.alert` (a neutral warning glyph already
defined for this purpose) instead, with the photo credit/source link
removed entirely for the snake case. The **About the Data** page's photo
sources list is unaffected on purpose — it's a site-wide data-provenance
page, not part of the restricted snake identification/safety route, so it
still documents the real photo asset.

### c) Bite + symptom reports had nowhere to go

"something bit me and I feel dizzy" matched no species and returned
nothing. Added a routing-only fix (no new first-aid content — the 999
guidance already exists on the relevant pages, and any named-authority
first-aid content is planned for iteration 2's follow-up, not part of this
change): if the text contains both a bite/injury word (`bit`, `bitten`,
`gigit`, `cakar`, ...) **and** a symptom word (`dizzy`, `bleeding`,
`swollen`, `pening`, `berdarah`, ...), it routes straight to the existing
general/unconfirmed-species "What to do now" page, which already has a
"call 999 if anyone is in immediate danger" authority note. Requiring both
words avoids false positives like "the monkey bit into the fruit."

### d) "Who deals with this" / "Keep it findable" read as either/or

At the end of the Immediate Safety step, one button was styled as
primary/dark and the other as secondary/light — visually implying a choice
between the two, when a resident should realistically do both. Both buttons
now use the same visual weight (dark, solid) on both the regular "What to
do now" page and the snake-specific page.

### e) Not fixed — needs reproduction

"Common Myna missing from the keyword browse list" (search finds it, but
it's reportedly not in the default/unfiltered list) could not be reproduced
against this codebase — `renderKeywordList('')`, the `ANIMALS` array, and
the Common Myna species record all look correct and uncapped. This may be a
stale-deployment issue (the live site running older code than this
checkout) rather than a code bug here. Needs a repro against the actual
deployed build before changing anything.

## Testing checklist

Run `npx wrangler dev`, then in the Identify → Describe it / Keyword tabs:

| Input | Expected |
|---|---|
| `a reticulated python in my roof` | Snake safety redirect, no photo/name |
| `I saw a viper` | Snake safety redirect, no photo/name |
| `there is a long reptile in my bathroom` | Snake safety redirect (not Water Monitor) |
| `something bit me and I feel dizzy` | Urgent-attention redirect to general What To Do |
| `a monkey bit into my fruit` | Normal identification (no false emergency redirect) |
| `a troop of monkeys came through my window` | Normal AI-backed match (regression check) |
| (empty input) | "Type a description first" prompt, no API call |

Also visually check: the snake "What to do now" page header (icon, not
photo), and the two buttons at the end of any species' Immediate Safety
step (equal visual weight).

## Files touched this iteration

- `src/worker.js` — new `/api/identify-describe` endpoint + AI prompt
- `public/index.html` — Describe it wiring, snake term list, photo removal,
  bite/symptom routing, button styling
- `public/iteration1-fixes.js` — removed the stale Describe-it-hiding patch
- `.dev.vars.example` — documents `MINIMAX_API_KEY`

`.dev.vars` itself (the real key) is local-only and must never be committed
or shared — see `README.md`'s Security section.
