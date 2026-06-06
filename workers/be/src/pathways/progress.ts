/**
 * anoqi — Phase progress evaluator
 *
 * One small Gemini call, run in the BACKGROUND after a pathway turn (the result
 * only affects the NEXT turn, so it's off the user-visible path). Given the
 * current phase's questions and the latest exchange, it returns which questions
 * the user has now answered and whether the phase is complete. session.ts turns
 * that into phaseAnswers updates + a phase advance.
 *
 * Degrades safely: any failure returns "nothing answered, not complete", so a
 * conversation never advances on bad data.
 */
import type { GeminiEnv } from '../lib/gemini'
import { buildVertexUrl, CHAT_MODEL } from '../lib/gemini'
import { getVertexAccessToken } from '../lib/vertexAuth'
import type { PathwayModule, PhaseDefinition } from './types'

export interface PhaseProgress {
  /** Question ids the user has now substantively answered (subset of the phase). */
  answered:      string[]
  /** True when the phase's purpose is met and it's natural to move on. */
  phaseComplete: boolean
}

const NONE: PhaseProgress = { answered: [], phaseComplete: false }

export async function evaluatePhaseProgress(
  pathway:          PathwayModule,
  phase:            PhaseDefinition,
  userMessage:      string,
  assistantMessage: string,
  env:              GeminiEnv,
): Promise<PhaseProgress> {
  if (!env.VERTEX_SA_JSON || !env.GCP_PROJECT_ID || !env.GCP_REGION) return NONE

  let accessToken: string
  try {
    accessToken = await getVertexAccessToken(env.VERTEX_SA_JSON)
  } catch (e) {
    console.error('[progress] token mint failed (non-fatal):', e)
    return NONE
  }

  const questionList = phase.questions.length
    ? phase.questions.map(q => `- ${q.id}${q.required ? ' (required)' : ''}: ${q.prompt}`).join('\n')
    : '(this phase has no fixed questions — it is a presentation/check-in phase)'

  const sys =
    `You evaluate progress through one phase of a structured women's-health conversation. ` +
    `Given the phase's questions and the latest exchange, return JSON only: ` +
    `{"answered": ["<question id>", ...], "phaseComplete": <boolean>}. ` +
    `"answered" lists ONLY ids from the list that the user has now substantively answered. ` +
    `"phaseComplete" is true when the phase's purpose is met and it's natural to move on — ` +
    `all required questions answered, or (for a presentation/check-in phase) its goal has been ` +
    `covered and the user seems ready. Be conservative: if unsure, return answered=[] and ` +
    `phaseComplete=false.\n\n` +
    `Phase ${phase.number} — ${phase.title}. Purpose: ${phase.purpose}.\nQuestions:\n${questionList}`

  try {
    const resp = await fetch(
      buildVertexUrl(env.GCP_PROJECT_ID, env.GCP_REGION, CHAT_MODEL, 'generateContent'),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: sys }] },
          contents: [{ role: 'user', parts: [{ text: `User: ${userMessage}\nAssistant: ${assistantMessage}` }] }],
          generationConfig: {
            maxOutputTokens:  256,
            temperature:      0,
            responseMimeType: 'application/json',
            thinkingConfig:   { thinkingBudget: 0 },
          },
        }),
      },
    )
    if (!resp.ok) {
      console.error('[progress] API error:', resp.status)
      return NONE
    }

    const data: any = await resp.json()
    const raw: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const parsed: any = JSON.parse(raw)

    const validIds = new Set(phase.questions.map(q => q.id))
    const answered = Array.isArray(parsed.answered)
      ? parsed.answered.filter((id: unknown): id is string => typeof id === 'string' && validIds.has(id))
      : []
    return { answered, phaseComplete: parsed.phaseComplete === true }
  } catch (e) {
    console.error('[progress] eval failed (non-fatal):', e)
    return NONE
  }
}
