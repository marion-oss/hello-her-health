/**
 * anoqi — Pathway runtime (pure engine)
 *
 * No I/O here. Given the active pathway, the derived registry, and the
 * per-conversation session state, it decides what the model should be told
 * this turn: which phase questions remain, and which differential-awareness
 * mentions to weave in. The DB-aware orchestration lives in session.ts.
 *
 * Today, with only contraception loaded, the differential loop produces
 * nothing (no symptom is declared by two pathways). When endometriosis lands,
 * the same code starts surfacing differential text with zero engine changes.
 */
import type {
  Language, PathwayModule, PhaseDefinition, PhaseQuestion, SymptomKey, SymptomRegistry,
} from './types'

/** Per-conversation state. Persisted on the conversations row (see
 *  007_pathway_session_state.sql). Reset per conversation — cross-session
 *  persistence is a confirmed roadmap item, not in this PR (PATHWAYS.md). */
export interface SessionState {
  pathwayKey:        PathwayModule['key'] | null
  /** True once routing has run, even when it routed to no pathway (open chat).
   *  Stops us re-classifying every turn. */
  routed:            boolean
  currentPhase:      number
  symptomsMentioned: SymptomKey[]
  /** questionId → true once covered. Empty in PR A (no auto-advance yet). */
  phaseAnswers:      Record<string, boolean>
  /** phaseNumber → token usage, for future optimisation (Decision 6). */
  phaseTokens:       Record<string, { prompt: number; completion: number }>
}

export interface PhaseOutput {
  questionsToAsk:       PhaseQuestion[]
  differentialMentions: string[]
}

/** Readable label + detection signals per declared symptom, both languages.
 *  Lightweight keyword matching only — the routing classifier (an LLM call)
 *  handles the harder intent work; this just flags symptom mentions cheaply on
 *  every turn. First entry doubles as the human label used in prompts. */
const SYMPTOM_SIGNALS: Record<SymptomKey, Record<Language, string[]>> = {
  period_pain:        { fr: ['règles douloureuses', 'douleurs de règles', 'douleur pendant les règles', 'dysménorrhée'], en: ['painful periods', 'period pain', 'cramps', 'dysmenorrhea'] },
  acne:               { fr: ['acné', 'boutons'], en: ['acne', 'breakouts', 'spots'] },
  mood_low:           { fr: ['humeur', 'déprime', 'moral', 'anxiété', 'irritable'], en: ['mood', 'low mood', 'depressed', 'anxiety', 'irritable'] },
  irregular_bleeding: { fr: ['saignements irréguliers', 'spotting', 'règles irrégulières', 'pertes de sang'], en: ['irregular bleeding', 'spotting', 'irregular periods', 'breakthrough bleeding'] },
  weight_gain:        { fr: ['prise de poids', 'grossir', 'poids'], en: ['weight gain', 'putting on weight', 'gaining weight'] },
}

function symptomLabel(sym: SymptomKey, language: Language): string {
  return SYMPTOM_SIGNALS[sym]?.[language]?.[0] ?? sym
}

/** Friendly pathway name for the prompt block (not the phase title). */
const PATHWAY_DISPLAY_NAME: Record<PathwayModule['key'], Record<Language, string>> = {
  contraception: { fr: 'Contraception', en: 'Contraception' },
  endometriosis: { fr: 'Endométriose',  en: 'Endometriosis' },
  menopause:     { fr: 'Ménopause',     en: 'Menopause' },
  pmos:          { fr: 'SOPK',          en: 'PCOS' },
}

/**
 * Cheap keyword scan over a user message. Returns the declared symptoms the
 * message appears to mention. Case-insensitive substring match — deliberately
 * simple; false positives are harmless (they only add a "watch for this"
 * hint to the prompt), and the LLM stays the arbiter of meaning.
 */
export function detectSymptoms(
  message:  string,
  pathway:  PathwayModule,
): SymptomKey[] {
  const haystack = message.toLowerCase()
  const found: SymptomKey[] = []
  for (const sym of pathway.declaredSymptoms) {
    const signals = SYMPTOM_SIGNALS[sym]?.[pathway.language] ?? []
    if (signals.some(s => haystack.includes(s.toLowerCase()))) found.push(sym)
  }
  return found
}

/**
 * Decide what to tell the model this turn. See PATHWAYS.md primitive #3.
 *   1. Which of this phase's questions are still unanswered.
 *   2. For each mentioned symptom ALSO declared by another pathway, the
 *      primary pathway's differentialAwareness text.
 */
export function runPhase(
  phase:    PhaseDefinition,
  pathway:  PathwayModule,
  registry: SymptomRegistry,
  session:  SessionState,
): PhaseOutput {
  const questionsToAsk = phase.questions.filter(q => !session.phaseAnswers[q.id])

  const differentialMentions: string[] = []
  for (const sym of session.symptomsMentioned) {
    const declaringPathways = registry[sym] ?? []
    const hasOther = declaringPathways.some(k => k !== pathway.key)
    if (!hasOther) continue
    const awareness = pathway.differentialAwareness[sym]
    if (awareness) differentialMentions.push(awareness.text)
  }

  return { questionsToAsk, differentialMentions }
}

/**
 * Render the [PATHWAY CONTEXT] system-prompt block injected for this turn.
 * Authored in the pathway's language so it reads naturally to the model. The
 * base persona + hard constraints (gemini.ts / policyChecker.ts) are unchanged
 * and still precede this block.
 */
export function renderPathwayPromptBlock(
  pathway: PathwayModule,
  phase:   PhaseDefinition,
  out:     PhaseOutput,
): string {
  const lang = pathway.language
  const pathwayName = PATHWAY_DISPLAY_NAME[pathway.key][lang]
  const watch = pathway.declaredSymptoms.map(s => symptomLabel(s, lang)).join(', ')
  const questionLines = out.questionsToAsk.map(q => `- ${q.prompt}`).join('\n')

  if (lang === 'fr') {
    const parts = [
      `[CONTEXTE PARCOURS]`,
      `Tu accompagnes l'utilisatrice dans le parcours « ${pathwayName} » — phase ${phase.number} : ${phase.title}.`,
      `Objectif de cette phase : ${phase.purpose}.`,
      questionLines
        ? `Aborde les points suivants, un seul à la fois, de façon naturelle et chaleureuse (n'enchaîne pas les questions) :\n${questionLines}`
        : `Poursuis naturellement la conversation pour cette phase.`,
      `Reste attentive si l'utilisatrice évoque : ${watch}.`,
      out.differentialMentions.length ? out.differentialMentions.join('\n') : null,
    ].filter(Boolean)
    return parts.join('\n')
  }

  const parts = [
    `[PATHWAY CONTEXT]`,
    `You are guiding the user through the "${pathwayName}" pathway — phase ${phase.number}: ${phase.title}.`,
    `The purpose of this phase is to ${phase.purpose}.`,
    questionLines
      ? `Cover the following, ONE at a time, naturally and warmly (don't fire questions in a row):\n${questionLines}`
      : `Continue the conversation naturally for this phase.`,
    `Stay attentive if the user mentions: ${watch}.`,
    out.differentialMentions.length ? out.differentialMentions.join('\n') : null,
  ].filter(Boolean)
  return parts.join('\n')
}

/** A fresh, unrouted session. */
export function emptySession(): SessionState {
  return {
    pathwayKey:        null,
    routed:            false,
    currentPhase:      1,
    symptomsMentioned: [],
    phaseAnswers:      {},
    phaseTokens:       {},
  }
}
