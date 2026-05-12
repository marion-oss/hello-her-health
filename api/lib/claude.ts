/**
 * anoqi — Claude AI client
 *
 * Wraps the Anthropic Messages API for use in Supabase Edge Functions (Deno).
 * Uses native fetch — no npm package required.
 *
 * Exports:
 *   chat()            — conversational messages, runs policy check on output
 *   generateSummary() — structured JSON summary generation (higher-capability model)
 *
 * Required secret (set in Supabase Dashboard → Edge Functions → Secrets):
 *   ANTHROPIC_API_KEY=sk-ant-...
 *
 * Models used:
 *   claude-haiku-4-5-20251001  — chat (fast + cost-efficient)
 *   claude-sonnet-4-6          — summaries (higher quality structured output)
 */

import { checkPolicy, type PolicyResult } from '../policy/policyChecker.ts'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

// claude-haiku-4-5-20251001 is the right model for real-time chat:
// sub-second latency, cheap, capable enough for conversational health guidance.
// Summaries use claude-sonnet-4-6 for higher-quality structured JSON output.
const CHAT_MODEL    = 'claude-haiku-4-5-20251001'
const SUMMARY_MODEL = 'claude-sonnet-4-6'

// ─────────────────────────────────────────────────────────────
// SYSTEM PROMPT — anoqi's clinical persona and guardrails
// Injected as the system turn on every chat request.
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

// ─────────────────────────────────────────────────────────────
// JOURNEY CONTEXTS — appended to the system prompt per journey type
// Keeps routing logic close to the API layer, not in the DB
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
// Sends a conversation to Claude, runs policy check on output.
// Called by api/functions/chat.ts for every user message.
// ─────────────────────────────────────────────────────────────
export async function chat(
  messages: ChatMessage[],
  journeyType?: string
): Promise<ChatResult> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')

  if (!apiKey) {
    console.error('[claude] ANTHROPIC_API_KEY secret not set in Edge Functions')
    return apiError(CHAT_MODEL)
  }

  // Build system prompt with optional journey context appended
  const journeyContext = JOURNEY_CONTEXTS[journeyType ?? 'free_chat'] ?? ''
  const systemPrompt   = journeyContext
    ? `${BASE_SYSTEM_PROMPT}\n\n${journeyContext}`
    : BASE_SYSTEM_PROMPT

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':        apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model:      CHAT_MODEL,
        max_tokens: 1024,
        system:     systemPrompt,
        messages,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('[claude] API error:', response.status, errorBody)
      return apiError(CHAT_MODEL)
    }

    const data = await response.json()
    const rawContent: string  = data.content?.[0]?.text ?? ''
    const tokensUsed: number | null = data.usage?.output_tokens ?? null

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
    console.error('[claude] Unexpected error in chat():', e)
    return apiError(CHAT_MODEL)
  }
}

// ─────────────────────────────────────────────────────────────
// GENERATE SUMMARY
// Higher-capability model, low temperature, JSON output.
// Called by api/functions/summaries.ts.
// Returns the raw text response — parsing is handled by summaryParser.ts.
// ─────────────────────────────────────────────────────────────
export async function generateSummary(prompt: string): Promise<string | null> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')

  if (!apiKey) {
    console.error('[claude] ANTHROPIC_API_KEY secret not set in Edge Functions')
    return null
  }

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':        apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model:      SUMMARY_MODEL,
        max_tokens: 2000,
        // temperature is not supported in all API versions via this parameter;
        // we instruct low-variance output via the prompt instead (see summaries.ts)
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('[claude] Summary API error:', response.status, errorBody)
      return null
    }

    const data = await response.json()
    return data.content?.[0]?.text ?? null

  } catch (e) {
    console.error('[claude] Unexpected error in generateSummary():', e)
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
