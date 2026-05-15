/**
 * anoqi Citation Parser — Test Suite
 *
 * Covers parseCitations: extract [Sn] tokens, validate against the
 * snippet set, strip hallucinated refs, build the persisted sources list.
 *
 * Run with: npx vitest run api/lib/citationParser.test.ts
 */

import { describe, it, expect } from 'vitest'
import { parseCitations } from './citationParser'
import type { Snippet } from './retrieval'

// ─────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────
function snip(label: string, extra: Partial<Snippet> = {}): Snippet {
  return {
    label,
    rowId:           `row-${label}`,
    sourceKind:      'pathway',
    sourceRef:       `ref-${label}`,
    pathwayKey:      null,
    pathwayVersion:  null,
    language:        'fr',
    content:         `content ${label}`,
    rrfScore:        0,
    ...extra,
  }
}

// ─────────────────────────────────────────────────────────────
// parseCitations — happy paths
// ─────────────────────────────────────────────────────────────
describe('parseCitations — citation extraction', () => {
  it('returns no citations when input is empty', () => {
    const r = parseCitations('', [snip('S1')])
    expect(r.cleanContent).toBe('')
    expect(r.citedSources).toEqual([])
    expect(r.hallucinatedLabels).toEqual([])
  })

  it('returns no citations when none appear in the body', () => {
    const r = parseCitations('Bonjour, comment puis-je vous aider ?', [snip('S1')])
    expect(r.citedSources).toEqual([])
    expect(r.hallucinatedLabels).toEqual([])
  })

  it('extracts a single valid citation', () => {
    const r = parseCitations(
      'Les règles peuvent varier de 21 à 35 jours [S1].',
      [snip('S1'), snip('S2')],
    )
    expect(r.citedSources).toHaveLength(1)
    expect(r.citedSources[0].label).toBe('S1')
    expect(r.citedSources[0].row_id).toBe('row-S1')
    expect(r.cleanContent).toContain('[S1]')
    expect(r.hallucinatedLabels).toEqual([])
  })

  it('extracts multiple distinct citations in mention order', () => {
    const r = parseCitations(
      'Voici un point [S2]. Et un autre [S1][S3].',
      [snip('S1'), snip('S2'), snip('S3')],
    )
    expect(r.citedSources.map(s => s.label)).toEqual(['S2', 'S1', 'S3'])
  })

  it('deduplicates repeated citations of the same label', () => {
    const r = parseCitations(
      'A point [S1]. The same source again [S1]. Yet another time [S1].',
      [snip('S1')],
    )
    expect(r.citedSources).toHaveLength(1)
    expect(r.citedSources[0].label).toBe('S1')
  })

  it('preserves [Sn] tokens in cleanContent for valid citations', () => {
    const r = parseCitations(
      'Point un [S1]. Point deux [S2].',
      [snip('S1'), snip('S2')],
    )
    expect(r.cleanContent).toContain('[S1]')
    expect(r.cleanContent).toContain('[S2]')
  })
})

// ─────────────────────────────────────────────────────────────
// parseCitations — hallucinations
// ─────────────────────────────────────────────────────────────
describe('parseCitations — hallucination detection', () => {
  it('flags a single hallucinated label', () => {
    const r = parseCitations(
      'La caféine influence le cycle [S9].',
      [snip('S1')],
    )
    expect(r.hallucinatedLabels).toEqual(['S9'])
    expect(r.citedSources).toEqual([])
  })

  it('strips hallucinated tokens from cleanContent', () => {
    const r = parseCitations(
      'Bla bla bla [S9].',
      [snip('S1')],
    )
    expect(r.cleanContent).not.toContain('[S9]')
  })

  it('preserves valid citations and strips invalid ones in the same message', () => {
    const r = parseCitations(
      'Point un [S1]. Inventé [S99]. Point trois [S2].',
      [snip('S1'), snip('S2')],
    )
    expect(r.citedSources.map(s => s.label)).toEqual(['S1', 'S2'])
    expect(r.hallucinatedLabels).toEqual(['S99'])
    expect(r.cleanContent).toContain('[S1]')
    expect(r.cleanContent).toContain('[S2]')
    expect(r.cleanContent).not.toContain('[S99]')
  })

  it('cleans up stray whitespace and punctuation after stripping', () => {
    const r = parseCitations(
      'La phrase [S99]. Suite.',
      [snip('S1')],
    )
    // After stripping [S99] we should not have " ." (a space before the period)
    expect(r.cleanContent).not.toMatch(/ {2,}/)
    expect(r.cleanContent).not.toMatch(/\s+\./)
  })

  it('collects multiple distinct hallucinations', () => {
    const r = parseCitations(
      'A [S88], B [S77], C [S66], A again [S88].',
      [],
    )
    expect(new Set(r.hallucinatedLabels)).toEqual(new Set(['S88', 'S77', 'S66']))
  })
})

// ─────────────────────────────────────────────────────────────
// parseCitations — edge cases
// ─────────────────────────────────────────────────────────────
describe('parseCitations — edge cases', () => {
  it('accepts lower-case [s1] and normalises to uppercase', () => {
    const r = parseCitations(
      'Lower case ref [s1].',
      [snip('S1')],
    )
    expect(r.citedSources).toHaveLength(1)
    expect(r.citedSources[0].label).toBe('S1')
  })

  it('ignores brackets that are not citation patterns', () => {
    const r = parseCitations(
      'Voir [annexe] et [S1].',
      [snip('S1')],
    )
    expect(r.citedSources.map(s => s.label)).toEqual(['S1'])
    expect(r.hallucinatedLabels).toEqual([])
    expect(r.cleanContent).toContain('[annexe]')
  })

  it('handles three-digit labels (only relevant if topK is very large)', () => {
    const r = parseCitations(
      'Long form [S123].',
      [],
    )
    expect(r.hallucinatedLabels).toEqual(['S123'])
  })

  it('citedSources carry through source_kind / source_ref / pathway_key', () => {
    const r = parseCitations(
      'Une ref [S1].',
      [snip('S1', {
        sourceKind:      'source',
        sourceRef:       'src-uuid-123',
        pathwayKey:      'symptoms',
        pathwayVersion:  '1.0',
      })],
    )
    expect(r.citedSources[0]).toMatchObject({
      label:           'S1',
      source_kind:     'source',
      source_ref:      'src-uuid-123',
      pathway_key:     'symptoms',
      pathway_version: '1.0',
    })
  })
})
