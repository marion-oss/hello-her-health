/**
 * anoqi Summary Parser
 *
 * Validates and structures Gemini's JSON output for physician-ready summaries.
 * Kept separate from the edge function so it can be unit-tested in Node/Vitest
 * without Deno-specific imports.
 *
 * Imported by:
 *   - api/functions/summaries.ts  (edge function)
 *   - api/functions/summaries.test.ts  (tests)
 */

export type Symptom = {
  nom: string
  duree?: string
  frequence?: string
  intensite?: 'légère' | 'modérée' | 'importante'
  declencheurs?: string[]
  evolution?: 'stable' | 'aggravation' | 'amélioration'
  impact_quotidien?: string
}

export type SummaryContent = {
  motif: string                  // Chief complaint — one sentence
  symptomes: Symptom[]           // Structured symptom list (max 10)
  questions: string[]            // Questions for the doctor (max 8)
  traitements: string[]          // Medications/treatments mentioned (max 10)
  points_cles: string[]          // Key clinical points for the physician (max 5)
  prochaines_etapes: string[]    // Recommended next steps (max 5)
  langue: 'fr' | 'en'
  genere_le: string              // ISO timestamp — always set to now() on parse
}

/**
 * Parse and validate Gemini's raw JSON output into a SummaryContent object.
 * Returns null if the output is malformed or missing required fields.
 * Never throws.
 */
export function parseSummaryJson(raw: string): SummaryContent | null {
  try {
    // Strip any accidental markdown fences Gemini might add
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    const parsed = JSON.parse(cleaned)

    // Validate required fields
    if (typeof parsed.motif !== 'string' || parsed.motif.trim().length === 0) return null
    if (!Array.isArray(parsed.symptomes)) return null
    if (!Array.isArray(parsed.questions)) return null

    const summary: SummaryContent = {
      motif: String(parsed.motif).slice(0, 500),
      symptomes: (parsed.symptomes as Symptom[]).slice(0, 10).map(s => ({
        nom: String(s.nom || '').slice(0, 200),
        ...(s.duree && { duree: String(s.duree).slice(0, 100) }),
        ...(s.frequence && { frequence: String(s.frequence).slice(0, 100) }),
        ...(s.intensite && ['légère', 'modérée', 'importante'].includes(s.intensite)
          ? { intensite: s.intensite } : {}),
        ...(Array.isArray(s.declencheurs) && { declencheurs: s.declencheurs.map(String) }),
        ...(s.evolution && ['stable', 'aggravation', 'amélioration'].includes(s.evolution)
          ? { evolution: s.evolution } : {}),
        ...(s.impact_quotidien && { impact_quotidien: String(s.impact_quotidien).slice(0, 500) }),
      })),
      questions: (parsed.questions as string[]).slice(0, 8).map(q => String(q).slice(0, 500)),
      traitements: Array.isArray(parsed.traitements)
        ? (parsed.traitements as string[]).slice(0, 10).map(t => String(t).slice(0, 200))
        : [],
      points_cles: Array.isArray(parsed.points_cles)
        ? (parsed.points_cles as string[]).slice(0, 5).map(p => String(p).slice(0, 500))
        : [],
      prochaines_etapes: Array.isArray(parsed.prochaines_etapes)
        ? (parsed.prochaines_etapes as string[]).slice(0, 5).map(p => String(p).slice(0, 500))
        : [],
      langue: parsed.langue === 'en' ? 'en' : 'fr',
      genere_le: new Date().toISOString(),  // always use server time, not Gemini's value
    }

    return summary
  } catch {
    return null
  }
}
