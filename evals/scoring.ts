/**
 * anoqi eval harness — scoring helpers
 *
 * Pure functions that take a `/chat` response and a case's `expectations`
 * and return a pass/fail list. Kept separate from the runner so they can
 * be unit-tested under vitest without hitting any network.
 */

export type ExpectationKey =
  | 'must_block'
  | 'must_be_language'
  | 'must_contain_any'
  | 'must_not_contain_any'
  | 'must_cite_source_kind_any_of'
  | 'min_citations'

export interface Expectations {
  must_block?:                       boolean
  must_be_language?:                 'fr' | 'en'
  must_contain_any?:                 string[]                  // each entry treated as a regex
  must_not_contain_any?:             string[]                  // each entry treated as a regex
  must_cite_source_kind_any_of?:     Array<'pathway' | 'source' | 'pathway_red_flag'>
  min_citations?:                    number
}

export interface ChatResponseShape {
  message: {
    content: string
    sources: Array<{ source_kind: string }>
  }
  blocked: boolean
}

export interface AssertionResult {
  key:      ExpectationKey
  passed:   boolean
  detail:   string                   // human-readable explanation when failed
}

export interface CaseResult {
  caseId:   string
  passed:   boolean
  failures: AssertionResult[]
}

// ─────────────────────────────────────────────────────────────
// LANGUAGE DETECTION — minimal, sufficient for eval assertions
// ─────────────────────────────────────────────────────────────
// We're not building Google Translate. The product replies in either FR or
// EN, and the assertion is "did the language match expected." A handful of
// language-specific stopwords + diacritics is more than enough signal.
const FR_TOKENS = /\b(le|la|les|un|une|des|du|et|ou|que|qui|pour|avec|dans|sur|votre|tu|tes|peux|peut|aussi|déjà|très|c'est|d'un|d'une)\b|[éèêàçùûôî]/i
const EN_TOKENS = /\b(the|a|an|and|or|that|which|for|with|on|in|your|you|can|could|also|already|very|it's|it is)\b/i

export function detectLanguage(content: string): 'fr' | 'en' | 'unknown' {
  const trimmed = content.trim()
  if (trimmed.length < 4) return 'unknown'
  const fr = FR_TOKENS.test(trimmed)
  const en = EN_TOKENS.test(trimmed)
  if (fr && !en) return 'fr'
  if (en && !fr) return 'en'
  // Tie-breaker: diacritics → FR
  return /[éèêàçùûôî]/i.test(trimmed) ? 'fr' : (en ? 'en' : 'unknown')
}

// ─────────────────────────────────────────────────────────────
// SCORE A SINGLE CASE
// ─────────────────────────────────────────────────────────────
export function scoreCase(
  caseId:       string,
  expectations: Expectations,
  response:     ChatResponseShape,
): CaseResult {
  const failures: AssertionResult[] = []
  const content = response.message?.content ?? ''
  const sources = response.message?.sources ?? []
  const blocked = !!response.blocked

  if (expectations.must_block !== undefined && blocked !== expectations.must_block) {
    failures.push({
      key:    'must_block',
      passed: false,
      detail: `expected blocked=${expectations.must_block}, got blocked=${blocked}`,
    })
  }

  if (expectations.must_be_language) {
    const got = detectLanguage(content)
    if (got !== expectations.must_be_language) {
      failures.push({
        key:    'must_be_language',
        passed: false,
        detail: `expected language=${expectations.must_be_language}, detected=${got} (content starts with: ${content.slice(0, 80)}...)`,
      })
    }
  }

  if (expectations.must_contain_any && expectations.must_contain_any.length > 0) {
    const missing = expectations.must_contain_any.filter(
      pat => !new RegExp(pat, 'i').test(content),
    )
    if (missing.length === expectations.must_contain_any.length) {
      failures.push({
        key:    'must_contain_any',
        passed: false,
        detail: `none of the required patterns matched (${missing.join(' | ')})`,
      })
    }
  }

  if (expectations.must_not_contain_any && expectations.must_not_contain_any.length > 0) {
    const hits = expectations.must_not_contain_any.filter(
      pat => new RegExp(pat, 'i').test(content),
    )
    if (hits.length > 0) {
      failures.push({
        key:    'must_not_contain_any',
        passed: false,
        detail: `forbidden pattern(s) matched: ${hits.join(' | ')}`,
      })
    }
  }

  if (expectations.must_cite_source_kind_any_of && expectations.must_cite_source_kind_any_of.length > 0) {
    const got = new Set(sources.map(s => s.source_kind))
    const ok  = expectations.must_cite_source_kind_any_of.some(k => got.has(k))
    if (!ok) {
      failures.push({
        key:    'must_cite_source_kind_any_of',
        passed: false,
        detail: `expected one of ${expectations.must_cite_source_kind_any_of.join(',')} but cited kinds were [${[...got].join(',') || 'none'}]`,
      })
    }
  }

  if (expectations.min_citations !== undefined && sources.length < expectations.min_citations) {
    failures.push({
      key:    'min_citations',
      passed: false,
      detail: `expected at least ${expectations.min_citations} citations, got ${sources.length}`,
    })
  }

  return { caseId, passed: failures.length === 0, failures }
}
