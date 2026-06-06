/**
 * anoqi — Pathway architecture types
 *
 * The declarative shape of a clinical pathway. See PATHWAYS.md for the design.
 * Engineering owns these TYPES; the clinical team owns the STRINGS that fill
 * them. A clinical edit (e.g. a new myth correction) is a one-line change in a
 * data file (`contraception.fr.ts`), not a code change here.
 *
 * PR A scope: the structure + Phase 1 of contraception. Phases 2-8 and the
 * reference-data fields (methodTable, ukmecGates, mythCorrections, …) are
 * declared here but populated in their own per-phase PRs, so each is
 * independently reviewable by the clinical advisory board.
 */

export type PathwayKey = 'contraception' | 'endometriosis' | 'menopause' | 'pmos'
export type Language   = 'fr' | 'en'

/** e.g. 'period_pain', 'irregular_bleeding', 'mood_low'. Free-form string so
 *  new pathways can declare new symptoms without a type change. The union of
 *  every pathway's declaredSymptoms forms the SymptomRegistry. */
export type SymptomKey = string

export interface PhaseQuestion {
  /** Stable id, e.g. 'goals.start_switch_review'. */
  id:                string
  /** The actual question the AI asks, in the module's language. */
  prompt:            string
  required:          boolean
  /** Which symptoms a positive answer flags onto the session. */
  symptomsRecorded?: SymptomKey[]
  /** Free-text note for documentation; the PR A engine does NOT interpret it. */
  branchLogic?:      string
  /** Free-text validation note, e.g. 'BMI > 35 with CV risk = UKMEC 3'. */
  validation?:       string
}

/** Reserved for later phases (UKMEC gate evaluation, method-table lookups).
 *  Documented now so the structure is stable; not interpreted by PR A. */
export interface EnrichmentHook {
  id:          string
  description: string
}

export interface PhaseDefinition {
  number:            1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
  title:             string
  purpose:           string
  /** Empty for stubbed phases (purpose only) until their phase PR lands. */
  questions:         PhaseQuestion[]
  enrichmentHooks?:  EnrichmentHook[]
}

/** What THIS pathway says when a shared symptom hints at another pathway.
 *  Woven into the relevant phase by the runtime. Written in second person. */
export interface DifferentialMention {
  text:     string
  /** Which other pathway this mention bridges to. For logging + audit. */
  otherKey: PathwayKey
}

/** V2 §6.1 Phase 6 — a single myth correction. */
export interface MythCorrection {
  /** What the user says or implies that triggers this correction. */
  trigger:     string
  /** The warm, sourced correction the AI gives. */
  correction:  string
  /** Citations backing the correction. */
  sources?:    string[]
}

/** V2 §6.1 Phase 7 — template for the first-person physician-handoff summary. */
export interface ConsultationPrepTemplate {
  /** Framing instruction (e.g. "write it as if she wrote it, first person"). */
  voice:    string
  /** Ordered section headers, written first-person. */
  sections: string[]
}

// ── Optional pathway reference data ──────────────────────────────────────
// Declared here so the structure is stable; each is populated by the phase PR
// that needs it (method table with Phase 4, UKMEC gates with Phase 2, etc.).

export interface MethodEntry {
  name:             string
  type:             string
  duration:         string
  keyPoints:        string
  clinicianNotes?:  string
}

/** UKMEC category per contraceptive method for a given condition. */
export interface UkmecGate {
  condition:   string
  /** method key → UKMEC category (1 = no restriction … 4 = unacceptable risk). */
  categories:  Record<string, 1 | 2 | 3 | 4>
  action?:     string
}

/** V2 §6.1 Phase 5 — a side effect, what to proactively say, and the
 *  escalation signal. The most important retention intervention: users who
 *  expect a side effect continue; users surprised by one discontinue. */
export interface SideEffectEntry {
  effect:           string
  whatToSay:        string
  /** The signal that turns a normal side effect into a referral. Omitted
   *  when there's no escalation (e.g. weight, fertility return). */
  whenToEscalate?:  string
}

export interface DiagnosticCriteria {
  name:     string
  criteria: string[]
}

export interface HrtOption {
  name:  string
  notes: string
}

export interface PathwayModule {
  key:               PathwayKey
  language:          Language
  /** e.g. 'v1-2026-06-06', bumped on clinical review. */
  version:           string

  /** Keywords / phrases the routing classifier looks for. */
  entrySignals:      string[]

  /** Symptoms this pathway addresses. The intersection between any two
   *  pathways' lists is where differential awareness activates. */
  declaredSymptoms:  SymptomKey[]

  /** The 8-phase architecture from V2 §6.1. Phase ordering is array order. */
  phases:            PhaseDefinition[]

  // Pathway-specific reference data. Optional — only some pathways have these.
  methodTable?:         MethodEntry[]        // contraception (Phase 4 PR)
  ukmecGates?:          UkmecGate[]          // contraception (Phase 2 PR)
  sideEffectLiteracy?:  SideEffectEntry[]    // contraception (Phase 5 PR)
  hrtOptions?:          HrtOption[]          // menopause (future)
  diagnosticCriteria?:  DiagnosticCriteria   // endo, pmos (future)

  /** V2 §6.1 Phase 6 — mandatory myth corrections (Phase 6 PR). */
  mythCorrections:   MythCorrection[]

  /** Cross-pathway awareness, keyed by SymptomKey. Empty when no other
   *  pathway declares an overlapping symptom; populated retroactively when
   *  one does (see PATHWAYS.md PR J+). */
  differentialAwareness: Record<SymptomKey, DifferentialMention>

  /** V2 §6.1 Phase 7. */
  consultationPrepTemplate: ConsultationPrepTemplate
}

/** Derived (never authored): SymptomKey → the pathways that declare it. */
export type SymptomRegistry = Record<SymptomKey, PathwayKey[]>
