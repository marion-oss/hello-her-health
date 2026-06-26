# Phase 1 — Retrieval-Augmented Chat (RAG)

> **⚠️ Historical (pre-Vertex).** This doc references Supabase Edge Functions and
> the AI-Studio `GEMINI_API_KEY`. Both are gone: the live backend is the
> Cloudflare Worker, and Gemini is reached via Vertex AI OAuth. See the
> "Architecture update" box at the top of [`HANDOVER.md`](./HANDOVER.md).

Status: **code-complete, schema deployed, corpus populated. Not enabled in any environment.** Flipping the flag requires (a) deploying the new edge function code, (b) setting one secret, and (c) regulatory sign-off (see ROADMAP).

This document captures what shipped on `marcelo_update`, what is still needed to reach end-to-end behaviour in the mobile app, and exactly how to close each gap.

---

## What this session shipped

Commit `0949260` (formerly `2085ca3` before email rewrite) — `feat: P1 RAG — hybrid retrieval over clinical pathways + sources`.

**Database (deployed to project `xulemxvfufwvewvtwwcv`):**
- `scripts/migrations/006_rag_embeddings.sql` — enables `pgvector`, creates `rag_chunks` (HNSW vector index, GIN tsvector, b-tree filters; service-role-only via RLS with no policies). Defines `delete_stale_rag_chunks()` reconciliation helper.
- `scripts/migrations/006a_rag_functions.sql` — defines RPCs `rag_vector_search` and `rag_fts_search` for hybrid retrieval (cosine similarity + BM25-style FTS).

**Server code (NOT yet deployed to Supabase Edge Functions):**
- `api/lib/retrieval.ts` — embed query (`gemini-embedding-001`, 768 dim), run vector + FTS in parallel, merge with Reciprocal Rank Fusion (top-K = 5), render snippets into the French/English prompt addendum with strict citation rules.
- `api/lib/citationParser.ts` — extract `[Sn]` tokens from model output, validate against the snippet set, strip hallucinated labels, build canonical `MessageSource[]` for `messages.sources`.
- `api/lib/gemini.ts` — `chat()` now accepts an optional `systemAddendum` string, appended to the system prompt.
- `api/functions/chat.ts` — feature-gated retrieval (`ANOQI_RAG_ENABLED`), citation parsing, server-side enrichment of cited rows against `source_library` / `clinical_pathways` / `pathway_red_flags` into `sources_display` for the mobile client.
- `api/jobs/embed_rag.ts` — one-shot Deno script: chunk + embed pathways/sources/red-flags, upsert into `rag_chunks`, optionally call the reconcile function (skip with `ANOQI_SKIP_RECONCILE=1`).

**Mobile (not deployed; ships next time you build):**
- `app/screens/chat/ChatScreen.tsx` — replaced mock responses with `supabase.functions.invoke('chat')`. Anonymous `session_id` persisted in `AsyncStorage`; `conversation_id` tracked across turns. Citation badges rendered from `sources_display`. Error bubbles for network / 503 / blocked cases.

**Tests:** 30 new unit tests for `rrfMerge`, `renderSnippetsForPrompt`, `parseCitations`. Total `npx vitest run api/`: 192 / 192 passing.

**Operational state:**
- `rag_chunks` populated: 39 rows (29 from `source_library`, 10 pathway fragments across all 4 seeded pathways: 3 symptoms, 3 contraception, 2 appointment_prep, 2 documents). `pathway_red_flags` is empty in the DB, so 0 red-flag chunks.
- `ANOQI_RAG_ENABLED` is unset in every environment → retrieval is a no-op until set.

---

## What's NOT working end-to-end yet

| Gap | Effect | How to close |
|---|---|---|
| **Edge Function code not deployed** | Calls to `/functions/v1/chat` still hit the OLD code (no retrieval, no citation parsing, no enrichment). | `supabase functions deploy chat` (see runbook below) |
| **`ANOQI_RAG_ENABLED` not set** | Even after redeploy, retrieval is gated OFF. | `supabase secrets set ANOQI_RAG_ENABLED=true` |
| **Live `delete_stale_rag_chunks()` is buggy** | Source code is patched; live function still filters `status = 'live'` and would re-delete every pathway chunk if called. | Re-apply the function block from `006_rag_embeddings.sql` to the live DB |
| **Mobile `.env` not present in this worktree** | The mobile app cannot resolve Supabase URL / anon key. | Create a `.env` at repo root (see runbook) |
| **Three credentials in transcript** | PAT, service-role JWT, Gemini key were pasted in chat. They are burnt. | Rotate at the URLs in the runbook |

---

## Runbook: closing the gaps

Do these in order. Total time: ~15 minutes of your hands-on work.

### 1. Rotate the burnt credentials

| Credential | Where to rotate |
|---|---|
| Supabase PAT (`sbp_b4769…d4f4`) | https://supabase.com/dashboard/account/tokens — delete the old one, issue a fresh one. Save the new value. |
| Supabase service-role (`eyJ…QQA`) | https://supabase.com/dashboard/project/xulemxvfufwvewvtwwcv/settings/api → click "Reset" on the `service_role` key. Save the new value. |
| Gemini API key (`AIzaSy…6Ad8`) | https://aistudio.google.com/apikey — revoke and reissue. Save the new value. |

After rotating service-role: any deployed edge function that already had it cached will pick up the new value on its next cold start (Supabase manages this transparently when you redeploy).

### 2. Re-apply the `delete_stale_rag_chunks` fix

The source in `scripts/migrations/006_rag_embeddings.sql` is correct; the live function is the buggy version. Easiest path: open the SQL editor in the Supabase dashboard and paste only the function definition (the block from `create or replace function public.delete_stale_rag_chunks()` through the matching `$$` and `revoke` statements at the end of the migration file).

Or, with the new PAT exported as `SUPABASE_ACCESS_TOKEN`, send the function block via the Management API — `POST https://api.supabase.com/v1/projects/xulemxvfufwvewvtwwcv/database/query` with `{"query": "<SQL>"}`.

After this, embedders no longer need `ANOQI_SKIP_RECONCILE=1`.

### 3. Create mobile `.env`

At the repo root (gitignored — confirm before saving):

```
EXPO_PUBLIC_SUPABASE_URL=https://xulemxvfufwvewvtwwcv.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key from dashboard, NOT service_role>
```

The anon key is at https://supabase.com/dashboard/project/xulemxvfufwvewvtwwcv/settings/api under "Project API keys". It is designed to be public.

### 4. Deploy the new chat edge function

Requires the Supabase CLI (`brew install supabase/tap/supabase` if you do not have it).

```bash
cd /Users/marcelo/Desktop/Coding/health-worktrees/agent-4
supabase login                                                 # interactive
supabase functions deploy chat --project-ref xulemxvfufwvewvtwwcv
```

Without this, even with the flag set, the deployed `/chat` endpoint runs the previous (pre-RAG) code.

### 5. Set the feature flag (dev environment first)

```bash
supabase secrets set ANOQI_RAG_ENABLED=true --project-ref xulemxvfufwvewvtwwcv
```

Edge Functions read env vars on cold start; no redeploy needed after a `secrets set`.

**Do not set this in production until the regulatory decision in `ROADMAP.md` → "Pending regulatory decision — RAG" is recorded.** RAG-grounded chat is closer to the EU-MDR / software-as-medical-device threshold than free conversation; the policy gates and physician PR-style governance are necessary mitigation but not sufficient on their own.

### 6. Run the mobile app and exercise the flow

```bash
cd /Users/marcelo/Desktop/Coding/health-worktrees/agent-4
npx expo start
```

Open in iOS simulator / Android / web. Send any message in the symptoms or contraception journey. You should see citation badges below the assistant message — for example a pathway badge such as "Trouver une contraception qui me correspond · contraception" or a source badge such as "Choisiruntraitement.fr — Contraception".

If badges do not appear, check in this order:
1. Supabase Edge Function logs for the `[chat]` log lines and any retrieval errors.
2. `messages.sources` row in the DB — it should be populated with `MessageSource[]` (label + ref data). If `[]`, retrieval is being skipped or the LLM did not cite — verify the flag is set and the deploy is current.
3. The mobile network tab — `sources_display` should be in the `/chat` response payload.

### 7. Re-embed when content changes

Whenever `clinical_pathways` rows are added/edited or `source_library` rows flip `is_active`, re-run the embed job. Until automation lands (Phase 2/3 roadmap item), this is manual:

```bash
SUPABASE_URL=https://xulemxvfufwvewvtwwcv.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<new service-role key> \
GEMINI_API_KEY=<new Gemini key> \
deno run --no-config --allow-env --allow-net api/jobs/embed_rag.ts
```

Once step 2 above is done and the live function matches the embed-job policy, you no longer need `ANOQI_SKIP_RECONCILE=1`.

---

## Verification checklist

Run through this once after the runbook:

- [ ] All three burnt credentials rotated
- [ ] `delete_stale_rag_chunks` source matches the live function (run it on an empty `rag_chunks` and confirm 0 deletes)
- [ ] `npx vitest run api/` is green (192 / 192)
- [ ] `supabase functions list` shows `chat` with a recent deploy timestamp
- [ ] `supabase secrets list` shows `ANOQI_RAG_ENABLED` set in the target environment
- [ ] Mobile app sends a message and renders at least one citation badge
- [ ] `messages.sources` rows in the DB contain non-empty arrays for new assistant messages
- [ ] No `hallucinated_citation` flags appearing under load (a few are expected; persistent flags mean the model is fabricating references and the prompt addendum or eval needs work)

---

## Known limitations (all by design, all addressable later)

- **Mobile streaming is presentational, not real.** The `/chat` endpoint returns a single payload; `ChatScreen.tsx` animates a typewriter effect over it. Real SSE / WebSocket streaming is a Phase 2-ish task and matters more once the Critic pass (P3) adds latency.
- **`pathway_red_flags` is empty.** The deterministic safety pre-pass (Phase 2) will be a no-op until physicians seed rules — that is the right gating, not a bug.
- **Embed job is manual.** Trigger-based auto-rebuild on `clinical_pathways` / `source_library` mutation is on the post-P1 list.
- **No eval harness.** Quality lift from P1 is not measured. Phase 0 of the plan is deferred; revisiting before P3 (Critic) is recommended because the Critic's value is unverifiable without it.
- **Mobile `Source` enrichment is only on the live response.** Persisted `messages.sources` carries refs only, not display fields. A conversation-history view will need to either re-join at read time (the way `chat.ts` does) or persist display fields too.

---

## What is next after this works end-to-end

Per `/Users/marcelo/.claude/plans/whimsical-napping-music.md`:

1. **Phase 0 — Eval harness** (1 week). Recommended before any phase that affects model output behaviour.
2. **Phase 2 — Red-flag pre-pass** (1 week). Wires `pathway_red_flags.trigger_text` into chat.ts as a deterministic pre-LLM filter. Code-only impact until physicians seed the table.
3. **Phase 3 — Critic pass** (2 weeks). Single extra Gemini Flash call to verify citations and flag unsupported claims. Needs P0 to justify.
4. **Phase 4 — User context cache** (2 weeks). JSONB cache built from existing `symptoms` and `documents.medications` — personalization without a new PHI surface.
5. **Phase 5 — Re-eval & v2 decision** (1 week).

Beyond the plan: physician portal v1 (auth + PR-style workflow) is the unlock for P2's visible impact and for retrieval auto-rebuild.
