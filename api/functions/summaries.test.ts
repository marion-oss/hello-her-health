/**
 * anoqi Summaries — Test Suite
 *
 * Tests parseSummaryJson — the function that validates and structures
 * Gemini's output before it's saved to the DB.
 *
 * Run with: npx vitest run api/functions/summaries.test.ts
 */

import { describe, it, expect } from 'vitest'
import { parseSummaryJson, type SummaryContent } from '../lib/summaryParser'

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function validSummary(overrides: Partial<Record<string, unknown>> = {}): string {
  return JSON.stringify({
    motif: "Douleurs pelviennes cycliques depuis 3 mois",
    symptomes: [
      {
        nom: "Douleurs pelviennes",
        duree: "3 mois",
        frequence: "lors des règles",
        intensite: "importante",
        declencheurs: ["menstruations"],
        evolution: "aggravation",
        impact_quotidien: "Arrêts de travail 1-2 jours par mois"
      }
    ],
    questions: [
      "Pourrait-il s'agir d'endométriose ?",
      "Quels examens recommandez-vous ?"
    ],
    traitements: ["Ibuprofène 400mg en automédication"],
    points_cles: ["Douleurs résistantes aux antalgiques de palier 1"],
    prochaines_etapes: ["Consultation gynécologique", "Échographie pelvienne"],
    langue: "fr",
    genere_le: "2026-05-10T17:00:00.000Z",
    ...overrides
  })
}

// ─────────────────────────────────────────────────────────────
// Valid summaries
// ─────────────────────────────────────────────────────────────
describe('parseSummaryJson — valid input', () => {
  it('parses a complete valid summary', () => {
    const result = parseSummaryJson(validSummary())
    expect(result).not.toBeNull()
    expect(result!.motif).toBe("Douleurs pelviennes cycliques depuis 3 mois")
    expect(result!.symptomes).toHaveLength(1)
    expect(result!.symptomes[0].nom).toBe("Douleurs pelviennes")
    expect(result!.questions).toHaveLength(2)
    expect(result!.traitements).toHaveLength(1)
    expect(result!.points_cles).toHaveLength(1)
    expect(result!.prochaines_etapes).toHaveLength(2)
    expect(result!.langue).toBe('fr')
  })

  it('parses an English summary', () => {
    const result = parseSummaryJson(validSummary({ langue: 'en' }))
    expect(result).not.toBeNull()
    expect(result!.langue).toBe('en')
  })

  it('accepts empty arrays for optional list fields', () => {
    const result = parseSummaryJson(validSummary({
      traitements: [],
      points_cles: [],
      prochaines_etapes: []
    }))
    expect(result).not.toBeNull()
    expect(result!.traitements).toHaveLength(0)
    expect(result!.points_cles).toHaveLength(0)
  })

  it('strips markdown code fences Gemini sometimes adds', () => {
    const withFences = '```json\n' + validSummary() + '\n```'
    const result = parseSummaryJson(withFences)
    expect(result).not.toBeNull()
    expect(result!.motif).toBeTruthy()
  })

  it('strips plain code fences without language tag', () => {
    const withFences = '```\n' + validSummary() + '\n```'
    const result = parseSummaryJson(withFences)
    expect(result).not.toBeNull()
  })

  it('always overwrites genere_le with current timestamp', () => {
    const result = parseSummaryJson(validSummary({ genere_le: '2020-01-01T00:00:00.000Z' }))
    expect(result).not.toBeNull()
    // genere_le should be a recent timestamp, not the one from the JSON
    const generated = new Date(result!.genere_le)
    const now = new Date()
    expect(now.getTime() - generated.getTime()).toBeLessThan(5000) // within 5 seconds
  })
})

// ─────────────────────────────────────────────────────────────
// Field validation
// ─────────────────────────────────────────────────────────────
describe('parseSummaryJson — field validation', () => {
  it('returns null if motif is missing', () => {
    const result = parseSummaryJson(validSummary({ motif: undefined }))
    expect(result).toBeNull()
  })

  it('returns null if motif is empty string', () => {
    const result = parseSummaryJson(validSummary({ motif: '' }))
    expect(result).toBeNull()
  })

  it('returns null if symptomes is missing', () => {
    const result = parseSummaryJson(validSummary({ symptomes: undefined }))
    expect(result).toBeNull()
  })

  it('returns null if questions is missing', () => {
    const result = parseSummaryJson(validSummary({ questions: undefined }))
    expect(result).toBeNull()
  })

  it('defaults langue to "fr" for unknown language values', () => {
    const result = parseSummaryJson(validSummary({ langue: 'de' }))
    expect(result).not.toBeNull()
    expect(result!.langue).toBe('fr')
  })

  it('defaults missing optional arrays to empty arrays', () => {
    const minimal = JSON.stringify({
      motif: "Consultation de suivi",
      symptomes: [],
      questions: ["Une question ?"],
      langue: "fr",
      genere_le: new Date().toISOString()
    })
    const result = parseSummaryJson(minimal)
    expect(result).not.toBeNull()
    expect(result!.traitements).toEqual([])
    expect(result!.points_cles).toEqual([])
    expect(result!.prochaines_etapes).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────
// Length limits — enforced by the parser
// ─────────────────────────────────────────────────────────────
describe('parseSummaryJson — length limits', () => {
  it('caps symptomes at 10 items', () => {
    const tooMany = Array.from({ length: 15 }, (_, i) => ({ nom: `Symptôme ${i + 1}` }))
    const result = parseSummaryJson(validSummary({ symptomes: tooMany }))
    expect(result).not.toBeNull()
    expect(result!.symptomes.length).toBeLessThanOrEqual(10)
  })

  it('caps questions at 8 items', () => {
    const tooMany = Array.from({ length: 12 }, (_, i) => `Question ${i + 1} ?`)
    const result = parseSummaryJson(validSummary({ questions: tooMany }))
    expect(result).not.toBeNull()
    expect(result!.questions.length).toBeLessThanOrEqual(8)
  })

  it('caps points_cles at 5 items', () => {
    const tooMany = Array.from({ length: 8 }, (_, i) => `Point clé ${i + 1}`)
    const result = parseSummaryJson(validSummary({ points_cles: tooMany }))
    expect(result).not.toBeNull()
    expect(result!.points_cles.length).toBeLessThanOrEqual(5)
  })

  it('truncates motif at 500 chars', () => {
    const longMotif = 'a'.repeat(600)
    const result = parseSummaryJson(validSummary({ motif: longMotif }))
    expect(result).not.toBeNull()
    expect(result!.motif.length).toBeLessThanOrEqual(500)
  })
})

// ─────────────────────────────────────────────────────────────
// Symptom field validation
// ─────────────────────────────────────────────────────────────
describe('parseSummaryJson — symptom field validation', () => {
  it('preserves valid intensite values', () => {
    const validIntensites = ['légère', 'modérée', 'importante']
    validIntensites.forEach(intensite => {
      const result = parseSummaryJson(validSummary({
        symptomes: [{ nom: 'Douleur', intensite }]
      }))
      expect(result!.symptomes[0].intensite).toBe(intensite)
    })
  })

  it('drops invalid intensite values', () => {
    const result = parseSummaryJson(validSummary({
      symptomes: [{ nom: 'Douleur', intensite: 'extrême' }]
    }))
    expect(result).not.toBeNull()
    expect(result!.symptomes[0].intensite).toBeUndefined()
  })

  it('preserves valid evolution values', () => {
    const validEvolutions = ['stable', 'aggravation', 'amélioration']
    validEvolutions.forEach(evolution => {
      const result = parseSummaryJson(validSummary({
        symptomes: [{ nom: 'Douleur', evolution }]
      }))
      expect(result!.symptomes[0].evolution).toBe(evolution)
    })
  })

  it('drops invalid evolution values', () => {
    const result = parseSummaryJson(validSummary({
      symptomes: [{ nom: 'Douleur', evolution: 'inconnu' }]
    }))
    expect(result).not.toBeNull()
    expect(result!.symptomes[0].evolution).toBeUndefined()
  })

  it('preserves declencheurs array', () => {
    const result = parseSummaryJson(validSummary({
      symptomes: [{ nom: 'Douleur', declencheurs: ['stress', 'menstruations'] }]
    }))
    expect(result!.symptomes[0].declencheurs).toEqual(['stress', 'menstruations'])
  })
})

// ─────────────────────────────────────────────────────────────
// Malformed input
// ─────────────────────────────────────────────────────────────
describe('parseSummaryJson — malformed input', () => {
  it('returns null for invalid JSON', () => {
    const result = parseSummaryJson('this is not json {{{')
    expect(result).toBeNull()
  })

  it('returns null for empty string', () => {
    const result = parseSummaryJson('')
    expect(result).toBeNull()
  })

  it('returns null for a JSON string (not object)', () => {
    const result = parseSummaryJson('"just a string"')
    expect(result).toBeNull()
  })

  it('returns null for a JSON array (not object)', () => {
    const result = parseSummaryJson('[1, 2, 3]')
    expect(result).toBeNull()
  })

  it('does not throw on any input', () => {
    const inputs = ['', '{}', 'null', 'undefined', '   ', '```', validSummary()]
    inputs.forEach(input => {
      expect(() => parseSummaryJson(input)).not.toThrow()
    })
  })
})
