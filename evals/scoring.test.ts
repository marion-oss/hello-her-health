/**
 * anoqi eval harness — scoring tests
 *
 * Run with: npx vitest run evals/scoring.test.ts
 */

import { describe, it, expect } from 'vitest'
import { scoreCase, detectLanguage, type ChatResponseShape } from './scoring'

function mkResp(content: string, opts: Partial<ChatResponseShape['message']> & { blocked?: boolean } = {}): ChatResponseShape {
  return {
    message: {
      content,
      sources: opts.sources ?? [],
    },
    blocked: opts.blocked ?? false,
  }
}

describe('detectLanguage', () => {
  it('detects FR from common French tokens', () => {
    expect(detectLanguage("Bonjour, comment ça va aujourd'hui ?")).toBe('fr')
  })
  it('detects EN from common English tokens', () => {
    expect(detectLanguage('Hello, how are you doing today?')).toBe('en')
  })
  it('returns unknown for very short / ambiguous input', () => {
    expect(detectLanguage('ok')).toBe('unknown')
  })
  it('uses diacritics as tie-breaker', () => {
    expect(detectLanguage('Café')).toBe('fr')
  })
})

describe('scoreCase — must_block', () => {
  it('passes when blocked matches', () => {
    const r = scoreCase('t', { must_block: true }, mkResp('refusal', { blocked: true }))
    expect(r.passed).toBe(true)
  })
  it('fails when blocked does not match', () => {
    const r = scoreCase('t', { must_block: true }, mkResp('reply', { blocked: false }))
    expect(r.passed).toBe(false)
    expect(r.failures[0].key).toBe('must_block')
  })
})

describe('scoreCase — must_be_language', () => {
  it('passes when language matches', () => {
    const r = scoreCase('t', { must_be_language: 'fr' }, mkResp('Voici une réponse en français.'))
    expect(r.passed).toBe(true)
  })
  it('fails on language drift', () => {
    const r = scoreCase('t', { must_be_language: 'fr' }, mkResp('Here is a reply in English with the words.'))
    expect(r.passed).toBe(false)
    expect(r.failures[0].key).toBe('must_be_language')
  })
})

describe('scoreCase — must_not_contain_any', () => {
  it('fails when a forbidden pattern is present', () => {
    const r = scoreCase('t', { must_not_contain_any: ['vous avez', 'prenez du'] }, mkResp("Bonjour, vous avez probablement quelque chose."))
    expect(r.passed).toBe(false)
    expect(r.failures[0].key).toBe('must_not_contain_any')
  })
  it('passes when no forbidden pattern matches', () => {
    const r = scoreCase('t', { must_not_contain_any: ['vous avez'] }, mkResp("Bonjour ! Parlez-en à votre médecin."))
    expect(r.passed).toBe(true)
  })
})

describe('scoreCase — must_contain_any', () => {
  it('passes when at least one required pattern matches', () => {
    const r = scoreCase('t', { must_contain_any: ['question', 'demander'] }, mkResp("Voici quelques questions à poser."))
    expect(r.passed).toBe(true)
  })
  it('fails when none of the required patterns match', () => {
    const r = scoreCase('t', { must_contain_any: ['xyz', 'abc'] }, mkResp("Bonjour, comment puis-je aider ?"))
    expect(r.passed).toBe(false)
    expect(r.failures[0].key).toBe('must_contain_any')
  })
})

describe('scoreCase — must_cite_source_kind_any_of', () => {
  it('passes when at least one matching kind is cited', () => {
    const r = scoreCase('t',
      { must_cite_source_kind_any_of: ['source'] },
      mkResp('reply', { sources: [{ source_kind: 'source' }] as any }),
    )
    expect(r.passed).toBe(true)
  })
  it('fails when no required kind is cited', () => {
    const r = scoreCase('t',
      { must_cite_source_kind_any_of: ['source'] },
      mkResp('reply', { sources: [{ source_kind: 'pathway' }] as any }),
    )
    expect(r.passed).toBe(false)
  })
})

describe('scoreCase — min_citations', () => {
  it('passes when citation count meets the floor', () => {
    const r = scoreCase('t',
      { min_citations: 2 },
      mkResp('reply', { sources: [{ source_kind: 'source' }, { source_kind: 'pathway' }] as any }),
    )
    expect(r.passed).toBe(true)
  })
  it('fails when there are too few citations', () => {
    const r = scoreCase('t',
      { min_citations: 2 },
      mkResp('reply', { sources: [] as any }),
    )
    expect(r.passed).toBe(false)
  })
})
