# Anoqi Operations Runbook

Operational companion to [`HANDOVER.md`](./HANDOVER.md). HANDOVER explains *what* the system is and *why*; this file explains *how to operate it*: deploying changes, flipping flags, rotating keys, verifying things work, fixing the errors we've actually hit.

If you're new here, read HANDOVER first, then keep this open in a tab.

> **⚠️ 2026-06-26:** This runbook still shows two backends and `GEMINI_API_KEY`
> steps. The Supabase Edge Functions were **removed**; the **Cloudflare Worker is
> the only backend**, and Gemini is now reached via **Vertex AI OAuth**
> (`VERTEX_SA_JSON`), not an AI-Studio key. Any `supabase functions deploy` or
> `curl …supabase.co/functions/v1/…` step below is obsolete. See the
> "Architecture update" box at the top of [`HANDOVER.md`](./HANDOVER.md).

---

## The moving parts

```
                    [Mobile / Web FE]
                    Expo → workers/fe
                    public on workers.dev
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
   [Supabase Edge Function]    [Cloudflare Worker]
   /chat /documents /summaries  /chat /documents /summaries /health
   xulemxvfufwvewvtwwcv         anoqi-api-staging
   (api/functions/*)            (workers/be/src/handlers/*)
              │                           │
              └─────────────┬─────────────┘
                            ▼
              [Supabase Postgres + pgvector]
                  conversations, messages,
                  clinical_pathways, rag_chunks…
```

The two backends run **the same code** (parallel-run window). Right now the FE talks to Supabase Edge; the CF Worker is the long-term path. Both must be kept deployed and in sync until cutover.

---

## I changed something. What do I deploy?

| If you edited… | Deploy… | Section |
|---|---|---|
| `api/functions/*.ts` or `api/lib/*.ts` or `api/policy/*.ts` | Supabase Edge + CF Worker (both — same code, two deploys) | [§2](#2-deploy) |
| `workers/be/src/**` | CF Worker only | [§2](#2-deploy) |
| `app/**` (UI, screens, components, lib) | FE Worker (Expo web rebuild) | [§2](#2-deploy) |
| `scripts/migrations/*.sql` | Supabase via SQL editor (manual paste) | [§4](#4-database-migrations) |
| `.env` (local FE build values) | FE Worker rebuild | [§2c](#2c-fe-worker-frontend) |
| Wrangler secrets / Supabase secrets | Nothing — takes effect on cold start | [§3](#3-configuration-no-code-change) |
| HANDOVER.md / RUNBOOK.md | Nothing — docs only | — |

---

## 1. One-time setup

Required before any of the steps below. Skip whichever you already have.

```bash
# 1. Repo on the right branch — cloudflare-workers is the active development branch.
cd /Users/marionpierfitte/Documents/GitHub/hello-her-health
git checkout cloudflare-workers
git pull --ff-only
npm install            # root: Expo + RN + everything the FE build needs
cd workers/be && npm install && cd -   # BE Worker deps (hono, supabase-js, wrangler)
```

```bash
# 2. GitHub CLI authenticated
gh auth status         # should say "Logged in to github.com account marion-oss"
# If not: gh auth login
```

```bash
# 3. Cloudflare wrangler authenticated
cd workers/be && npx wrangler whoami
# If not: npx wrangler login
```

```bash
# 4. Supabase CLI authenticated (only needed if deploying Edge Functions)
npx supabase login     # paste a Personal Access Token from
                       # https://supabase.com/dashboard/account/tokens
```

Verify with `npx supabase projects list` → should list `xulemxvfufwvewvtwwcv`.

---

## 2. Deploy

After merging a PR into `cloudflare-workers`, **the deploy is manual** — merging doesn't push to production. Pull locally, then deploy whichever surfaces are affected.

```bash
cd /Users/marionpierfitte/Documents/GitHub/hello-her-health
git checkout cloudflare-workers
git pull --ff-only
```

### 2a. CF Worker (backend)

```bash
cd workers/be
npx wrangler deploy
```

Expected output ends with `Deployed anoqi-api-staging` and a version ID. Takes ~10 seconds.

**Verify:**

```bash
curl https://anoqi-api-staging.marion-8c0.workers.dev/health
# {"ok":true,"service":"anoqi-api","phase":"B-port","rag_enabled":false}
```

### 2b. Supabase Edge Functions

Three functions live in `api/functions/`. Each must be deployed individually.

```bash
npx supabase functions deploy chat       --project-ref xulemxvfufwvewvtwwcv
npx supabase functions deploy documents  --project-ref xulemxvfufwvewvtwwcv
npx supabase functions deploy summaries  --project-ref xulemxvfufwvewvtwwcv
```

The `Docker is not running` warning is harmless — Docker is only needed for local serve, not deploy.

**Verify:**

```bash
curl -X OPTIONS -i https://xulemxvfufwvewvtwwcv.supabase.co/functions/v1/chat
# Expect HTTP/2 200 or 204
```

### 2c. FE Worker (frontend)

The Expo web build inlines `EXPO_PUBLIC_*` env vars **at build time**, reading them from `/Users/marionpierfitte/Documents/GitHub/hello-her-health/.env`.

```bash
cd /Users/marionpierfitte/Documents/GitHub/hello-her-health/workers/fe
npm run deploy
```

(After PR #26 merges this passes `--clear` automatically. Until then, if a fresh build produces byte-identical bundles after `.env` changes, add `--clear` manually: `npx expo export --platform web --output-dir workers/fe/assets --clear`.)

**Verify the bundle actually changed:**

In the wrangler output, find the new `AppEntry-<hash>.js`. The hash must differ from the previously deployed one. Same hash = stale cache served, env vars not picked up.

**Verify live:**

Open <https://anoqi-app-staging.marion-8c0.workers.dev> in incognito, send a chat. Should respond normally.

---

## 3. Configuration (no code change)

Most flags + secrets can be flipped via dashboards. **No redeploy needed** — Workers re-read secrets on cold start (within seconds of save).

### 3a. RAG on/off

The Option C posture: public traffic gets RAG off; named users in the pilot list get RAG on.

**Global flag (`ANOQI_RAG_ENABLED`).** Set to `false` (closed pilot) or `true` (open to everyone). Edit on both backends so they stay aligned:

- **CF Worker**: <https://dash.cloudflare.com/> → Workers & Pages → `anoqi-api-staging` → Settings → Variables and Secrets → edit `ANOQI_RAG_ENABLED`.
- **Supabase Edge**: <https://supabase.com/dashboard/project/xulemxvfufwvewvtwwcv/settings/functions> → Secrets → edit `ANOQI_RAG_ENABLED`.

### 3b. Add / remove a pilot user

Pilot allowlist is a comma-separated list of Supabase auth UUIDs.

1. Find the user's UUID at <https://supabase.com/dashboard/project/xulemxvfufwvewvtwwcv/auth/users> — click row → copy **User UID**.
2. **CF Worker**: Settings → Variables and Secrets → edit `ANOQI_RAG_PILOT_USERS` → new value is the full comma-separated list (e.g., `uuid1,uuid2,uuid3`). No spaces.
3. **Supabase Edge**: Edge Functions → Secrets → edit `ANOQI_RAG_PILOT_USERS` → same value.

Anonymous sessions never qualify for pilot — the user must be signed in for it to apply.

### 3c. CORS allowlist additions

When standing up a new origin (preview deploy, new domain), add it without redeploying via `ANOQI_CORS_EXTRA_ORIGINS` on the CF Worker:

```bash
cd workers/be
echo "https://preview-xyz.pages.dev" | npx wrangler secret put ANOQI_CORS_EXTRA_ORIGINS
```

Comma-separated for multiple values. Permanent additions belong in `STATIC_ALLOWED_ORIGINS` inside `workers/be/src/index.ts` (a code change, requires deploy).

### 3d. Emergency: disable RAG everywhere

For Option C this just means emptying the pilot list:

- CF Worker secret → `ANOQI_RAG_PILOT_USERS` → set to empty string, save.
- Supabase Edge secret → same.
- Confirm `ANOQI_RAG_ENABLED` is `false` on both. Takes effect within a minute.

---

## 4. Database migrations

`scripts/migrations/*.sql` is the source of truth, but migrations are applied **by hand** today via the Supabase SQL Editor.

1. Open <https://supabase.com/dashboard/project/xulemxvfufwvewvtwwcv/sql/new>.
2. Paste the migration SQL.
3. Click **Run**.
4. Commit the migration file to the repo (in `scripts/migrations/NNN_description.sql`) so the file matches what's actually in the database.

After a schema change that affects the RAG corpus (e.g., new fields in `clinical_pathways`, `source_library`, `pathway_red_flags`), re-run the embed job:

```bash
SUPABASE_URL=https://xulemxvfufwvewvtwwcv.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<from dashboard> \
GEMINI_API_KEY=<from dashboard> \
  deno run --no-config --allow-env --allow-net api/jobs/embed_rag.ts
```

---

## 5. Credential rotation

Order matters. Do them in this sequence so nothing breaks mid-flip.

### Gemini API key

1. <https://aistudio.google.com/apikey> → **Create API key** (same Google Cloud project as the current key).
2. **CF Worker**: Settings → Variables and Secrets → edit `GEMINI_API_KEY` → paste new value → Save.
3. **Supabase Edge**: Project Settings → Edge Functions → Secrets → edit `GEMINI_API_KEY` → paste new value → Save.
4. **Local `.env`**: open `/Users/marionpierfitte/Documents/GitHub/hello-her-health/.env`, update `GEMINI_API_KEY=…` (only used by the embed job).
5. Verify a chat works: <https://anoqi-app-staging.marion-8c0.workers.dev>.
6. Revoke the old key in AI Studio.

### Supabase service-role key (or new-system Secret API key)

1. **Path A (legacy, if available):** Project Settings → API → JWT Settings → **Generate new secret**.
2. **Path B (new system):** Project Settings → API → API Keys → **Create new Secret API key**. Copy the `sb_secret_...` value.
3. **CF Worker**: Settings → Variables and Secrets → edit `SUPABASE_SERVICE_ROLE_KEY` → paste new value → Save.
4. **Supabase Edge**: No action — the runtime picks up the new key automatically.
5. **Local `.env`**: update `SUPABASE_SERVICE_ROLE_KEY=…`.
6. Verify a chat works.
7. Path A: nothing further. Path B: wait a few hours, then revoke the old key under Legacy API Keys.

### Supabase publishable/anon key (browser-exposed)

This is the one baked into the FE bundle.

1. <https://supabase.com/dashboard/project/xulemxvfufwvewvtwwcv/settings/api> → find the **anon** or **Publishable** key → Reveal → Copy.
2. **Local `.env`**: update `EXPO_PUBLIC_SUPABASE_ANON_KEY=…`.
3. Rebuild + redeploy FE (§2c).
4. Verify signup works in incognito.

### Supabase Personal Access Token (your CLI)

Lowest impact: only affects your local `supabase` CLI.

1. <https://supabase.com/dashboard/account/tokens> → revoke the old token.
2. Generate new, `npx supabase login`, paste.
3. Test: `npx supabase projects list`.

---

## 6. Verification

### Liveness

```bash
curl https://anoqi-api-staging.marion-8c0.workers.dev/health
curl -X OPTIONS -i https://xulemxvfufwvewvtwwcv.supabase.co/functions/v1/chat
```

### Behaviour — eval harness

13 deterministic cases assert refusals, citations, language, no-diagnosis phrases. Run against either backend before any prompt or model change:

```bash
# CF Worker
ANOQI_EVAL_BASE_URL=https://anoqi-api-staging.marion-8c0.workers.dev \
  npx tsx evals/runner.ts

# Supabase Edge
ANOQI_EVAL_BASE_URL=https://xulemxvfufwvewvtwwcv.supabase.co/functions/v1 \
ANOQI_EVAL_SUPABASE_ANON_KEY=<anon key> \
  npx tsx evals/runner.ts
```

Exit code 0 = all pass, 1 = any failure. Stdout is a markdown report.

### Pilot user gets citations

The end-to-end smoke test: sign in as a pilot UUID, send *"Quelle est la différence entre un stérilet hormonal et un stérilet au cuivre ?"* — citation chips should appear under the reply.

### Drift check

The CI workflow `.github/workflows/drift-check.yml` fails any PR where the two verbatim-copy files drift apart:

- `api/lib/citationParser.ts` ↔ `workers/be/src/lib/citationParser.ts`
- `api/policy/policyChecker.ts` ↔ `workers/be/src/policy/policyChecker.ts`

If the check fails on a PR, sync the two sides (they should be byte-identical apart from the `.ts` import suffix on the Deno side).

---

## 7. Common errors and their fixes

Indexed so you can grep this file when something breaks.

### `TypeError: Failed to fetch` in the browser

The FE can't reach Supabase. Check the request URL in DevTools → Network:

- URL starts with `placeholder.supabase.co` → `.env` had wrong/missing values when the FE was built. Fix `.env`, rebuild with `--clear`, redeploy. See §2c.
- URL is correct but request fails → check `EXPO_PUBLIC_SUPABASE_ANON_KEY` is the current key; if not, see §5 (anon rotation).

### `Required Worker name missing` (wrangler)

You're running `wrangler` from outside `workers/be/`. Either `cd workers/be` first or pass `--name anoqi-api-staging`.

### `No platforms are configured to use the Metro bundler` (Expo export)

`npm install` hasn't been run at the repo root. Expo defaulted to fetching the latest version via npx, which can't find the project context. Fix:

```bash
cd /Users/marionpierfitte/Documents/GitHub/hello-her-health
npm install
```

### `Cannot find module 'hono'` (wrangler)

`npm install` hasn't been run in `workers/be/`. Fix: `cd workers/be && npm install`.

### Build "succeeds" but bundle is byte-identical to last build

Metro served stale transforms. Force a clean rebuild:

```bash
rm -rf workers/fe/assets node_modules/.cache .expo
cd workers/fe
npx expo export --platform web --output-dir workers/fe/assets --clear   # note --clear
npx wrangler deploy
```

After PR #26 merges, `npm run deploy` does this automatically.

### Drift-check CI fails on a PR

Two files diverged. Find the diff:

```bash
diff <(sed -E "s/from '(\.[^']*)\.ts'/from '\1'/g" api/lib/citationParser.ts) \
     workers/be/src/lib/citationParser.ts
# same for api/policy/policyChecker.ts ↔ workers/be/src/policy/policyChecker.ts
```

Bring the older side up to match. Commit, push, CI clears.

### `supabase functions deploy documents` fails with "no such file"

Missing shim file. After PR #25 merges this is fixed. If you see it again, ensure `supabase/functions/documents/index.ts` exists and contains `import '../../../api/functions/documents.ts'`.

### `git pull` → "Please commit your changes or stash them"

Uncommitted local edits block the pull. Check with `git status`. If the modified file is `.env.example` (or some other template you don't actively edit), `git restore <file>` then retry `git pull --ff-only`.

### `git checkout cloudflare-workers` → "already used by worktree"

Some other process / a stale worktree has it checked out elsewhere. Find it:

```bash
git worktree list
```

Remove stale entries:

```bash
git worktree prune
```

Retry.

---

## 8. Quick links

| What | URL |
|---|---|
| Live staging FE | <https://anoqi-app-staging.marion-8c0.workers.dev> |
| CF Worker health | <https://anoqi-api-staging.marion-8c0.workers.dev/health> |
| Supabase project (everything) | <https://supabase.com/dashboard/project/xulemxvfufwvewvtwwcv> |
| Supabase API keys | <https://supabase.com/dashboard/project/xulemxvfufwvewvtwwcv/settings/api> |
| Supabase Edge secrets | <https://supabase.com/dashboard/project/xulemxvfufwvewvtwwcv/settings/functions> |
| Supabase auth users | <https://supabase.com/dashboard/project/xulemxvfufwvewvtwwcv/auth/users> |
| Supabase SQL editor | <https://supabase.com/dashboard/project/xulemxvfufwvewvtwwcv/sql/new> |
| Supabase account tokens (PATs) | <https://supabase.com/dashboard/account/tokens> |
| Cloudflare account | <https://dash.cloudflare.com/> |
| Google AI Studio (Gemini keys) | <https://aistudio.google.com/apikey> |
| GitHub repo | <https://github.com/marion-oss/hello-her-health> |

---

## 9. Things this runbook deliberately does not cover

- **Custom domains** (`app.anoqi.com`, `api.anoqi.com`) — DNS setup is a one-time task, document it separately when you do it.
- **Phase E cutover** (mobile/web → CF Worker instead of Supabase Edge) — see HANDOVER for the one-line code change required.
- **Adding new clinical pathways** — see HANDOVER → "Quick recipes".
- **Architecture explanation** — see HANDOVER's "How RAG actually works" section.
- **Eval harness extension** — see `evals/README.md`.

When in doubt: read HANDOVER for understanding, this runbook for action.
