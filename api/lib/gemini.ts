/**
 * anoqi — Gemini AI client
 *
 * Wraps Google's Gemini API (AI Studio / Generative Language API) for use
 * in Supabase Edge Functions (Deno). Uses native fetch — no npm package required.
 *
 * Exports:
 *   chat()            — conversational messages, runs policy check on output
 *   generateSummary() — structured JSON summary generation (higher-capability model)
 *
 * Required secret (set in Supabase Dashboard → Edge Functions → Secrets):
 *   GEMINI_API_KEY=AIza...
 *   Issued from: https://aistudio.google.com/apikey
 *
 * Models used:
 *   gemini-2.5-flash  — chat (fast + cost-efficient)
 *   gemini-2.5-pro    — summaries (higher quality structured output)
 */

import { checkPolicy, type PolicyResult } from '../policy/policyChecker.ts'

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

// gemini-2.5-flash is the right model for real-time chat: sub-second latency,
// cheap, capable enough for conversational health guidance.
// Summaries use gemini-2.5-pro for higher-quality structured JSON output.
const CHAT_MODEL    = 'gemini-2.5-flash'
const SUMMARY_MODEL = 'gemini-2.5-pro'

// ─────────────────────────────────────────────────────────────
// SYSTEM PROMPT — anoqi's clinical persona and guardrails
// Injected as systemInstruction on every chat request.
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

Langue : Réponds dans la langue de l'utilisatrice. Par défaut, réponds en français.

Mise en forme :
- N'utilise jamais d'émojis.
- N'utilise jamais de tiret cadratin (—) ni de tiret demi-cadratin (–). Utilise plutôt une virgule, un deux-points, ou des parenthèses.`

// ─────────────────────────────────────────────────────────────
// JOURNEY CONTEXTS — appended to the system prompt per journey type
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// CHAT
// Sends a conversation to Gemini, runs policy check on output.
// Called by api/functions/chat.ts for every user message.
//
// `systemAddendum` is appended to the system prompt verbatim. chat.ts uses
// it to inject the rendered retrieval snippets (see api/lib/retrieval.ts
// → renderSnippetsForPrompt). Kept as an opaque string so retrieval
// concerns stay out of this file.
// ─────────────────────────────────────────────────────────────
export async function chat(
  messages: ChatMessage[],
  journeyType?: string,
  systemAddendum?: string,
): Promise<ChatResult> {
  const apiKey = Deno.env.get('GEMINI_API_KEY')

  if (!apiKey) {
    console.error('[gemini] GEMINI_API_KEY secret not set in Edge Functions')
    return apiError(CHAT_MODEL)
  }

  const journeyContext = JOURNEY_CONTEXTS[journeyType ?? 'free_chat'] ?? ''
  const baseWithJourney = journeyContext
    ? `${BASE_SYSTEM_PROMPT}\n\n${journeyContext}`
    : BASE_SYSTEM_PROMPT
  const systemPrompt = systemAddendum
    ? `${baseWithJourney}\n\n${systemAddendum}`
    : baseWithJourney

  // Gemini uses 'model' for assistant turns and a parts[] wrapper around text.
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
          'Content-Type':    'application/json',
          'x-goog-api-key':   apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            maxOutputTokens: 1024,
          },
        }),
      }
    )

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('[gemini] API error:', response.status, errorBody)
      return apiError(CHAT_MODEL)
    }

    const data = await response.json()
    const rawContent: string  = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const tokensUsed: number | null = data.usageMetadata?.candidatesTokenCount ?? null

    // Every AI response is checked by the deterministic policy layer
    // before being returned. The policy layer can block, modify, or pass through.
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
// Higher-capability model with JSON response mode enforced.
// Called by api/functions/summaries.ts.
// Returns the raw text response — parsing is handled by summaryParser.ts.
// ─────────────────────────────────────────────────────────────
export async function generateSummary(prompt: string): Promise<string | null> {
  const apiKey = Deno.env.get('GEMINI_API_KEY')

  if (!apiKey) {
    console.error('[gemini] GEMINI_API_KEY secret not set in Edge Functions')
    return null
  }

  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/${SUMMARY_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type':    'application/json',
          'x-goog-api-key':   apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens:  2000,
            // Enforce strict JSON output — no markdown wrapper, no preamble.
            responseMimeType: 'application/json',
          },
        }),
      }
    )

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('[gemini] Summary API error:', response.status, errorBody)
      return null
    }

    const data = await response.json()
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
