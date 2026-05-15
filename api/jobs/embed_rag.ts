/**
 * anoqi — RAG corpus embedding job
 *
 * One-shot script that:
 *   1. Loads all non-archived clinical_pathways, active source_library
 *      entries, and active pathway_red_flags.
 *   2. Chunks each into retrieval-sized pieces (~400 tokens, often shorter
 *      because seeded content is small).
 *   3. Embeds each chunk via Gemini text-embedding-004 (taskType=RETRIEVAL_DOCUMENT).
 *   4. Upserts into public.rag_chunks (PK: source_kind + source_ref + chunk_index).
 *   5. Calls public.delete_stale_rag_chunks() to drop chunks whose source is
 *      no longer live/active.
 *
 * Run locally:
 *   SUPABASE_URL=... \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   GEMINI_API_KEY=... \
 *   deno run --allow-env --allow-net api/jobs/embed_rag.ts
 *
 * Re-running is safe — upsert keys are stable on (source_kind, source_ref, chunk_index).
 *
 * Roadmap note: today this embeds pathways with status != 'archived' so the
 * seeded (draft) pathways are available to chat. Once the v1 physician portal
 * lands and pathways transition through draft → in_review → approved → live,
 * tighten the filter to status = 'live' here.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────
const EMBEDDING_MODEL   = 'gemini-embedding-001'
const GEMINI_EMBED_URL  =
  `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`
const EMBEDDING_DIM     = 768
const CONCURRENCY       = 4

// Roughly 4 chars per token for French/English text — good enough for the
// token_count column which is informational, not load-bearing.
function approxTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type SourceKind = 'pathway' | 'source' | 'pathway_red_flag'

interface ChunkInput {
  source_kind:      SourceKind
  source_ref:       string
  pathway_key:      string | null
  pathway_version:  string | null
  language:         string
  chunk_index:      number
  content:          string
  metadata:         Record<string, unknown>
}

interface PathwayContent {
  opening_message?:       string
  questions?:             Array<string | { id?: string; text?: string }>
  red_flag_escalation?:   string
  [k: string]:            unknown
}

interface PathwayRow {
  id:             string
  pathway_key:    string
  version:        string
  status:         string
  title:          string
  description:    string | null
  content:        PathwayContent
}

interface SourceRow {
  id:        string
  name:      string
  url:       string | null
  category:  string | null
  language:  string | null
  notes:     string | null
  is_active: boolean
}

interface RedFlagRow {
  id:                 string
  pathway_key:        string
  trigger_text:       string
  escalation_type:    string
  escalation_message: string
  clinical_basis:     string | null
  is_active:          boolean
}

// ─────────────────────────────────────────────────────────────
// CHUNKERS
// ─────────────────────────────────────────────────────────────
function chunkPathway(row: PathwayRow): ChunkInput[] {
  const out: ChunkInput[] = []
  const c = row.content || {}

  // Anoqi pathways are French-first today. Once a pathway carries a
  // language field per-version, derive it here.
  const language = 'fr'

  let idx = 0

  if (typeof c.opening_message === 'string' && c.opening_message.trim()) {
    out.push({
      source_kind:     'pathway',
      source_ref:      row.id,
      pathway_key:     row.pathway_key,
      pathway_version: row.version,
      language,
      chunk_index:     idx++,
      content:         `${row.title}\n\n${c.opening_message.trim()}`,
      metadata:        { section: 'opening_message', title: row.title },
    })
  }

  // questions[] may be either strings or { text } objects depending on
  // how the physician portal serialises them. Handle both.
  if (Array.isArray(c.questions)) {
    for (const q of c.questions) {
      const text = typeof q === 'string' ? q : (q?.text ?? '')
      if (typeof text === 'string' && text.trim()) {
        out.push({
          source_kind:     'pathway',
          source_ref:      row.id,
          pathway_key:     row.pathway_key,
          pathway_version: row.version,
          language,
          chunk_index:     idx++,
          content:         text.trim(),
          metadata:        { section: 'question' },
        })
      }
    }
  }

  if (typeof c.red_flag_escalation === 'string' && c.red_flag_escalation.trim()) {
    out.push({
      source_kind:     'pathway',
      source_ref:      row.id,
      pathway_key:     row.pathway_key,
      pathway_version: row.version,
      language,
      chunk_index:     idx++,
      content:         c.red_flag_escalation.trim(),
      metadata:        { section: 'red_flag_escalation' },
    })
  }

  if (row.description && row.description.trim()) {
    out.push({
      source_kind:     'pathway',
      source_ref:      row.id,
      pathway_key:     row.pathway_key,
      pathway_version: row.version,
      language,
      chunk_index:     idx++,
      content:         row.description.trim(),
      metadata:        { section: 'description' },
    })
  }

  return out
}

function chunkSource(row: SourceRow): ChunkInput[] {
  // Only embed the citation pointer (name + notes). The actual URL content
  // is NOT crawled — citations are pointers, not retrieved bodies. This
  // avoids the medical-device risk of grounding the model on arbitrary
  // external content.
  const parts = [row.name, row.notes].filter(p => p && p.trim()).join('\n\n')
  if (!parts) return []
  return [{
    source_kind:     'source',
    source_ref:      row.id,
    pathway_key:     null,
    pathway_version: null,
    language:        row.language || 'fr',
    chunk_index:     0,
    content:         parts,
    metadata:        { category: row.category, url: row.url },
  }]
}

function chunkRedFlag(row: RedFlagRow): ChunkInput[] {
  // Red flags are short. One chunk per row; content combines the trigger
  // semantics and the escalation, so the retriever can surface them when
  // a user describes a related symptom even before the deterministic
  // pre-pass in Phase 2 fires.
  const body = [
    `Drapeau rouge (${row.escalation_type}) — parcours ${row.pathway_key}`,
    row.trigger_text,
    row.escalation_message,
    row.clinical_basis ? `Base clinique: ${row.clinical_basis}` : null,
  ].filter(Boolean).join('\n\n')

  return [{
    source_kind:     'pathway_red_flag',
    source_ref:      row.id,
    pathway_key:     row.pathway_key,
    pathway_version: null,
    language:        'fr',
    chunk_index:     0,
    content:         body,
    metadata:        { escalation_type: row.escalation_type },
  }]
}

// ─────────────────────────────────────────────────────────────
// EMBED
// ─────────────────────────────────────────────────────────────
async function embed(text: string, apiKey: string): Promise<number[]> {
  const res = await fetch(GEMINI_EMBED_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      outputDimensionality: EMBEDDING_DIM,
      // RETRIEVAL_DOCUMENT for corpus side; query side uses RETRIEVAL_QUERY.
      taskType: 'RETRIEVAL_DOCUMENT',
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Gemini embed failed ${res.status}: ${body.slice(0, 300)}`)
  }
  const data = await res.json()
  const values: number[] = data.embedding?.values ?? []
  if (values.length !== EMBEDDING_DIM) {
    throw new Error(`Embedding returned ${values.length} dims, expected ${EMBEDDING_DIM}`)
  }
  return values
}

// ─────────────────────────────────────────────────────────────
// CONCURRENCY HELPER
// ─────────────────────────────────────────────────────────────
async function mapConcurrent<I, O>(
  items: I[],
  limit: number,
  fn: (item: I, idx: number) => Promise<O>,
): Promise<O[]> {
  const results: O[] = new Array(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = cursor++
      if (i >= items.length) return
      results[i] = await fn(items[i], i)
    }
  })
  await Promise.all(workers)
  return results
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
async function main() {
  const supabaseUrl    = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const geminiApiKey   = Deno.env.get('GEMINI_API_KEY')

  if (!supabaseUrl || !serviceRoleKey || !geminiApiKey) {
    console.error('Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY')
    Deno.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  // ── 1. Load source rows ────────────────────────────────────
  console.log('[embed_rag] loading pathways, sources, red-flags...')

  const { data: pathways, error: pErr } = await supabase
    .from('clinical_pathways')
    .select('id, pathway_key, version, status, title, description, content')
    .neq('status', 'archived')
  if (pErr) throw pErr

  const { data: sources, error: sErr } = await supabase
    .from('source_library')
    .select('id, name, url, category, language, notes, is_active')
    .eq('is_active', true)
  if (sErr) throw sErr

  const { data: redFlags, error: rErr } = await supabase
    .from('pathway_red_flags')
    .select('id, pathway_key, trigger_text, escalation_type, escalation_message, clinical_basis, is_active')
    .eq('is_active', true)
  if (rErr) throw rErr

  console.log(`[embed_rag] loaded: ${pathways?.length ?? 0} pathways, ${sources?.length ?? 0} sources, ${redFlags?.length ?? 0} red flags`)

  // ── 2. Chunk ───────────────────────────────────────────────
  const allChunks: ChunkInput[] = []
  for (const p of (pathways ?? []) as PathwayRow[]) allChunks.push(...chunkPathway(p))
  for (const s of (sources  ?? []) as SourceRow[]) allChunks.push(...chunkSource(s))
  for (const r of (redFlags ?? []) as RedFlagRow[]) allChunks.push(...chunkRedFlag(r))

  console.log(`[embed_rag] produced ${allChunks.length} chunks`)

  if (allChunks.length === 0) {
    console.log('[embed_rag] nothing to embed; exiting')
    return
  }

  // ── 3. Embed + upsert (concurrent) ─────────────────────────
  let succeeded = 0
  let failed    = 0

  await mapConcurrent(allChunks, CONCURRENCY, async (chunk, idx) => {
    try {
      const embedding = await embed(chunk.content, geminiApiKey)
      const row = {
        source_kind:      chunk.source_kind,
        source_ref:       chunk.source_ref,
        pathway_key:      chunk.pathway_key,
        pathway_version:  chunk.pathway_version,
        language:         chunk.language,
        chunk_index:      chunk.chunk_index,
        content:          chunk.content,
        embedding,
        embedding_model:  EMBEDDING_MODEL,
        token_count:      approxTokens(chunk.content),
        metadata:         chunk.metadata,
      }
      const { error } = await supabase
        .from('rag_chunks')
        .upsert(row, { onConflict: 'source_kind,source_ref,chunk_index' })
      if (error) {
        console.error(`[embed_rag] upsert failed for chunk ${idx} (${chunk.source_kind}/${chunk.source_ref}#${chunk.chunk_index}):`, error.message)
        failed++
      } else {
        succeeded++
        if (succeeded % 10 === 0) console.log(`[embed_rag] embedded ${succeeded}/${allChunks.length}...`)
      }
    } catch (e) {
      console.error(`[embed_rag] error on chunk ${idx}:`, (e as Error).message)
      failed++
    }
  })

  console.log(`[embed_rag] embed+upsert done: ${succeeded} succeeded, ${failed} failed`)

  // ── 4. Drop stale chunks ───────────────────────────────────
  // Set ANOQI_SKIP_RECONCILE=1 to skip the post-embed reconciliation pass.
  // Useful when the deployed reconcile function has a different status
  // policy than the embed step (e.g. function filters status='live' but
  // we're embedding drafts) — running it would delete what we just inserted.
  if (Deno.env.get('ANOQI_SKIP_RECONCILE') === '1') {
    console.log('[embed_rag] reconciliation skipped (ANOQI_SKIP_RECONCILE=1)')
    return
  }

  const { data: staleCount, error: rpcErr } = await supabase.rpc('delete_stale_rag_chunks')
  if (rpcErr) {
    console.warn('[embed_rag] delete_stale_rag_chunks failed:', rpcErr.message)
  } else {
    console.log(`[embed_rag] reconciliation removed ${staleCount ?? 0} stale chunks`)
  }
}

if (import.meta.main) {
  main().catch(e => {
    console.error('[embed_rag] fatal:', e)
    Deno.exit(1)
  })
}
