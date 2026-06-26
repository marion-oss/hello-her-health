# Anoqi — System Handover

Last updated: 2026-05-18 (Option C posture + privacy/safety PRs + brand v2.0)
Supersedes (does not delete): [`PHASE_1_RAG.md`](./PHASE_1_RAG.md), which covers Phase 1 RAG only.

> ## ⚠️ Architecture update — 2026-06-26 (read this first)
>
> The sections below describe **two parallel backends** (a Supabase Edge Function
> and a Cloudflare Worker) and say both authenticate to Gemini with an
> **AI Studio API key** (`GEMINI_API_KEY`). **That is no longer true.** Current
> state:
>
> - **One backend: the Cloudflare Worker `anoqi-api-staging`.** It serves
>   `POST /chat`, `POST /documents`, and `POST /summaries`. The app talks only
>   to this Worker, via `EXPO_PUBLIC_ANOQI_API_URL`
>   (`https://anoqi-api-staging.marion-8c0.workers.dev`).
> - **Gemini is reached through Vertex AI, not AI Studio.** The Worker mints a
>   Google service-account OAuth token (`workers/be/src/lib/vertexAuth.ts`) from
>   the **`VERTEX_SA_JSON`** secret and calls `aiplatform.googleapis.com`. There
>   is **no `GEMINI_API_KEY`** anymore. Vertex AI only accepts OAuth, never API
>   keys — this is why a leftover AI-Studio key returned **403**.
> - **Models:** `gemini-3.5-flash` (chat), `gemini-3.5-pro` (summaries).
> - **The Supabase Edge Functions are removed.** `supabase/functions/{chat,
>   documents,summaries}` and their AI-Studio source (`api/functions/chat.ts`,
>   `api/functions/documents.ts`, `api/lib/gemini.ts`) are gone. `api/lib/gemini.ts`
>   may briefly survive only as a test dependency of `summaries.test.ts`.
> - Still on Supabase (unchanged): the **Postgres database + Auth (JWT)**. The
>   Worker verifies those same JWTs.
>
> Everything from here down is kept for history. Where it conflicts with this
> box, this box wins.

**Looking for *how* to do something?**
- [`RUNBOOK.md`](./RUNBOOK.md) — deploy, rotate keys, flip flags, fix common errors
- [`BRAND.md`](./BRAND.md) — visual identity: palette, type, the form, component anchors

This file explains *what* the system is and *why*. The other two cover *how to operate it* and *how it should look*.

---

## TL;DR

**What we built (last two sessions):**

1. **Anoqi's chat now cites real medical sources.** When a user asks about contraception, symptoms, etc., the system pulls relevant snippets from a curated library (physician-authored pathways + a vetted source list) and the LLM answers grounded in those snippets, with `[S1] [S2]` style citations rendered as tappable badges. This is "RAG" — Retrieval-Augmented Generation.

2. **The whole backend now also runs on Cloudflare Workers**, in parallel with the existing Supabase Edge Functions. Same database, same auth, same behaviour — just a second compute path. Mobile + web can switch over when ready.

3. **Web is now live.** The mobile app's UI runs as a web SPA at <https://anoqi-app-staging.marion-8c0.workers.dev>, served by a Cloudflare Worker.

**Why RAG (in plain terms):**

Without RAG, the LLM made up answers from its training data — confident but unverified. With RAG, the LLM is told *"answer using only these specific physician-approved snippets"*, and it cites which one it used. This:

- **Reduces hallucinations.** The model anchors to real text instead of inventing.
- **Adds traceability.** Every claim has a footnote. A reviewer can audit which source informed any answer.
- **Lets physicians control content.** Editing `clinical_pathways` rows in the database changes what the chatbot says — no model retraining needed.
- **Sets up regulatory defensibility.** "The chatbot says what physicians wrote, not what an LLM imagines" is a defensible posture for medical-adjacent advice.

**How to use it (the user-facing behaviour):**

- Open <https://anoqi-app-staging.marion-8c0.workers.dev> (or the iOS/Android Expo build)
- Send a message in any journey (symptoms, contraception, etc.)
- Get a French response, normally with citation badges below it (e.g. `[S2] Choisiruntraitement.fr — Contraception`)
- Tap a badge to open the source URL

**Operational posture (post-Option-C decision, 2026-05-18):**

RAG is **off by default** on both backends for public traffic. Named pilot users (you, physicians, named testers) get RAG via an allowlist secret `ANOQI_RAG_PILOT_USERS`. To turn it on globally, set `ANOQI_RAG_ENABLED=true` on the relevant backend. See "Two parallel BE paths" below for the gate logic.

---

## How to use the system right now

| Surface | URL | What it does |
|---|---|---|
| **Web chat** | <https://anoqi-app-staging.marion-8c0.workers.dev> | Expo web build of `app/` — talks to the CF Worker (`/chat`, `/documents`, `/summaries`) |
| **Mobile** | `cd <repo> && npx expo start` | Same React Native code as web — talks to the CF Worker |
| **CF Worker (live backend)** | `https://anoqi-api-staging.marion-8c0.workers.dev/chat` | The single backend. Gemini via Vertex OAuth. Public traffic: RAG off; pilot list: RAG on. |
| ~~Supabase Edge `/chat`~~ | _(removed 2026-06-26)_ | Retired AI-Studio path. Was the source of the 403. |
| **CF Worker `/health`** | `https://anoqi-api-staging.marion-8c0.workers.dev/health` | Liveness probe |

To redeploy the FE Worker after a UI change in `app/`:

```bash
cd workers/fe
npm run deploy        # rebuilds Expo web → workers/fe/assets, then wrangler deploy
```

To redeploy the BE Worker after a backend change:

```bash
cd workers/be
npx wrangler deploy
```

To add or remove a pilot user (closed-pilot path):

```bash
# CF Worker (secret) — current value is overwritten, so include the full list
cd workers/be
echo "uuid1,uuid2,uuid3" | npx wrangler secret put ANOQI_RAG_PILOT_USERS

# Supabase Edge — dashboard:
# Project Settings → Edge Functions → Secrets → ANOQI_RAG_PILOT_USERS
```

To flip global RAG on/off on either backend (overrides the pilot gate when on):

```bash
# CF Worker — secret overrides the wrangler.toml [vars] entry, no redeploy needed
cd workers/be
echo "true" | npx wrangler secret put ANOQI_RAG_ENABLED    # or "false"

# Supabase Edge — dashboard: Project Settings → Edge Functions → Secrets
```

To re-embed the corpus after editing `clinical_pathways` or `source_library`:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... GEMINI_API_KEY=... \
  deno run --no-config --allow-env --allow-net api/jobs/embed_rag.ts
```

---

# Detailed handover (for the next LLM picking this up)

## Repo geography

```
api/                            # Supabase Edge Functions (Deno) — STILL LIVE
├── functions/
│   ├── chat.ts                 # POST /chat — RAG-aware (gated)
│   ├── documents.ts            # POST /documents — auth required
│   └── summaries.ts            # POST /summaries — auth required
├── lib/
│   ├── gemini.ts               # chat() + generateSummary() — Gemini API wrapper
│   ├── retrieval.ts            # embedQuery + hybrid retrieval + RRF + render
│   ├── citationParser.ts       # [Sn] extraction + hallucination → block
│   ├── summaryParser.ts        # JSON validation for summaries
│   ├── pseudonymise.ts         # PII regex (also exists in app/lib/ — device runs it)
│   └── *.test.ts               # Vitest test files — see "Tests" note below
├── policy/
│   ├── policyChecker.ts        # IMMUTABLE: every AI response passes through
│   └── policy.test.ts
├── jobs/
│   └── embed_rag.ts            # One-shot Deno script — chunks + embeds corpus
└── tsconfig.json

app/                            # Expo / React Native — used by mobile AND web
├── screens/chat/ChatScreen.tsx # Pseudonymises chat text on device, then calls supabase.functions.invoke('chat')
├── lib/pseudonymise.ts         # Device-side PII regex — runs before any text leaves the device
├── lib/documentStore.ts        # Uploads — pseudonymise() → classify() → extract()
└── ...                         # See app.json, etc.

workers/                        # Cloudflare Workers (parallel deployment)
├── be/                         # Backend Worker — Hono port of api/functions/*
│   ├── wrangler.toml           # name=anoqi-api-staging, account pinned
│   ├── src/
│   │   ├── index.ts            # Hono app, CORS, /health + 3 routes
│   │   ├── auth.ts             # Validates Supabase JWT via supabase.auth.getUser
│   │   ├── handlers/           # chat.ts, documents.ts, summaries.ts (Hono)
│   │   ├── lib/                # Ports of api/lib/* (env passed in, not Deno.env)
│   │   ├── policy/             # Verbatim copy of api/policy/policyChecker.ts
│   │   └── lib/supabase.ts     # getServiceClient(env) factory
│   └── package.json            # hono, @supabase/supabase-js, wrangler
└── fe/                         # Frontend Worker — Static Assets serving Expo build
    ├── wrangler.toml           # [assets] dir, SPA fallback
    ├── src/index.ts            # Trivial fetch handler (passes through to ASSETS)
    ├── assets/                 # GITIGNORED — populated by `npm run build`
    └── package.json            # build = expo export → assets/, deploy = build + wrangler

supabase/                       # Minimal Supabase CLI scaffolding
├── config.toml                 # project_id only
└── functions/chat/index.ts     # Thin shim: imports api/functions/chat.ts
                                # Lets `supabase functions deploy chat` reproduce
                                # the existing Edge Function deploy from this repo

scripts/migrations/             # SQL migrations — applied to live DB
├── 003_physician_backend.sql   # clinical_pathways, source_library, pathway_red_flags
├── 004_chat_tables.sql         # conversations, messages
├── 005_pathways_anon_read.sql  # RLS for anon read on pathways
├── 006_rag_embeddings.sql      # rag_chunks (vector(768) HNSW + tsvector GIN)
└── 006a_rag_functions.sql      # rag_vector_search, rag_fts_search RPCs

.github/workflows/              # CI
└── drift-check.yml             # Fails PRs when the two verbatim copies drift

worker/                         # UNRELATED: takumiro-landing-api (waitlist Worker, D1)
physician-portal/               # UNRELATED: separate Next.js portal
PHASE_1_RAG.md                  # Earlier RAG-only handover (now historical)
ROADMAP.md                      # Forward roadmap incl. regulatory section
HANDOVER.md                     # This file
```

## What's where (deployed state)

### Supabase project: `xulemxvfufwvewvtwwcv` (single project for staging+prod)

- **Database:** Postgres 15 with `pgvector 0.8.0` extension. Tables: `conversations`, `messages`, `documents`, `summaries`, `symptoms`, `clinical_pathways`, `source_library`, `pathway_red_flags`, `rag_chunks`, `audit_logs`. RLS enabled on user-scoped tables (mostly user-owned reads).
- **Edge Function `chat`:** Source: `api/functions/chat.ts`. **`ANOQI_RAG_ENABLED=false`** for public traffic; the pilot list (`ANOQI_RAG_PILOT_USERS`) is the only path to RAG today. **`GEMINI_API_KEY` set.** Used by mobile + the deployed web FE.
- **Edge Functions `documents`, `summaries`:** Source files exist in `api/functions/` but have **not** been deployed yet. Deploying them mirrors the `chat` deploy via `supabase functions deploy <name>`.
- **`rag_chunks` corpus:** 39 rows — 29 from `source_library`, 10 from `clinical_pathways` (3 symptoms, 3 contraception, 2 appointment_prep, 2 documents). 0 from `pathway_red_flags` (table is empty by design — physician-seed-pending).
- **`delete_stale_rag_chunks` function:** Patched during the 2026-05-15 session (`status <> 'archived'` instead of buggy `status = 'live'`). Live DB matches the source in `006_rag_embeddings.sql`.

### Cloudflare account: Marion@anoqi.health (`8c0835bd412c69c713ed9eedaaf1ca24`)

- **Worker `anoqi-api-staging`** at <https://anoqi-api-staging.marion-8c0.workers.dev>
  - Routes: `GET /health`, `POST /chat`, `POST /documents`, `POST /summaries`
  - Secrets set: `VERTEX_SA_JSON` (service-account JSON for Vertex OAuth — replaced the old `GEMINI_API_KEY`), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_JWKS_URL`. Vars: `GCP_PROJECT_ID`, `GCP_REGION`. Add `ANOQI_RAG_PILOT_USERS` to put a user in the pilot.
  - Vars set: `ANOQI_RAG_ENABLED = "false"` (in `wrangler.toml`)
- **Worker `anoqi-app-staging`** at <https://anoqi-app-staging.marion-8c0.workers.dev>
  - Static Assets serving the Expo web build (~1.1 MB JS bundle)
  - SPA fallback enabled
  - No bindings other than `ASSETS`

### What lives where (env / secrets)

| Secret/var | Supabase Edge Function `chat` | CF Worker `anoqi-api-staging` | Mobile / web build |
|---|---|---|---|
| `GEMINI_API_KEY` | ✅ set | ✅ set (`wrangler secret`) | n/a (server-only) |
| `SUPABASE_SERVICE_ROLE_KEY` | auto (Edge runtime) | ✅ set (`wrangler secret`) | n/a (server-only) |
| `SUPABASE_URL` | auto | ✅ set | `EXPO_PUBLIC_SUPABASE_URL` (in `.env`) |
| `SUPABASE_ANON_KEY` | n/a | n/a | `EXPO_PUBLIC_SUPABASE_ANON_KEY` (in `.env`) |
| `ANOQI_RAG_ENABLED` | ❌ `false` (Option C) | ❌ `false` | n/a |
| `ANOQI_RAG_PILOT_USERS` | set per pilot (comma-separated UUIDs) | set per pilot (`wrangler secret`) | n/a |

**Credentials needing rotation (open action):** the Supabase PAT (`sbp_…`), the service-role JWT, and the Gemini key were pasted in transcripts during the 2026-05-15 session. They still work; rotate them. See "Open items" below for the order.

## How RAG actually works (request lifecycle)

For a single chat turn against either backend with RAG enabled for this request:

```
1. POST /chat                      { message, sessionId, journeyType, language }
                                   (message is already pseudonymised by the device)
2. classifyInput(message)          deterministic regex — block obvious jailbreaks
3. RAG gate                        ragGlobal = ANOQI_RAG_ENABLED='true'
                                   ragPilot  = userId in ANOQI_RAG_PILOT_USERS
                                   ragEnabled = ragGlobal || ragPilot
4. embedQuery(message)             Gemini embedContent → 768-dim vector
                                   (model: gemini-embedding-001, taskType=RETRIEVAL_QUERY)
5. Parallel:
   ├─ rag_vector_search RPC        cosine sim over rag_chunks.embedding (HNSW)
   └─ rag_fts_search RPC           websearch_to_tsquery + ts_rank_cd over rag_chunks.tsv
6. RRF merge                       Reciprocal Rank Fusion (K=60), top-K=5 snippets
7. renderSnippetsForPrompt         Format as French/English addendum:
                                     "Sources autorisées (et seulement celles-ci)…
                                      [S1] source/<id>  ...content...
                                      [S2] pathway/<id> (parcours: contraception v1)
                                      Règles strictes: …cite [Sn]; ne jamais inventer."
8. Gemini chat                     gemini-2.5-flash with that addendum appended to
                                   the base system prompt
9. checkPolicy(rawContent)         Blocks/sanitises diagnostic/prescription language
10. parseCitations                 Extract [Sn] tokens, validate vs available snippets.
                                    If ANY hallucinated label is present → REPLACE
                                    the response with a safe fallback and persist
                                    a severity:block flag. Otherwise keep the
                                    cleanContent (which preserves valid [Sn] for
                                    the mobile client to render as badges).
11. enrichSources                  Join cited refs against source_library /
                                    clinical_pathways / pathway_red_flags →
                                    sources_display (label, name, url, topic)
12. Persist                        Insert user + assistant messages into messages table
13. Return                         { message, conversationId, blocked }
```

Failure modes are deliberately soft:
- Embedding API fails → `snippets = []`, LLM answers ungrounded
- Vector OR FTS RPC fails → other side carries the request
- LLM cites a non-existent `[S99]` → response replaced with safe fallback, `blocked=true` returned

The two backends run the same pipeline; differences are mechanical (`Deno.env` vs `c.env`, `Request/Response` vs Hono `Context`).

## The two parallel BE paths

```
                     ┌──────────────────────────────┐
                     │   Supabase Edge Function     │  RAG OFF public
                     │   /functions/v1/chat         │  Pilot list → RAG ON
                     │   xulemxvfufwvewvtwwcv       │
                     └──────────────────────────────┘
                                                  ▲
                          ┌───────────────────────┘
                          │
[mobile (Expo native)] ───┤
                          │
[web (Expo build)]    ────┤
                          │
[curl / future code]  ────┘
                                                  ▼
                     ┌──────────────────────────────┐
                     │   CF Worker /chat            │  RAG OFF public
                     │   anoqi-api-staging          │  Pilot list → RAG ON
                     │   .marion-8c0.workers.dev    │
                     └──────────────────────────────┘
```

Both paths read/write the **same** Supabase Postgres database. Switching mobile/web from one to the other is a one-line code change in `app/screens/chat/ChatScreen.tsx`:

```diff
- const { data, error } = await supabase.functions.invoke<ChatApiResponse>('chat', { body })
+ const r = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/chat`, {
+   method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
+ })
+ const data = await r.json()
```

This is **Phase E** in the original migration plan, deferred until the two backends have been running the same posture for long enough to trust the swap.

## Database details

`rag_chunks` table (see `scripts/migrations/006_rag_embeddings.sql`):
- `id uuid pk`
- `source_kind text` — `'pathway' | 'source' | 'pathway_red_flag'`
- `source_ref text` — id of originating row in respective table
- `pathway_key text NULL`, `pathway_version varchar(20) NULL`
- `language varchar(5)` — for retrieval-side filtering
- `chunk_index int` — stable across re-embeds
- `content text` — ~400 tokens
- `embedding vector(768)` — Gemini `gemini-embedding-001`
- `embedding_model text` — currently `'text-embedding-004'` default in DDL but rows write `'gemini-embedding-001'` (mismatch is benign; runtime value wins)
- `tsv tsvector` — generated `to_tsvector('simple', content)` for BM25
- HNSW index on `embedding (vector_cosine_ops)`, GIN on `tsv`, b-tree on `pathway_key`, `language`, `source_kind`
- **RLS enabled, NO policies** — service-role only. Anon/authenticated have no read path.

RPCs in `006a_rag_functions.sql`:
- `rag_vector_search(p_query_embedding, p_language, p_pathway_key, p_limit)` — cosine via `<=>`
- `rag_fts_search(p_query_text, p_language, p_pathway_key, p_limit)` — `websearch_to_tsquery` + `ts_rank_cd`
- Both `SECURITY DEFINER`, REVOKE'd from `anon` and `authenticated`

`messages.sources` jsonb column shape (canonical, validate before persisting):
```ts
{ label: string; row_id: uuid; source_kind: SourceKind;
  source_ref: string; pathway_key: string|null; pathway_version: string|null }[]
```

## Auth model

Both Supabase Edge and the CF Worker handle auth identically:
1. Read `Authorization: Bearer <jwt>` header
2. Call `supabase.auth.getUser(token)` — Supabase validates the JWT via its own API
3. If valid: `userId = user.id`. If missing/invalid: `userId = null`
4. For `/chat`: either `userId` or a client-supplied `sessionId` (anonymous) is accepted
5. For `/documents` and `/summaries`: `userId` is required (returns 401 otherwise)

The CF Worker's `auth.ts` mirrors this rather than doing local JWKS verification — same RTT cost as Supabase Edge, same security properties, no key-rotation surface to maintain. The `SUPABASE_JWT_JWKS_URL` env var is reserved in `wrangler.toml` for if/when local JWKS verification becomes worth doing.

## Privacy: device-side pseudonymisation

`app/lib/pseudonymise.ts` runs on the device and is invoked from:
- `app/screens/chat/ChatScreen.tsx` — every chat message before `supabase.functions.invoke('chat', …)`
- `app/lib/documentStore.ts` — every document text before upload

The server never sees raw PII for either path. The user's own message bubble still shows the raw text they typed; only the server-bound payload is rewritten. Pattern set: French NIR, NHS number, emails, FR + international phones, FR addresses, postal codes, patient-name markers, doctor names, RPPS/ADELI.

## Policy layer (immutable)

`api/policy/policyChecker.ts` and `workers/be/src/policy/policyChecker.ts` (verbatim copy, enforced by `.github/workflows/drift-check.yml`) define the deterministic safety regexes:
- **Block** patterns: diagnostic language ("vous avez/êtes atteinte de…", "Diagnostic:", "I diagnose"), prescription language ("prenez du…", "take Xmg", "stop taking your")
- **Warn** patterns: contraindication / high-risk language → appends a physician disclaimer
- **Input classifier** (`classifyInput`): catches obvious requests for diagnosis/prescription before LLM is even called

Every AI response passes through `checkPolicy()` before the user sees it. Blocked responses are replaced with a safe fallback string. The policy layer must remain **purely additive** — never remove or weaken rules without explicit approval.

## Tests

`*.test.ts` files exist under `api/lib/` and `api/policy/`. **The vitest runner is not currently wired up on this branch** — there's no `vitest.config.ts` and no `vitest` dependency in `package.json`. Wiring it back in is a small standalone PR: add `vitest` as a devDependency and a minimal `vitest.config.ts`. Until then, the test files are read-only specs of expected behaviour.

## Open items / known gotchas

| Item | What | Owner |
|---|---|---|
| **Rotate burnt creds** | Supabase PAT, service-role JWT, Gemini API key were pasted in transcripts during 2026-05-15 session | User — manual via dashboards. Order: Gemini → service-role JWT → PAT |
| **Set pilot allowlist on Supabase Edge** | Add `ANOQI_RAG_PILOT_USERS` secret with named UUIDs. CF Worker secret to be set in parallel | Marion |
| **Turn off `ANOQI_RAG_ENABLED` on Supabase Edge** | Currently public traffic gets RAG; align with Option C posture | Marion |
| **Mobile/web cutover to CF Worker** | Phase E in original plan. One-line change in ChatScreen.tsx + `EXPO_PUBLIC_API_BASE_URL` env | When ready |
| **`pathway_red_flags` empty** | Deterministic safety pre-pass (Phase 2) ships when physicians seed rules. Wiring is done in P1; activation pending content | Physician team |
| **Wire vitest** | Restore the test runner: add devDep + config | Backlog |
| **Eval harness** | Phase 0 of the original plan deferred. Quality lift from RAG isn't measured. Recommended before P3 (Critic) and before any wider rollout of the pilot | Backlog |
| **Custom domains** | `app.anoqi.com` + `api.anoqi.com` not wired yet — workers.dev URLs only | When ready for users |
| **`embedding_model` DDL default mismatch** | Migration says `'text-embedding-004'`, runtime writes `'gemini-embedding-001'`. Benign — runtime value wins | Cosmetic; fix in next migration |

## Original plan ordering (for reference)

1. **P0 — Eval harness** (deferred per user; recommend doing before broadening the pilot)
2. **P1 — RAG** ✅ shipped + verified
3. **P2 — Red-flag pre-pass** (1 week, code-only impact until table is seeded)
4. **P3 — Critic pass** (2 weeks, needs P0 to justify)
5. **P4 — User context cache** (2 weeks, no new PHI surface — JSONB cache over `symptoms`/`documents.medications`)
6. **P5 — Re-eval & v2 decision** (1 week)

Explicitly **not** recommended in the plan: full Graphiti temporal KG, multi-agent orchestrator, multi-provider, per-message web search, external vector DB, LLM router.

## Quick recipes for common follow-ups

**Add a new clinical pathway:**
1. Insert into `clinical_pathways` (status starts `draft`)
2. Re-run embed job (manual until automation ships): `deno run --no-config --allow-env --allow-net api/jobs/embed_rag.ts`
3. New chunks join the corpus; retrieval picks them up on next chat turn

**Update the LLM system prompt:**
- Edit `BASE_SYSTEM_PROMPT` and/or `JOURNEY_CONTEXTS` in BOTH `api/lib/gemini.ts` AND `workers/be/src/lib/gemini.ts`. The two are intentionally duplicated for the parallel-run window. (The drift-check CI only enforces `citationParser.ts` and `policyChecker.ts` today.)
- Redeploy Supabase Edge: `supabase functions deploy chat --project-ref xulemxvfufwvewvtwwcv`
- Redeploy CF Worker: `cd workers/be && npx wrangler deploy`

**Add a new policy rule:**
- Edit `api/policy/policyChecker.ts` AND `workers/be/src/policy/policyChecker.ts` (the drift-check CI will fail if you forget either)
- Add a corresponding test in `api/policy/policy.test.ts`
- Redeploy both compute paths

**Disable RAG everywhere immediately (panic button):**
- CF Worker: `cd workers/be && echo "" | npx wrangler secret put ANOQI_RAG_PILOT_USERS` (empties the pilot) — global `ANOQI_RAG_ENABLED` is already `false`
- Supabase Edge: dashboard → Settings → Edge Functions → Secrets → empty `ANOQI_RAG_PILOT_USERS` and confirm `ANOQI_RAG_ENABLED` is unset or `false`
- No redeploy needed; secrets are read on cold start, takes effect within seconds

**Verify a deploy is alive:**
- `curl https://anoqi-api-staging.marion-8c0.workers.dev/health` (CF)
- `curl https://xulemxvfufwvewvtwwcv.supabase.co/functions/v1/chat -X OPTIONS -i` (Supabase Edge — should return 204 or 200)

---

## Diff vs `PHASE_1_RAG.md`

The earlier `PHASE_1_RAG.md` is now historical. What changed since it was written:
- Steps 1–6 of its runbook (rotate creds, patch reconcile fn, mobile `.env`, deploy edge function, set `ANOQI_RAG_ENABLED`, smoke test) → all done **except** rotate-creds, which is still open
- Cloudflare Workers migration → entirely new
- Web is now live (was not addressed in PHASE_1_RAG.md)
- 2026-05-18: Option C closed-pilot posture; device-side pseudonymisation extended to chat; hallucinated-citation now blocks instead of warns; drift-check CI added

You can keep `PHASE_1_RAG.md` for archive purposes or delete it — its runbook is now closed.
