/**
 * anoqi — Pathway session orchestration (DB-aware)
 *
 * Bridges the pure runtime (runtime.ts) to per-conversation state persisted on
 * the `conversations` row (migration 007). Everything here is best-effort and
 * non-fatal: if the pathway columns don't exist yet (migration not applied) or
 * any query fails, we log and fall back to open chat, so flipping
 * PATHWAY_RUNTIME_ENABLED can never break the chat path.
 *
 * NOTE (PR A scope): there is no phase auto-advance yet — currentPhase stays at
 * 1. Advancing through phases 2-8 arrives with the per-phase PRs.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

import type { GeminiEnv } from '../lib/gemini'
import type { Language, PathwayKey } from './types'
import { classifyPathway } from './classifier'
import { evaluatePhaseProgress } from './progress'
import { getPathway, getSymptomRegistry, loadedPathwayKeys } from './registry'
import {
  detectSymptoms, emptySession, renderPathwayPromptBlock, runPhase, type SessionState,
} from './runtime'

const PATHWAY_COLUMNS =
  'pathway_key, pathway_routed, pathway_phase, pathway_symptoms, pathway_phase_answers, pathway_tokens'

type TokenBucket = Record<string, { prompt: number; completion: number }>

async function loadSession(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<SessionState> {
  const { data, error } = await supabase
    .from('conversations')
    .select(PATHWAY_COLUMNS)
    .eq('id', conversationId)
    .single()

  // error here usually means the 007 columns are missing — throw so the
  // caller falls back to open chat rather than silently losing state.
  if (error || !data) throw error ?? new Error('pathway state row not found')

  const row = data as any
  const base = emptySession()
  return {
    pathwayKey:        (row.pathway_key as PathwayKey | null) ?? null,
    routed:            Boolean(row.pathway_routed),
    currentPhase:      typeof row.pathway_phase === 'number' ? row.pathway_phase : base.currentPhase,
    symptomsMentioned: Array.isArray(row.pathway_symptoms) ? (row.pathway_symptoms as string[]) : [],
    phaseAnswers:      (row.pathway_phase_answers as Record<string, boolean>) ?? {},
    phaseTokens:       (row.pathway_tokens as TokenBucket) ?? {},
  }
}

async function saveSession(
  supabase: SupabaseClient,
  conversationId: string,
  s: SessionState,
): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .update({
      pathway_key:           s.pathwayKey,
      pathway_routed:        s.routed,
      pathway_phase:         s.pathwayKey ? s.currentPhase : null,
      pathway_symptoms:      s.symptomsMentioned,
      pathway_phase_answers: s.phaseAnswers,
      pathway_tokens:        s.phaseTokens,
    })
    .eq('id', conversationId)
  if (error) throw error
}

export interface PathwayTurnResult {
  pathwayKey: PathwayKey | null
  phase:      number
  /** The [PATHWAY CONTEXT] system-prompt block, or undefined for open chat. */
  block:      string | undefined
}

/**
 * Run the pathway engine for one turn:
 *   1. Route once per session (classifier + onboarding-objective tiebreaker).
 *   2. Flag any declared symptoms the current message mentions.
 *   3. Build the prompt block for the active phase.
 * Returns null on any failure — caller treats that as open chat.
 */
export async function runPathwayTurn(opts: {
  supabase:           SupabaseClient
  env:                GeminiEnv
  conversationId:     string
  firstUserMessage:   string
  currentUserMessage: string
  journeyType:        string | undefined
  language:           Language
}): Promise<PathwayTurnResult | null> {
  const {
    supabase, env, conversationId, firstUserMessage, currentUserMessage, journeyType, language,
  } = opts

  try {
    const session = await loadSession(supabase, conversationId)

    // 1. Route once. V2 §2.1: classify the opening message; fall back to the
    //    onboarding objective (journeyType) as the default tiebreaker.
    if (!session.routed) {
      let key = await classifyPathway(firstUserMessage, env)
      if (!key && journeyType && loadedPathwayKeys().includes(journeyType as PathwayKey)) {
        key = journeyType as PathwayKey
      }
      session.pathwayKey = key
      session.routed = true
      if (key) session.currentPhase = 1
    }

    // 2. Cheap symptom flagging on the current message.
    if (session.pathwayKey) {
      const pathway = getPathway(session.pathwayKey, language)
      if (pathway) {
        for (const sym of detectSymptoms(currentUserMessage, pathway)) {
          if (!session.symptomsMentioned.includes(sym)) session.symptomsMentioned.push(sym)
        }
      }
    }

    await saveSession(supabase, conversationId, session)

    // 3. Open chat when nothing routed.
    if (!session.pathwayKey) {
      return { pathwayKey: null, phase: session.currentPhase, block: undefined }
    }

    const pathway = getPathway(session.pathwayKey, language)
    if (!pathway) {
      return { pathwayKey: session.pathwayKey, phase: session.currentPhase, block: undefined }
    }

    const phaseIdx = Math.min(Math.max(session.currentPhase, 1), pathway.phases.length) - 1
    const phase = pathway.phases[phaseIdx]
    if (!phase) {
      return { pathwayKey: session.pathwayKey, phase: session.currentPhase, block: undefined }
    }

    const out = runPhase(phase, pathway, getSymptomRegistry(), session)
    return {
      pathwayKey: session.pathwayKey,
      phase:      session.currentPhase,
      block:      renderPathwayPromptBlock(pathway, phase, out),
    }
  } catch (e) {
    console.error('[pathways] runPathwayTurn failed (non-fatal, open chat):', e)
    return null
  }
}

/**
 * Between-turn phase advancement (run in the BACKGROUND — the result only
 * affects the next turn, so it adds no user-visible latency). Evaluates the
 * exchange against the phase just played, marks answered questions, and
 * advances currentPhase when the phase is complete (model says so, or all
 * required questions are answered). Best-effort; never throws into the
 * response path.
 */
export async function advancePhase(opts: {
  supabase:         SupabaseClient
  env:              GeminiEnv
  conversationId:   string
  language:         Language
  userMessage:      string
  assistantMessage: string
}): Promise<void> {
  const { supabase, env, conversationId, language, userMessage, assistantMessage } = opts
  try {
    const session = await loadSession(supabase, conversationId)
    if (!session.pathwayKey) return

    const pathway = getPathway(session.pathwayKey, language)
    if (!pathway) return

    const idx = Math.min(Math.max(session.currentPhase, 1), pathway.phases.length) - 1
    const phase = pathway.phases[idx]
    if (!phase) return

    const progress = await evaluatePhaseProgress(pathway, phase, userMessage, assistantMessage, env)
    for (const id of progress.answered) session.phaseAnswers[id] = true

    const requiredIds = phase.questions.filter(q => q.required).map(q => q.id)
    const allRequiredAnswered =
      requiredIds.length > 0 && requiredIds.every(id => session.phaseAnswers[id])

    if ((progress.phaseComplete || allRequiredAnswered) && session.currentPhase < pathway.phases.length) {
      session.currentPhase += 1
    }

    await saveSession(supabase, conversationId, session)
  } catch (e) {
    console.error('[pathways] advancePhase failed (non-fatal):', e)
  }
}

/**
 * Accumulate completion tokens for a phase onto the conversation (Decision 6 /
 * Roadmap 2). Best-effort; never throws into the response path.
 *
 * Only completion tokens are captured today — surfacing promptTokenCount from
 * the Gemini usageMetadata is a small follow-up. Prompt stays 0 for now.
 */
export async function recordPhaseTokens(
  supabase: SupabaseClient,
  conversationId: string,
  phase: number,
  completionTokens: number | null,
): Promise<void> {
  if (completionTokens == null) return
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('pathway_tokens')
      .eq('id', conversationId)
      .single()
    if (error || !data) return

    const tokens = ((data as any).pathway_tokens as TokenBucket) ?? {}
    const key = String(phase)
    const prev = tokens[key] ?? { prompt: 0, completion: 0 }
    tokens[key] = { prompt: prev.prompt, completion: prev.completion + completionTokens }

    await supabase.from('conversations').update({ pathway_tokens: tokens }).eq('id', conversationId)
  } catch (e) {
    console.error('[pathways] recordPhaseTokens failed (non-fatal):', e)
  }
}
