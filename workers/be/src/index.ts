/**
 * anoqi — backend Worker entry
 *
 * Hono app routing the three endpoints ported from the Supabase Edge Functions:
 *   POST /chat       — chat with optional RAG (gated by ANOQI_RAG_ENABLED)
 *   POST /documents  — store de-identified document payloads (auth required)
 *   POST /summaries  — generate physician-ready summaries (auth required)
 *   GET  /health     — liveness probe
 */
import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { chatHandler }      from './handlers/chat'
import { documentsHandler } from './handlers/documents'
import { summariesHandler } from './handlers/summaries'

export type Env = {
  // Public, non-secret config (from wrangler.toml [vars])
  ANOQI_RAG_ENABLED?: string

  // Pathway runtime gate (workers/be/src/pathways/*). 'true' to enable the
  // clinical-pathway engine on /chat. Default OFF — ship the code dark and
  // flip per PATHWAYS.md PR I once phases 1-8 are validated. When off, /chat
  // behaves exactly as before. Requires migration 007 applied to persist state.
  PATHWAY_RUNTIME_ENABLED?: string

  // Secrets (set via `wrangler secret put`)
  VERTEX_SA_JSON: string                  // service-account JSON for Vertex AI (anoqi-vertex-worker).
                                          // Used by both chat (lib/gemini.ts) and retrieval embeddings
                                          // (lib/retrieval.ts) via lib/vertexAuth.ts.
  GCP_PROJECT_ID: string                  // typically `reverberant-kit-491312-e8`
  GCP_REGION: string                      // typically `global` (or a region for data residency)
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  SUPABASE_JWT_JWKS_URL?: string  // reserved for future JWKS-based local verification

  // Comma-separated list of user UUIDs that get RAG even when
  // ANOQI_RAG_ENABLED is false. Used to run a closed pilot while
  // public traffic stays off. Anonymous sessions never qualify.
  ANOQI_RAG_PILOT_USERS?: string

  // Comma-separated list of extra origins to allow in CORS, beyond the
  // defaults baked in below. Set when standing up a new preview build
  // (e.g. a PR-deploy URL) without redeploying.
  ANOQI_CORS_EXTRA_ORIGINS?: string

  // Optional KV namespace for the RAG embedding cache (24h TTL). When unset,
  // retrieval embeds every query live. See wrangler.toml for setup.
  EMBEDDING_CACHE?: KVNamespace
}

const app = new Hono<{ Bindings: Env }>()

// CORS — allowlist of known origins. The baked-in list covers staging FE +
// expected production hosts; extra origins can be added at runtime via the
// ANOQI_CORS_EXTRA_ORIGINS env var (comma-separated). Anything not on the
// list gets no Access-Control-Allow-Origin header — the browser blocks.
//
// localhost is included so `expo start --web` can call this API in dev.
const STATIC_ALLOWED_ORIGINS = [
  'https://ask.anoqi.health',
  'https://anoqi-app-staging.marion-8c0.workers.dev',
  'https://app.anoqi.com',
  'https://anoqi.com',
  'https://www.anoqi.com',
  'http://localhost:8081',
  'http://localhost:19006',
]

app.use('*', (c, next) => {
  const extra = (c.env.ANOQI_CORS_EXTRA_ORIGINS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  const allowed = [...STATIC_ALLOWED_ORIGINS, ...extra]
  return cors({
    origin: (origin) => (allowed.includes(origin) ? origin : null),
    allowHeaders: ['authorization', 'x-client-info', 'apikey', 'content-type'],
    allowMethods: ['POST', 'OPTIONS', 'GET'],
  })(c, next)
})

app.get('/health', (c) =>
  c.json({
    ok:          true,
    service:     'anoqi-api',
    phase:       'B-port',
    rag_enabled: c.env.ANOQI_RAG_ENABLED === 'true',
  }),
)

app.post('/chat',      chatHandler)
app.post('/documents', documentsHandler)
app.post('/summaries', summariesHandler)

export default app
