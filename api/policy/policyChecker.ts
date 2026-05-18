/**
 * anoqi AI Policy Layer
 *
 * This is the most clinically critical file in the codebase.
 * Every AI response passes through this before reaching the user.
 *
 * Rules are deterministic — no LLM involved in safety decisions.
 * If a rule fires, the output is blocked or modified regardless of
 * how confident the LLM was in its response.
 *
 * To add a new rule: add to the relevant section below and add a test
 * in /api/policy/policy.test.ts
 *
 * ── Changelog ───────────────────────────────────────────────
 * v1.1 — Fixed 3 regex gaps found by policy.test.ts:
 *   1. diagnostic pattern: now catches "Diagnostic:" without a space before colon
 *   2. tu pattern: now catches "tu es atteinte d'" (apostrophe form, not just "de")
 *   3. vous êtes pattern: now catches "vous êtes atteinte d'endométriose"
 *      (with "atteinte" as an optional intermediate word)
 */

export type PolicyFlag = {
  rule: string
  severity: 'block' | 'warn' | 'modify'
  message: string
}

export type PolicyResult = {
  safe: boolean
  flags: PolicyFlag[]
  sanitisedContent: string | null   // modified content if rule fired, null if blocked
}

// ─────────────────────────────────────────────────────────────
// BLOCKED PHRASES — diagnosis language
// If any of these appear in AI output, the response is blocked
// and replaced with a safe fallback
// ─────────────────────────────────────────────────────────────
const DIAGNOSIS_PATTERNS = [
  /vous (avez|souffrez de|êtes atteinte de)/i,
  /tu (as|souffres de|es atteinte d[e'])/i,                  // FIX v1.1: was "es atteinte de", misses "atteinte d'" form
  /il s'agit (d'|de )/i,
  /c'est (probablement |certainement |clairement )/i,
  /diagnostic\s*(de |:)/i,                                    // FIX v1.1: was "diagnostic (de |:)", missed "Diagnostic:" without space
  /vous (souffrez|êtes) (atteinte )?(d'endométriose|de SOPK|de PMDD)/i,  // FIX v1.1: added optional "atteinte" before condition
  /I (diagnose|confirm|identify)/i,
  /you (have|are suffering from|are diagnosed with)/i,
]

// ─────────────────────────────────────────────────────────────
// BLOCKED PHRASES — medication prescription language
// AI must never prescribe or recommend stopping medication
// ─────────────────────────────────────────────────────────────
const PRESCRIPTION_PATTERNS = [
  /prenez (du|de la|des|le|la|les)/i,
  /je vous prescris/i,
  /arrêtez (de prendre|votre)/i,
  /augmentez (la dose|votre)/i,
  /réduisez (la dose|votre)/i,
  /take \d+mg/i,
  /stop taking your/i,
  /increase your (dose|medication)/i,
]

// ─────────────────────────────────────────────────────────────
// WARNING PHRASES — require disclaimer to be appended
// Response is allowed but a physician referral note is added
// ─────────────────────────────────────────────────────────────
const DISCLAIMER_TRIGGER_PATTERNS = [
  /contre-indication/i,
  /contraindicated/i,
  /risque (élevé|important|significatif)/i,
  /high risk/i,
  /UKMEC (3|4)/i,
  /antécédents (de thrombose|de cancer)/i,
  /history of (thrombosis|cancer|stroke)/i,
]

// ─────────────────────────────────────────────────────────────
// SAFE FALLBACK — replaces blocked diagnostic content
// ─────────────────────────────────────────────────────────────
const DIAGNOSIS_FALLBACK: Record<'fr' | 'en', string> = {
  fr: `Je ne suis pas en mesure de poser un diagnostic. Ce que je peux faire, c'est vous aider à comprendre vos symptômes et à préparer les bonnes questions à poser à votre médecin. Voulez-vous que je génère un résumé pour votre prochain rendez-vous ?`,
  en: `I'm not able to make a diagnosis. What I can do is help you understand your symptoms and prepare the right questions for your doctor. Would you like me to generate a summary for your next appointment?`,
}

const PRESCRIPTION_FALLBACK: Record<'fr' | 'en', string> = {
  fr: `Je ne peux pas recommander de médicaments spécifiques ou modifier votre traitement actuel — c'est le rôle de votre médecin. Je peux vous aider à préparer vos questions pour votre prochain rendez-vous.`,
  en: `I can't recommend specific medications or change your current treatment — that's your doctor's role. I can help you prepare questions for your next appointment.`,
}

// ─────────────────────────────────────────────────────────────
// DISCLAIMER — appended when warning patterns fire
// ─────────────────────────────────────────────────────────────
const PHYSICIAN_DISCLAIMER: Record<'fr' | 'en', string> = {
  fr: `\n\n⚠️ *Ces informations sont fournies à titre informatif uniquement. Parlez-en avec votre médecin avant de prendre toute décision concernant votre santé.*`,
  en: `\n\n⚠️ *This information is provided for informational purposes only. Speak with your doctor before making any decisions about your health.*`,
}

// ─────────────────────────────────────────────────────────────
// MAIN POLICY CHECKER
// Call this on every AI response before sending to user
// ─────────────────────────────────────────────────────────────
export function checkPolicy(content: string, language: 'fr' | 'en' = 'fr'): PolicyResult {
  const flags: PolicyFlag[] = []
  let sanitisedContent = content

  // Check for diagnosis language — BLOCK
  for (const pattern of DIAGNOSIS_PATTERNS) {
    if (pattern.test(content)) {
      flags.push({
        rule: 'no_diagnosis',
        severity: 'block',
        message: `Diagnosis language detected: ${pattern.toString()}`
      })
      return {
        safe: false,
        flags,
        sanitisedContent: DIAGNOSIS_FALLBACK[language]
      }
    }
  }

  // Check for prescription language — BLOCK
  for (const pattern of PRESCRIPTION_PATTERNS) {
    if (pattern.test(content)) {
      flags.push({
        rule: 'no_prescription',
        severity: 'block',
        message: `Prescription language detected: ${pattern.toString()}`
      })
      return {
        safe: false,
        flags,
        sanitisedContent: PRESCRIPTION_FALLBACK[language]
      }
    }
  }

  // Check for high-risk content — WARN + append disclaimer
  for (const pattern of DISCLAIMER_TRIGGER_PATTERNS) {
    if (pattern.test(content)) {
      flags.push({
        rule: 'physician_disclaimer_required',
        severity: 'warn',
        message: `High-risk content detected: ${pattern.toString()}`
      })
      sanitisedContent = content + PHYSICIAN_DISCLAIMER[language]
    }
  }

  return {
    safe: true,
    flags,
    sanitisedContent
  }
}

// ─────────────────────────────────────────────────────────────
// INPUT CLASSIFIER
// Check user input before sending to LLM
// Catches obvious attempts to get diagnosis/prescription
// ─────────────────────────────────────────────────────────────
const UNSAFE_INPUT_PATTERNS = [
  /dis-moi (ce que j'ai|mon diagnostic)/i,
  /quel est mon diagnostic/i,
  /prescris-moi/i,
  /tell me what (disease|condition) i have/i,
  /diagnose me/i,
  /prescribe me/i,
]

export function classifyInput(userInput: string): { safe: boolean; reason?: string } {
  for (const pattern of UNSAFE_INPUT_PATTERNS) {
    if (pattern.test(userInput)) {
      return {
        safe: false,
        reason: 'Input requests diagnosis or prescription — redirect to journey'
      }
    }
  }
  return { safe: true }
}
