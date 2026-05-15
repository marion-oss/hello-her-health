/**
 * anoqi — Citation parser for RAG-augmented chat
 *
 * The LLM is instructed (by retrieval.ts → renderSnippetsForPrompt) to cite
 * sources by bracketed label, e.g. [S1] or [S1][S3]. This module:
 *
 *   1. Extracts every cited label from the raw model output.
 *   2. Validates each label against the snippets that were *actually*
 *      provided in this turn. Labels outside the provided set are
 *      hallucinations (the model invented a citation) and must be flagged.
 *   3. Maps cited labels to the canonical `messages.sources` JSONB shape
 *      that the mobile client will render as tappable footnote badges.
 *
 * Visible content: by default we KEEP the [Sn] tokens in the message body.
 * The mobile client (ChatScreen.tsx) renders them as badges so the user
 * sees what's grounded and what isn't.
 */

import type { Snippet } from './retrieval'

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
export interface MessageSource {
  /** The label used in the message body, e.g. 'S1'. */
  label:           string
  /** rag_chunks.id — stable across re-embeds. */
  row_id:          string
  source_kind:     'pathway' | 'source' | 'pathway_red_flag'
  source_ref:      string
  pathway_key:     string | null
  pathway_version: string | null
}

export interface ParsedCitations {
  /** The visible content. [Sn] tokens are preserved; hallucinated ones are removed. */
  cleanContent:        string
  /** Subset of provided snippets that were cited at least once. Order matches first-mention order in the message. */
  citedSources:        MessageSource[]
  /** Labels that appeared in the message but were NOT in the provided snippet set. */
  hallucinatedLabels:  string[]
}

// Matches [S1], [S12], [S123]... case-insensitive on the S.
const CITATION_RE = /\[s(\d+)\]/gi

// ─────────────────────────────────────────────────────────────
// PARSE
// ─────────────────────────────────────────────────────────────
export function parseCitations(
  rawContent: string,
  availableSnippets: Snippet[],
): ParsedCitations {
  const byLabel = new Map(availableSnippets.map(s => [s.label.toUpperCase(), s]))

  const citedOrder:        string[]       = []
  const seenCitedLabels:   Set<string>    = new Set()
  const hallucinated:      Set<string>    = new Set()

  // Walk every match. Don't mutate yet — collect first.
  for (const match of rawContent.matchAll(CITATION_RE)) {
    const label = `S${match[1]}`.toUpperCase()
    if (byLabel.has(label)) {
      if (!seenCitedLabels.has(label)) {
        seenCitedLabels.add(label)
        citedOrder.push(label)
      }
    } else {
      hallucinated.add(label)
    }
  }

  // Strip hallucinated citation tokens from the visible content so the
  // user doesn't see broken references. Real ones are preserved for the
  // client to render as badges.
  let cleanContent = rawContent
  if (hallucinated.size > 0) {
    cleanContent = rawContent.replace(CITATION_RE, (full, num) => {
      const label = `S${num}`.toUpperCase()
      return byLabel.has(label) ? full : ''
    })
    // Collapse any double-spaces or stray punctuation left behind.
    cleanContent = cleanContent
      .replace(/ {2,}/g, ' ')
      .replace(/\s+([.,;:!?])/g, '$1')
      .trim()
  }

  const citedSources: MessageSource[] = citedOrder.map(label => {
    const s = byLabel.get(label)!
    return {
      label:           s.label,
      row_id:          s.rowId,
      source_kind:     s.sourceKind,
      source_ref:      s.sourceRef,
      pathway_key:     s.pathwayKey,
      pathway_version: s.pathwayVersion,
    }
  })

  return {
    cleanContent,
    citedSources,
    hallucinatedLabels: [...hallucinated],
  }
}
