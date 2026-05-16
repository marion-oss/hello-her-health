/**
 * anoqi — backend Worker entry
 *
 * Hono app routing the three endpoints ported from the Supabase Edge Functions:
 *   POST /chat       — chat with optional RAG (gated by ANOQI_RAG_ENABLED)
 *   POST /documents  — store de-identified document payloads (auth required)
 *   POST /summaries  — generate physician-ready summaries (auth required)
 *   GET  /health     — liveness probe
 *
 * CORS: wide-open for now to mirror the current Supabase Edge Function behaviour.
 * Tighten to `app.anoqi.com` (and the workers.dev FE URL) post-cutover.
 */
import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { chatHandler }      from './handlers/chat'
import { documentsHandler } from './handlers/documents'
import { summariesHandler } from './handlers/summaries'

export type Env = {
  // Public, non-secret config (from wrangler.toml [vars])
  ANOQI_RAG_ENABLED?: string

  // Secrets (set via `wrangler secret put`)
  GEMINI_API_KEY: string
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  SUPABASE_JWT_JWKS_URL?: string  // reserved for future JWKS-based local verification

  // Optional KV namespace for the RAG embedding cache (24h TTL). When unset,
  // retrieval embeds every query live. See wrangler.toml for setup.
  EMBEDDING_CACHE?: KVNamespace
}

const app = new Hono<{ Bindings: Env }>()

// CORS — mirror the Edge Function behaviour exactly.
// Tighten origin to app.anoqi.com (+ staging worker URL) once the FE cutover is verified.
app.use(
  '*',
  cors({
    origin: '*',
    allowHeaders: ['authorization', 'x-client-info', 'apikey', 'content-type'],
    allowMethods: ['POST', 'OPTIONS', 'GET'],
  }),
)

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
