/**
 * anoqi — Retrieval-Augmented Generation: query-time retrieval (Workers port)
 *
 * Same logic as api/lib/retrieval.ts. Two differences for the Workers port:
 *   1. SupabaseClient comes from the npm package, not esm.sh.
 *   2. GEMINI_API_KEY is passed in via `env`, not read from `Deno.env`.
 *
 * Failure mode: if embedding or DB calls fail, returns []. Chat continues
 * without snippets (the LLM falls back to its base behaviour). Retrieval
 * MUST NOT block the user's message.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────
// Embedding model: keep in sync with api/jobs/embed_rag.ts EMBEDDING_MODEL.
// Mismatching query-side and document-side embeddings produces garbage retrieval.
const EMBEDDING_MODEL = 'gemini-embedding-001'
const GEMINI_EMBED_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`

const EMBEDDING_DIM = 768
const DEFAULT_TOP_K = 5
const RRF_K         = 60   // standard RRF constant; dampens influence of low-rank items

// Map onboarding journey → seeded clinical_pathways.pathway_key.
const JOURNEY_TO_PATHWAY_KEY: Record<string, string> = {
  symptoms:         'symptoms',
  contraception:    'contraception',
  appointment_prep: 'appointment_prep',
  documents:        'documents',
}

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
export type SourceKind = 'pathway' | 'source' | 'pathway_red_flag'

export interface RawHit {
  id:               string
  source_kind:      SourceKind
  source_ref:       string
  pathway_key:      string | null
  pathway_version:  string | null
  language:         string
  content:          string
  metadata:         Record<string, unknown>
  similarity?:      number
  rank?:            number
}

export interface Snippet {
  label:            string
  rowId:            string
  sourceKind:       SourceKind
  sourceRef:        string
  pathwayKey:       string | null
  pathwayVersion:   string | null
  language:         string
  content:          string
  rrfScore:         number
}

export interface RetrieveOptions {
  message:      string
  journeyType?: string
  language:     'fr' | 'en'
  topK?:        number
}

/** Just the slice of `env` this module needs. */
export interface RetrievalEnv {
  GEMINI_API_KEY: string
}

// ─────────────────────────────────────────────────────────────
// EMBED
// ─────────────────────────────────────────────────────────────
export async function embedQuery(text: string, env: RetrievalEnv): Promise<number[] | null> {
  const apiKey = env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('[retrieval] GEMINI_API_KEY not set; skipping embedding')
    return null
  }

  const trimmed = text.trim()
  if (!trimmed) return null

  try {
    const res = await fetch(GEMINI_EMBED_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        content: { parts: [{ text: trimmed }] },
        outputDimensionality: EMBEDDING_DIM,
        taskType: 'RETRIEVAL_QUERY',
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error('[retrieval] embed API error:', res.status, body.slice(0, 300))
      return null
    }

    const data: any = await res.json()
    const values: number[] | undefined = data.embedding?.values
    if (!Array.isArray(values) || values.length !== EMBEDDING_DIM) {
      console.error('[retrieval] embed returned unexpected shape:', { length: values?.length })
      return null
    }
    return values
  } catch (e) {
    console.error('[retrieval] embed exception:', e)
    return null
  }
}

// ─────────────────────────────────────────────────────────────
// RETRIEVE (main entry point)
// ─────────────────────────────────────────────────────────────
export async function retrieve(
  supabase: SupabaseClient,
  opts: RetrieveOptions,
  env: RetrievalEnv,
): Promise<Snippet[]> {
  const topK        = opts.topK ?? DEFAULT_TOP_K
  const pathwayKey  = opts.journeyType ? (JOURNEY_TO_PATHWAY_KEY[opts.journeyType] ?? null) : null
  const overfetch   = topK * 3

  const queryVec = await embedQuery(opts.message, env)

  const [vRes, fRes] = await Promise.allSettled([
    queryVec
      ? supabase.rpc('rag_vector_search', {
          p_query_embedding: queryVec,
          p_language:        opts.language,
          p_pathway_key:     pathwayKey,
          p_limit:           overfetch,
        })
      : Promise.resolve({ data: null, error: { message: 'no embedding' } } as const),
    supabase.rpc('rag_fts_search', {
      p_query_text:    opts.message,
      p_language:      opts.language,
      p_pathway_key:   pathwayKey,
      p_limit:         overfetch,
    }),
  ])

  const vectorHits = extractHits(vRes, 'vector')
  const ftsHits    = extractHits(fRes, 'fts')

  if (vectorHits.length === 0 && ftsHits.length === 0) {
    return []
  }

  return rrfMerge(vectorHits, ftsHits, topK)
}

// ─────────────────────────────────────────────────────────────
// RRF MERGE
// ─────────────────────────────────────────────────────────────
export function rrfMerge(
  vectorHits: RawHit[],
  ftsHits:    RawHit[],
  topK:       number,
): Snippet[] {
  const scores: Map<string, { hit: RawHit; score: number }> = new Map()

  const accumulate = (hits: RawHit[]) => {
    hits.forEach((hit, idx) => {
      const rank = idx + 1
      const inc  = 1 / (RRF_K + rank)
      const prev = scores.get(hit.id)
      if (prev) {
        prev.score += inc
      } else {
        scores.set(hit.id, { hit, score: inc })
      }
    })
  }

  accumulate(vectorHits)
  accumulate(ftsHits)

  const merged = [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)

  return merged.map(({ hit, score }, idx) => ({
    label:           `S${idx + 1}`,
    rowId:           hit.id,
    sourceKind:      hit.source_kind,
    sourceRef:       hit.source_ref,
    pathwayKey:      hit.pathway_key,
    pathwayVersion:  hit.pathway_version,
    language:        hit.language,
    content:         hit.content,
    rrfScore:        score,
  }))
}

function extractHits(
  result:  PromiseSettledResult<{ data: RawHit[] | null; error: { message: string } | null }>,
  source:  'vector' | 'fts',
): RawHit[] {
  if (result.status === 'rejected') {
    console.error(`[retrieval] ${source} ranker rejected:`, result.reason)
    return []
  }
  if (result.value.error) {
    console.error(`[retrieval] ${source} ranker error:`, result.value.error.message)
    return []
  }
  return Array.isArray(result.value.data) ? result.value.data : []
}

// ─────────────────────────────────────────────────────────────
// RENDER (snippets → system-prompt addendum)
// ─────────────────────────────────────────────────────────────
export function renderSnippetsForPrompt(
  snippets: Snippet[],
  language: 'fr' | 'en',
): string | null {
  if (snippets.length === 0) return null

  const isFrench = language === 'fr'
  const heading  = isFrench
    ? 'Sources autorisées (et seulement celles-ci) que tu peux citer pour répondre :'
    : 'Authorised sources (and only these) that you may cite when answering:'

  const rule = isFrench
    ? [
        'Règles strictes pour ces sources :',
        '- Toute affirmation factuelle doit être suivie de la référence entre crochets, par exemple [S1] ou [S1][S3].',
        '- Si aucune source ci-dessus ne couvre la question posée, dis-le explicitement et redirige vers le médecin — ne pas inventer.',
        '- Ne cite jamais une référence qui n\'est pas dans la liste ci-dessus.',
      ].join('\n')
    : [
        'Strict rules for these sources:',
        '- Every factual claim must be followed by the reference in brackets, e.g. [S1] or [S1][S3].',
        '- If none of the sources above cover the question, say so explicitly and redirect to the doctor — do not invent.',
        '- Never cite a reference that is not in the list above.',
      ].join('\n')

  const blocks = snippets.map(s => {
    const refLine = `[${s.label}] ${s.sourceKind}/${s.sourceRef}` +
      (s.pathwayKey ? ` (parcours: ${s.pathwayKey}${s.pathwayVersion ? ` v${s.pathwayVersion}` : ''})` : '')
    return `${refLine}\n${s.content.trim()}`
  }).join('\n\n')

  return `${heading}\n\n${blocks}\n\n${rule}`
}
