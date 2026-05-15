/**
 * anoqi — Gemini AI client (Workers port)
 *
 * Wraps Google's Gemini API (AI Studio / Generative Language API) for use
 * in Cloudflare Workers. Uses native fetch — no npm package required.
 *
 * Differs from api/lib/gemini.ts in one place: the API key is passed in
 * via the `env` argument rather than read from `Deno.env`. Workers don't
 * have a `Deno` global; env arrives via the Hono context (`c.env`) and
 * gets threaded down to the lib functions explicitly.
 *
 * Exports:
 *   chat()            — conversational messages, runs policy check on output
 *   generateSummary() — structured JSON summary generation (higher-capability model)
 *
 * Required secret (set via `wrangler secret put GEMINI_API_KEY`):
 *   GEMINI_API_KEY=AIza...
 *   Issued from: https://aistudio.google.com/apikey
 *
 * Models used:
 *   gemini-2.5-flash  — chat (fast + cost-efficient)
 *   gemini-2.5-pro    — summaries (higher quality structured output)
 */

import { checkPolicy, type PolicyResult } from '../policy/policyChecker'

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

const CHAT_MODEL    = 'gemini-2.5-flash'
const SUMMARY_MODEL = 'gemini-2.5-pro'

// ─────────────────────────────────────────────────────────────
// SYSTEM PROMPT — anoqi's clinical persona and guardrails
// ─────────────────────────────────────────────────────────────
const BASE_SYSTEM_PROMPT = `Tu es Anoqi, une assistante en santé féminine bienveillante et experte. Tu aides les femmes à comprendre leurs symptômes, à se préparer pour leurs consultations médicales, et à naviguer dans le système de santé.

Règles absolues :
- Tu ne poses JAMAIS de diagnostic
- Tu ne prescris JAMAIS de médicaments ni de traitements
- Tu ne modifies JAMAIS un traitement en cours
- En cas d'urgence médicale (douleur thoracique intense, difficultés respiratoires, saignements abondants non expliqués), tu invites immédiatement l'utilisatrice à appeler le 15 (SAMU) ou à se rendre aux urgences

Ton rôle :
- Aider à comprendre et décrire les symptômes de façon précise et non alarmante
- Préparer les questions à poser au médecin
- Expliquer les examens et les traitements de façon accessible
- Soutenir émotionnellement avec empathie et sans jugement

Langue : Réponds dans la langue de l'utilisatrice. Par défaut, réponds en français.`

const JOURNEY_CONTEXTS: Record<string, string> = {
  symptoms: "Contexte : L'utilisatrice cherche à comprendre ses symptômes gynécologiques. Aide-la à les décrire précisément (durée, fréquence, intensité, déclencheurs) et à préparer sa consultation.",
  contraception: "Contexte : L'utilisatrice a des questions sur la contraception. Fournis des informations factuelles équilibrées sans recommander une méthode spécifique — c'est le rôle du médecin.",
  menopause: "Contexte : L'utilisatrice traverse la ménopause ou la périménopause. Réponds avec empathie, normalise les symptômes courants, et aide-la à préparer ses questions pour son gynécologue.",
  fertility: "Contexte : L'utilisatrice a des questions sur la fertilité. Réponds avec sensibilité. Pour toute décision médicale, redirige systématiquement vers un spécialiste en fertilité.",
  appointment_prep: "Contexte : L'utilisatrice prépare une consultation médicale. Aide-la à formuler ses symptômes clairement et à prioriser ses questions.",
  free_chat: "",
}

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatResult {
  content: string
  error?: 'api_error'
  policyResult: PolicyResult
  tokensUsed: number | null
  modelUsed: string
}

/** Just the slice of `env` this module needs. Handlers pass `c.env` directly. */
export interface GeminiEnv {
  GEMINI_API_KEY: string
}

// ─────────────────────────────────────────────────────────────
// CHAT
// ─────────────────────────────────────────────────────────────
export async function chat(
  messages: ChatMessage[],
  journeyType: string | undefined,
  systemAddendum: string | undefined,
  env: GeminiEnv,
): Promise<ChatResult> {
  const apiKey = env.GEMINI_API_KEY

  if (!apiKey) {
    console.error('[gemini] GEMINI_API_KEY secret not set')
    return apiError(CHAT_MODEL)
  }

  const journeyContext = JOURNEY_CONTEXTS[journeyType ?? 'free_chat'] ?? ''
  const baseWithJourney = journeyContext
    ? `${BASE_SYSTEM_PROMPT}\n\n${journeyContext}`
    : BASE_SYSTEM_PROMPT
  const systemPrompt = systemAddendum
    ? `${baseWithJourney}\n\n${systemAddendum}`
    : baseWithJourney

  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/${CHAT_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type':   'application/json',
          'x-goog-api-key':  apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { maxOutputTokens: 1024 },
        }),
      },
    )

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('[gemini] API error:', response.status, errorBody)
      return apiError(CHAT_MODEL)
    }

    const data: any = await response.json()
    const rawContent: string  = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const tokensUsed: number | null = data.usageMetadata?.candidatesTokenCount ?? null

    const policyResult = checkPolicy(rawContent)

    return {
      content:      policyResult.safe
                      ? rawContent
                      : (policyResult.sanitisedContent ?? ''),
      policyResult,
      tokensUsed,
      modelUsed: CHAT_MODEL,
    }

  } catch (e) {
    console.error('[gemini] Unexpected error in chat():', e)
    return apiError(CHAT_MODEL)
  }
}

// ─────────────────────────────────────────────────────────────
// GENERATE SUMMARY
// ─────────────────────────────────────────────────────────────
export async function generateSummary(
  prompt: string,
  env: GeminiEnv,
): Promise<string | null> {
  const apiKey = env.GEMINI_API_KEY

  if (!apiKey) {
    console.error('[gemini] GEMINI_API_KEY secret not set')
    return null
  }

  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/${SUMMARY_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type':   'application/json',
          'x-goog-api-key':  apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens:  2000,
            responseMimeType: 'application/json',
          },
        }),
      },
    )

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('[gemini] Summary API error:', response.status, errorBody)
      return null
    }

    const data: any = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null

  } catch (e) {
    console.error('[gemini] Unexpected error in generateSummary():', e)
    return null
  }
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function apiError(modelUsed: string): ChatResult {
  return {
    content:      '',
    error:        'api_error',
    policyResult: { safe: false, flags: [], sanitisedContent: null },
    tokensUsed:   null,
    modelUsed,
  }
}
