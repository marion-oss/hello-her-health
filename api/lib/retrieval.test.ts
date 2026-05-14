/**
 * anoqi Retrieval — Test Suite
 *
 * Covers the pure functions in retrieval.ts that don't touch the network:
 *   - rrfMerge: Reciprocal Rank Fusion of two ranked lists
 *   - renderSnippetsForPrompt: French/English prompt addendum
 *
 * embedQuery + retrieve hit Gemini + Supabase respectively and live
 * behind integration tests (not in this file).
 *
 * Run with: npx vitest run api/lib/retrieval.test.ts
 */

import { describe, it, expect } from 'vitest'
import { rrfMerge, renderSnippetsForPrompt, type RawHit, type Snippet } from './retrieval'

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function hit(id: string, extra: Partial<RawHit> = {}): RawHit {
  return {
    id,
    source_kind:     'pathway',
    source_ref:      `ref-${id}`,
    pathway_key:     null,
    pathway_version: null,
    language:        'fr',
    content:         `content for ${id}`,
    metadata:        {},
    ...extra,
  }
}

function snippet(label: string, rowId: string, extra: Partial<Snippet> = {}): Snippet {
  return {
    label,
    rowId,
    sourceKind:      'pathway',
    sourceRef:       `ref-${rowId}`,
    pathwayKey:      null,
    pathwayVersion:  null,
    language:        'fr',
    content:         `content ${rowId}`,
    rrfScore:        0,
    ...extra,
  }
}

// ─────────────────────────────────────────────────────────────
// rrfMerge
// ─────────────────────────────────────────────────────────────
describe('rrfMerge', () => {
  it('returns empty when both inputs are empty', () => {
    expect(rrfMerge([], [], 5)).toEqual([])
  })

  it('returns the vector list when FTS is empty', () => {
    const out = rrfMerge([hit('a'), hit('b'), hit('c')], [], 5)
    expect(out.map(s => s.rowId)).toEqual(['a', 'b', 'c'])
  })

  it('returns the FTS list when vector is empty', () => {
    const out = rrfMerge([], [hit('a'), hit('b'), hit('c')], 5)
    expect(out.map(s => s.rowId)).toEqual(['a', 'b', 'c'])
  })

  it('assigns sequential S1, S2, ... labels', () => {
    const out = rrfMerge([hit('a'), hit('b')], [], 5)
    expect(out.map(s => s.label)).toEqual(['S1', 'S2'])
  })

  it('truncates at topK', () => {
    const v = ['a', 'b', 'c', 'd', 'e', 'f'].map(id => hit(id))
    const out = rrfMerge(v, [], 3)
    expect(out).toHaveLength(3)
    expect(out.map(s => s.rowId)).toEqual(['a', 'b', 'c'])
  })

  it('items appearing in BOTH rankers outrank items in one only', () => {
    // Vector ranks: a(1), b(2), c(3)
    // FTS ranks:    b(1), d(2), e(3)
    // 'b' appears in both — should be top
    const out = rrfMerge(
      [hit('a'), hit('b'), hit('c')],
      [hit('b'), hit('d'), hit('e')],
      10,
    )
    expect(out[0].rowId).toBe('b')
  })

  it('preserves higher-ranked items when scores tie', () => {
    // Both rankers give a=1, b=2 — both should keep their order
    const out = rrfMerge(
      [hit('a'), hit('b')],
      [hit('a'), hit('b')],
      10,
    )
    expect(out.map(s => s.rowId)).toEqual(['a', 'b'])
    expect(out[0].rrfScore).toBeGreaterThan(out[1].rrfScore)
  })

  it('rrfScore is strictly decreasing across results', () => {
    const v = ['a', 'b', 'c', 'd', 'e'].map(id => hit(id))
    const f = ['c', 'b', 'a', 'f', 'g'].map(id => hit(id))
    const out = rrfMerge(v, f, 5)
    for (let i = 1; i < out.length; i++) {
      expect(out[i].rrfScore).toBeLessThanOrEqual(out[i - 1].rrfScore)
    }
  })

  it('carries through source_kind, source_ref, pathway_key', () => {
    const out = rrfMerge(
      [hit('a', {
        source_kind:     'source',
        source_ref:      'src-123',
        pathway_key:     'symptoms',
        pathway_version: '1.0',
      })],
      [],
      5,
    )
    expect(out[0]).toMatchObject({
      sourceKind:      'source',
      sourceRef:       'src-123',
      pathwayKey:      'symptoms',
      pathwayVersion:  '1.0',
    })
  })
})

// ─────────────────────────────────────────────────────────────
// renderSnippetsForPrompt
// ─────────────────────────────────────────────────────────────
describe('renderSnippetsForPrompt', () => {
  it('returns null for empty input', () => {
    expect(renderSnippetsForPrompt([], 'fr')).toBeNull()
    expect(renderSnippetsForPrompt([], 'en')).toBeNull()
  })

  it('renders French heading + rules in fr mode', () => {
    const out = renderSnippetsForPrompt([snippet('S1', 'a')], 'fr') ?? ''
    expect(out).toContain('Sources autorisées')
    expect(out).toContain('[S1]')
    expect(out).toContain('Toute affirmation factuelle')
    expect(out).toContain('redirige vers le médecin')
  })

  it('renders English heading + rules in en mode', () => {
    const out = renderSnippetsForPrompt([snippet('S1', 'a')], 'en') ?? ''
    expect(out).toContain('Authorised sources')
    expect(out).toContain('[S1]')
    expect(out).toContain('Every factual claim')
    expect(out).toContain('redirect to the doctor')
  })

  it('includes pathway key + version when present', () => {
    const out = renderSnippetsForPrompt([
      snippet('S1', 'a', { pathwayKey: 'symptoms', pathwayVersion: '1.0' }),
    ], 'fr') ?? ''
    expect(out).toContain('symptoms')
    expect(out).toContain('v1.0')
  })

  it('lists every snippet with its label and content', () => {
    const out = renderSnippetsForPrompt([
      snippet('S1', 'a', { content: 'alpha content' }),
      snippet('S2', 'b', { content: 'beta content' }),
      snippet('S3', 'c', { content: 'gamma content' }),
    ], 'fr') ?? ''
    expect(out).toContain('[S1]')
    expect(out).toContain('[S2]')
    expect(out).toContain('[S3]')
    expect(out).toContain('alpha content')
    expect(out).toContain('beta content')
    expect(out).toContain('gamma content')
  })

  it('strict citation rule is present (model must not cite outside the set)', () => {
    const fr = renderSnippetsForPrompt([snippet('S1', 'a')], 'fr') ?? ''
    expect(fr).toMatch(/jamais.*référence.*pas dans la liste/i)
    const en = renderSnippetsForPrompt([snippet('S1', 'a')], 'en') ?? ''
    expect(en).toMatch(/Never cite.*not in the list/i)
  })
})
