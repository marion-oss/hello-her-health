/**
 * anoqi — Client-side Pseudonymisation Pipeline
 *
 * Strips personally identifiable information (PII) from document text
 * BEFORE anything leaves the device. This is the privacy guarantee:
 * raw text never reaches the server or the AI layer.
 *
 * This file is a direct port of api/lib/pseudonymise.ts.
 * Both files must be kept in sync. When adding or changing a PII rule,
 * update both files and run the server-side tests (pseudonymise.test.ts)
 * to validate the change.
 *
 * Approach:
 * - Deterministic regex patterns — no AI, no network call
 * - PII is replaced with typed placeholders, not blank redactions
 *   e.g. "Marie Dupont" → "[NOM]", "06 12 34 56 78" → "[TELEPHONE]"
 * - Typed placeholders preserve document structure so the AI still
 *   understands what kind of information was present
 *
 * Limitations (known, accepted for v1):
 * - Name detection is pattern-based, not NER — will miss unusual formats
 * - Address detection catches common French formats; edge cases may slip
 * - OCR errors in scanned documents may cause PII to evade patterns
 *
 * To add a new PII type:
 * 1. Add the pattern + placeholder to PII_RULES below (same in both files)
 * 2. Add test cases to api/lib/pseudonymise.test.ts
 * 3. Run tests: cd api && npm test
 */

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
export type PseudonymisationResult = {
  pseudonymisedText: string
  detectedTypes: string[]      // which PII types were found, for audit logging
  replacementCount: number     // total number of replacements made
}

export type DocumentCategory =
  | 'analyses'
  | 'imagerie'
  | 'comptes_rendus'
  | 'ordonnances'
  | 'vaccins'
  | 'antecedents'
  | 'autre'

// ─────────────────────────────────────────────────────────────
// PII RULES
// Order matters — more specific patterns should come first
// placeholder can be a static string or a transform function
// ─────────────────────────────────────────────────────────────
type PiiRule = {
  pattern: RegExp
  placeholder: string | ((...args: string[]) => string)
  label: string
}

const PII_RULES: PiiRule[] = [

  // ── Numéro de Sécurité Sociale (INSEE) ──────────────────────
  // Format: 1 or 2, then 12 more digits, optionally spaced
  // e.g. 2 85 03 75 116 042 06 or 285037511604206
  {
    pattern: /\b[12]\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{3}\s?\d{2}\b/g,
    placeholder: '[NIR]',
    label: 'nir',
  },

  // ── NHS Number (UK format) ───────────────────────────────────
  // Format: XXX XXX XXXX (10 digits, spaces optional)
  {
    pattern: /\b\d{3}\s\d{3}\s\d{4}\b/g,
    placeholder: '[NHS]',
    label: 'nhs_number',
  },

  // ── Email addresses ──────────────────────────────────────────
  {
    pattern: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,
    placeholder: '[EMAIL]',
    label: 'email',
  },

  // ── French phone numbers ─────────────────────────────────────
  // Formats: 06 12 34 56 78 | 0612345678 | +33 6 12 34 56 78
  {
    pattern: /(?:\+33\s?|0)[1-9](?:[\s.\-]?\d{2}){4}\b/g,
    placeholder: '[TELEPHONE]',
    label: 'phone',
  },

  // ── International phone numbers ──────────────────────────────
  // e.g. +44 7911 123456 | +1 415 555 2671
  {
    pattern: /\+(?!33)\d{1,3}[\s.\-]?\(?\d{1,4}\)?[\s.\-]?\d{1,4}[\s.\-]?\d{1,9}\b/g,
    placeholder: '[TELEPHONE]',
    label: 'phone_international',
  },

  // ── Dates of birth ───────────────────────────────────────────
  // Strips day + month, KEEPS the year (birth year is retained by design).
  // "née le 15/03/1985" → "née le [DATE_NAISSANCE] 1985"
  {
    pattern: /(?:né(?:e)?\s+le|date\s+de\s+naissance\s*:?\s*|DDN\s*:?\s*|DOB\s*:?\s*|born\s+on\s+|born\s*:?\s*)\s*\d{1,2}[\/.\-]\d{1,2}[\/.\-](\d{2,4})/gi,
    placeholder: (_match: string, year: string) => `[DATE_NAISSANCE] ${year}`,
    label: 'dob_labelled',
  },

  // ── French postal addresses ──────────────────────────────────
  // "12 rue de la Paix" | "5 avenue Victor Hugo"
  {
    pattern: /\b\d{1,4}\s+(?:rue|avenue|av\.|boulevard|bd\.?|impasse|allée|chemin|route|place|square|résidence|cité|villa)\s+(?:de\s+(?:la\s+|l'|les\s+|du\s+)?)?[A-ZÀ-Ÿa-zà-ÿ\s'\-]{3,40}/gi,
    placeholder: '[ADRESSE]',
    label: 'address',
  },

  // ── French postal codes ──────────────────────────────────────
  // 5-digit French postal codes (75001–98799)
  {
    pattern: /\b(?:7[5-9]|[89]\d)\d{3}\b/g,
    placeholder: '[CODE_POSTAL]',
    label: 'postal_code',
  },

  // ── Patient name markers ─────────────────────────────────────
  // "Patient : Marie Dupont" | "Nom : DUPONT" | "Prénom : Marie"
  {
    pattern: /(?:patient(?:e)?\s*:?\s*|nom\s*:?\s*|prénom\s*:?\s*|name\s*:?\s*)([A-ZÀ-Ÿ][A-Za-zÀ-ÿ\-']{1,30}(?:\s+[A-ZÀ-Ÿ][A-Za-zÀ-ÿ\-']{1,30})*)/gi,
    placeholder: '[NOM]',
    label: 'name_labelled',
  },

  // ── Doctor / practitioner names ──────────────────────────────
  // "Dr Marie Dupont" | "Dr. Dupont" | "Docteur Dupont" | "Pr. Martin"
  {
    pattern: /\b(?:Dr\.?\s+|Docteur\s+|Pr\.?\s+|Professeur\s+)[A-ZÀ-Ÿ][A-Za-zÀ-ÿ\-']{1,30}(?:\s+[A-ZÀ-Ÿ][A-Za-zÀ-ÿ\-']{1,30})?\b/g,
    placeholder: '[MEDECIN]',
    label: 'doctor_name',
  },

  // ── RPPS / ADELI practitioner numbers ───────────────────────
  {
    pattern: /\b(?:RPPS\s*:?\s*\d{11}|ADELI\s*:?\s*\d{9})\b/gi,
    placeholder: '[NUM_PRATICIEN]',
    label: 'practitioner_number',
  },
]

// ─────────────────────────────────────────────────────────────
// PSEUDONYMISE
// ─────────────────────────────────────────────────────────────
export function pseudonymise(text: string): PseudonymisationResult {
  if (!text || text.trim().length === 0) {
    return { pseudonymisedText: text, detectedTypes: [], replacementCount: 0 }
  }

  let result = text
  const detectedTypes: string[] = []
  let replacementCount = 0

  for (const rule of PII_RULES) {
    rule.pattern.lastIndex = 0

    const matches = result.match(rule.pattern)
    if (matches && matches.length > 0) {
      if (!detectedTypes.includes(rule.label)) {
        detectedTypes.push(rule.label)
      }
      replacementCount += matches.length
      result = result.replace(rule.pattern, rule.placeholder as string)
      rule.pattern.lastIndex = 0
    }
  }

  return { pseudonymisedText: result, detectedTypes, replacementCount }
}

// ─────────────────────────────────────────────────────────────
// CLASSIFY DOCUMENT
// Returns one of the DocumentCategory values based on content signals.
// Used to auto-populate the document_type column before user confirms.
// ─────────────────────────────────────────────────────────────
const CATEGORY_SIGNALS: Array<{ category: DocumentCategory; patterns: RegExp[] }> = [
  {
    category: 'analyses',
    patterns: [
      /résultat(?:s)? (?:d'analyse|de laboratoire|de biologie)/i,
      /bilan\s+(?:sanguin|biologique|lipidique|hormonal|thyroïdien)/i,
      /\b(?:NFS|FSC|hémoglobine|leucocytes|plaquettes|ferritine|TSH|T3|T4|HbA1c|glycémie|cholestérol)\b/i,
      /laboratoire|labo\b/i,
      /valeur(?:s)?\s+de\s+référence/i,
      /blood\s+test|lab\s+results?|complete\s+blood\s+count/i,
    ],
  },
  {
    category: 'imagerie',
    patterns: [
      /compte[- ]rendu\s+(?:d'|de\s+)(?:échographie|IRM|scanner|radiographie|mammographie)/i,
      /\b(?:échographie|IRM|scanner|TDM|radiographie|mammographie|ostéodensitométrie|scintigraphie)\b/i,
      /\b(?:ultrasound|MRI|CT\s+scan|X[- ]ray|mammogram)\b/i,
      /image(?:rie)?\s+médicale/i,
    ],
  },
  {
    category: 'comptes_rendus',
    patterns: [
      /compte[- ]rendu\s+(?:de\s+)?(?:consultation|d'hospitalisation|opératoire|de\s+sortie)/i,
      /lettre\s+(?:de\s+)?(?:sortie|de\s+consultation|au\s+médecin)/i,
      /\b(?:consultation|hospitalisation|séjour|sortie)\b/i,
      /discharge\s+summary|consultation\s+report|referral\s+letter/i,
    ],
  },
  {
    category: 'ordonnances',
    patterns: [
      /\bordonnance\b/i,
      /\bprescription\b/i,
      /\bposologie\b/i,
      /(?:à prendre|prendre)\s+\d+\s+(?:comprimé|gélule|ampoule)/i,
      /(?:matin|soir|midi)\s*(?:et|\/)\s*(?:soir|midi)/i,
      /renouvellement(?:s)?\s+(?:autorisé|possible)/i,
      /non\s+substituable/i,
    ],
  },
  {
    category: 'vaccins',
    patterns: [
      /\b(?:vaccin(?:ation)?|carnet\s+de\s+santé|rappel\s+vaccinal)\b/i,
      /\b(?:DTP|ROR|BCG|hépatite|HPV|covid|grippe|pneumocoque|méningocoque)\b/i,
      /vaccine|vaccination|immunisation/i,
    ],
  },
  {
    category: 'antecedents',
    patterns: [
      /\bantécédent(?:s)?\b/i,
      /\bhistorique\s+médical\b/i,
      /\bhistoire\s+de\s+la\s+maladie\b/i,
      /\bterrain\s+(?:médical|personnel|familial)\b/i,
      /medical\s+history|past\s+medical\s+history/i,
    ],
  },
]

export function classifyDocument(text: string): DocumentCategory {
  if (!text || text.trim().length === 0) return 'autre'

  const scores: Record<DocumentCategory, number> = {
    analyses: 0, imagerie: 0, comptes_rendus: 0,
    ordonnances: 0, vaccins: 0, antecedents: 0, autre: 0,
  }

  for (const { category, patterns } of CATEGORY_SIGNALS) {
    for (const pattern of patterns) {
      if (pattern.test(text)) scores[category]++
    }
  }

  const topCategory = (Object.entries(scores) as [DocumentCategory, number][])
    .filter(([cat]) => cat !== 'autre')
    .sort(([, a], [, b]) => b - a)[0]

  return topCategory && topCategory[1] > 0 ? topCategory[0] : 'autre'
}

// ─────────────────────────────────────────────────────────────
// LAB VALUE EXTRACTOR
// Parses structured lab results from pseudonymised text.
// Called by documentStore.ts when document_type === 'analyses'.
// ─────────────────────────────────────────────────────────────
export type LabValue = {
  name: string
  value: number
  unit: string
  referenceRange: string | null
  flag: 'low' | 'high' | 'critical' | null
}

// Matches lines like:
//   Ferritine       12 µg/L      [20-200]   ↓
//   Hémoglobine : 13.5 g/dL   (12.0–16.0)
//   TSH             2.3 mUI/L
const LAB_LINE_PATTERN =
  /^([\wÀ-ÿ\s\-\/()]{2,40}?)\s*:?\s+([\d.,]+)\s*([\w\/µ%°]+)(?:\s+[\[(]([\d.,\s\-–]+)[\])])?(?:\s*([↓↑H|L|B]))?/gm

const FLAG_MAP: Record<string, LabValue['flag']> = {
  '↓': 'low', 'L': 'low', 'B': 'low',   // Bas
  '↑': 'high', 'H': 'high',              // Haut
}

export function extractLabValues(text: string): LabValue[] {
  const results: LabValue[] = []
  let match: RegExpExecArray | null

  LAB_LINE_PATTERN.lastIndex = 0

  while ((match = LAB_LINE_PATTERN.exec(text)) !== null) {
    const [, rawName, rawValue, unit, refRange, flagChar] = match
    const value = parseFloat(rawValue.replace(',', '.'))
    if (isNaN(value)) continue

    const name = rawName.trim()
    // Skip placeholder lines (pseudonymised values)
    if (name.startsWith('[') || name.length < 2) continue

    results.push({
      name,
      value,
      unit: unit.trim(),
      referenceRange: refRange ? refRange.trim() : null,
      flag: flagChar ? (FLAG_MAP[flagChar] ?? null) : null,
    })
  }

  return results
}

// ─────────────────────────────────────────────────────────────
// MEDICATION EXTRACTOR
// Parses structured medication list from pseudonymised text.
// Called by documentStore.ts when document_type === 'ordonnances'.
// ─────────────────────────────────────────────────────────────
export type Medication = {
  name: string
  dose: string | null
  frequency: string | null
  duration: string | null
}

// Matches lines like:
//   Lévothyrox 50 µg — 1 comprimé le matin à jeun — 3 mois
//   Ibuprofène 400 mg : 1 gélule 3x/jour pendant 5 jours
//   Metformine 500 mg, 2x/jour
const MED_LINE_PATTERN =
  /^([A-ZÀ-Ÿa-zà-ÿ][A-Za-zÀ-ÿ\s\-]{2,40}?)\s+([\d.,]+\s*(?:mg|µg|g|mL|UI|mcg|%)?)\s*(?:[:\-—,]\s*)?((?:\d+\s*(?:comprimé|gélule|ampoule|goutte|sachet|patch)[s]?(?:\s*\/?\s*(?:jour|matin|soir|midi|semaine))?)|(?:\d+\s*x\/?\s*(?:jour|day|semaine|week)))?(?:\s*(?:pendant|pour|during|for)\s*([\w\s]{2,20}))?/gm

export function extractMedications(text: string): Medication[] {
  const results: Medication[] = []
  let match: RegExpExecArray | null

  MED_LINE_PATTERN.lastIndex = 0

  while ((match = MED_LINE_PATTERN.exec(text)) !== null) {
    const [, rawName, dose, frequency, duration] = match
    const name = rawName.trim()
    if (name.startsWith('[') || name.length < 3) continue

    results.push({
      name,
      dose: dose ? dose.trim() : null,
      frequency: frequency ? frequency.trim() : null,
      duration: duration ? duration.trim() : null,
    })
  }

  return results
}
