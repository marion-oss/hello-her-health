/**
 * anoqi — Gemini AI client (Workers port, Vertex AI)
 *
 * Wraps Google's Gemini API via the Vertex AI prediction endpoint
 * (aiplatform.googleapis.com), authenticated with a service-account OAuth
 * token minted by ../lib/vertexAuth. Uses native fetch — no npm package
 * required.
 *
 * Differs from api/lib/gemini.ts in one place: env is passed in via the
 * `env` argument rather than read from `Deno.env`. Workers don't have a
 * `Deno` global; env arrives via the Hono context (`c.env`) and gets
 * threaded down to the lib functions explicitly. The Supabase Edge twin
 * still calls AI Studio; migrate it in a follow-up PR.
 *
 * Exports:
 *   chat()            — conversational messages, runs policy check on output
 *   generateSummary() — structured JSON summary generation (higher-capability model)
 *
 * Required env (set via Cloudflare dashboard or `wrangler secret put`):
 *   VERTEX_SA_JSON     — full service-account JSON for anoqi-vertex-worker
 *                        (project reverberant-kit-491312-e8). Stored as a
 *                        secret. Granted roles/aiplatform.user on the project.
 *   GCP_PROJECT_ID     — `reverberant-kit-491312-e8` (plaintext var)
 *   GCP_REGION         — `global` (plaintext var). Use a regional value
 *                        like `europe-west4` if you need EU data residency.
 *
 * Models used:
 *   gemini-3.5-flash  — chat (fast + cost-efficient)
 *   gemini-3.5-pro    — summaries (higher quality structured output)
 */

import { checkPolicy, type PolicyResult } from '../policy/policyChecker'
import { getVertexAccessToken } from './vertexAuth'

export const CHAT_MODEL    = 'gemini-3.5-flash'
const SUMMARY_MODEL = 'gemini-3.5-pro'

export function buildVertexUrl(
  projectId: string,
  region:    string,
  model:     string,
  action:    'generateContent' | 'streamGenerateContent',
  query?:    string,
): string {
  // The 'global' endpoint uses a host without a region prefix; regional
  // endpoints use `{region}-aiplatform.googleapis.com`. See
  // https://cloud.google.com/vertex-ai/generative-ai/docs/learn/locations
  const host = region === 'global'
    ? 'aiplatform.googleapis.com'
    : `${region}-aiplatform.googleapis.com`
  const url = `https://${host}/v1/projects/${projectId}/locations/${region}/publishers/google/models/${model}:${action}`
  return query ? `${url}?${query}` : url
}

// Retry transient 429s (and 5xx) with exponential backoff + jitter. Vertex
// AI's quotas are generous on a billing-enabled project but TPM bursts can
// still cause brief 429s, especially with parallel streams.
async function fetchWithBackoff(
  url:     string,
  init:    RequestInit,
  maxAttempts = 3,
): Promise<Response> {
  let lastResp: Response | null = null
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const resp = await fetch(url, init)
    if (resp.status !== 429 && resp.status < 500) return resp
    lastResp = resp
    if (attempt === maxAttempts) break
    // 300ms, 900ms, 2700ms with ±30% jitter
    const baseMs = 300 * Math.pow(3, attempt - 1)
    const jitter = baseMs * (0.7 + Math.random() * 0.6)
    await new Promise(r => setTimeout(r, jitter))
  }
  return lastResp!
}

// ─────────────────────────────────────────────────────────────
// SYSTEM PROMPT — anoqi's clinical persona and guardrails
// Bilingual. The handler forwards the user's language; we use it to pick
// the right base prompt + journey context. Keep both branches in sync when
// editing — the FR is the canonical source, EN mirrors it.
// ─────────────────────────────────────────────────────────────
export type Language = 'fr' | 'en'

const BASE_SYSTEM_PROMPTS: Record<Language, string> = {
  fr: `Tu es Anoqi, une assistante en santé féminine bienveillante et experte. Tu aides les femmes à comprendre leurs symptômes, à se préparer pour leurs consultations médicales, et à naviguer dans le système de santé.

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

Langue : Par défaut, réponds en français. Si l'utilisatrice écrit en anglais (ou dans une autre langue), réponds dans la même langue qu'elle.

Mise en forme :
- N'utilise jamais d'émojis.
- N'utilise jamais de tiret cadratin (—) ni de tiret demi-cadratin (–). Utilise plutôt une virgule, un deux-points, ou des parenthèses.`,

  en: `You are Anoqi, a warm and knowledgeable women's health assistant. You help women understand their symptoms, prepare for medical consultations, and navigate the healthcare system.

Absolute rules:
- You NEVER make a diagnosis
- You NEVER prescribe medications or treatments
- You NEVER modify an ongoing treatment
- In a medical emergency (severe chest pain, difficulty breathing, heavy unexplained bleeding), you immediately direct the user to call emergency services (999 in the UK, 911 in the US, 112 in the EU) or go to the emergency room

Your role:
- Help describe symptoms precisely without alarming language
- Prepare questions to ask the doctor
- Explain tests and treatments in accessible language
- Offer emotional support with empathy and without judgment

Language: By default, reply in English. If the user writes in French (or another language), reply in the same language they used.

Formatting:
- Never use emoji.
- Never use em dashes (—) or en dashes (–). Use a comma, colon, or parentheses instead.`,
}

const JOURNEY_CONTEXTS: Record<Language, Record<string, string>> = {
  fr: {
    symptoms:         "Contexte : L'utilisatrice cherche à comprendre ses symptômes gynécologiques. Aide-la à les décrire précisément (durée, fréquence, intensité, déclencheurs) et à préparer sa consultation.",
    contraception:    "Contexte : L'utilisatrice a des questions sur la contraception. Fournis des informations factuelles équilibrées sans recommander une méthode spécifique — c'est le rôle du médecin.",
    menopause:        "Contexte : L'utilisatrice traverse la ménopause ou la périménopause. Réponds avec empathie, normalise les symptômes courants, et aide-la à préparer ses questions pour son gynécologue.",
    fertility:        "Contexte : L'utilisatrice a des questions sur la fertilité. Réponds avec sensibilité. Pour toute décision médicale, redirige systématiquement vers un spécialiste en fertilité.",
    appointment_prep: "Contexte : L'utilisatrice prépare une consultation médicale. Aide-la à formuler ses symptômes clairement et à prioriser ses questions.",
    free_chat:        "",
  },
  en: {
    symptoms:         "Context: The user is trying to understand her gynaecological symptoms. Help her describe them precisely (duration, frequency, intensity, triggers) and prepare for her consultation.",
    contraception:    "Context: The user has questions about contraception. Provide balanced, factual information without recommending a specific method — that's the doctor's role.",
    menopause:        "Context: The user is going through menopause or perimenopause. Respond with empathy, normalise common symptoms, and help her prepare questions for her gynaecologist.",
    fertility:        "Context: The user has questions about fertility. Respond with sensitivity. For any medical decision, consistently redirect to a fertility specialist.",
    appointment_prep: "Context: The user is preparing for a medical consultation. Help her formulate her symptoms clearly and prioritise her questions.",
    free_chat:        "",
  },
}

/**
 * Assemble the system prompt from its layers. Order matters and mirrors
 * PATHWAYS.md: base persona → journey context → pathway context → user docs →
 * RAG snippets. Pathway context precedes user docs/RAG so the model anchors on
 * the active phase; user docs precede RAG so it anchors on the user's own data.
 * Shared by chat() and chatStream() to prevent the two from drifting.
 */
function buildSystemPrompt(
  language:       Language,
  journeyType:    string | undefined,
  pathwayBlock:   string | undefined,
  userDocsBlock:  string | undefined,
  systemAddendum: string | undefined,
): string {
  const base = BASE_SYSTEM_PROMPTS[language]
  const journeyContext = JOURNEY_CONTEXTS[language][journeyType ?? 'free_chat'] ?? ''
  const layers: Array<string | undefined> = [
    journeyContext ? `${base}\n\n${journeyContext}` : base,
    pathwayBlock,
    userDocsBlock,
    systemAddendum,
  ]
  return layers.filter((s): s is string => Boolean(s)).join('\n\n')
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
  VERTEX_SA_JSON: string
  GCP_PROJECT_ID: string
  GCP_REGION:     string
}

// ─────────────────────────────────────────────────────────────
// CHAT
// ─────────────────────────────────────────────────────────────
export async function chat(
  messages: ChatMessage[],
  journeyType: string | undefined,
  systemAddendum: string | undefined,
  env: GeminiEnv,
  language: Language = 'fr',
  userDocsBlock: string | undefined = undefined,
  pathwayBlock: string | undefined = undefined,
): Promise<ChatResult> {
  if (!env.VERTEX_SA_JSON || !env.GCP_PROJECT_ID || !env.GCP_REGION) {
    console.error('[gemini] VERTEX_SA_JSON / GCP_PROJECT_ID / GCP_REGION not set')
    return apiError(CHAT_MODEL)
  }

  let accessToken: string
  try {
    accessToken = await getVertexAccessToken(env.VERTEX_SA_JSON)
  } catch (e) {
    console.error('[gemini] vertex token mint failed:', e)
    return apiError(CHAT_MODEL)
  }

  const systemPrompt = buildSystemPrompt(language, journeyType, pathwayBlock, userDocsBlock, systemAddendum)

  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  try {
    const response = await fetchWithBackoff(
      buildVertexUrl(env.GCP_PROJECT_ID, env.GCP_REGION, CHAT_MODEL, 'generateContent'),
      {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            // Generous ceiling — covers structured menopause / appointment-
            // prep replies (~1.5–2k visible tokens with bullets & bolds) and
            // leaves headroom. You only pay for what's actually generated.
            maxOutputTokens: 8192,
            // Disable thinking for the chat path: Anoqi's role is empathetic,
            // structured, sourced — not deep reasoning. With thinking on
            // (the 2.5 default), thinking tokens count against the same
            // budget and were truncating visible replies to ~60 tokens at
            // 1024. 0 = fastest + cheapest + full budget for visible text.
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      },
    )

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('[gemini] API error:', response.status, errorBody)
      return apiError(CHAT_MODEL)
    }

    const data: any = await response.json()
    const candidate = data.candidates?.[0]
    const rawContent: string  = candidate?.content?.parts?.[0]?.text ?? ''
    const tokensUsed: number | null = data.usageMetadata?.candidatesTokenCount ?? null
    const finishReason: string | undefined = candidate?.finishReason

    // Surface non-STOP finishes — MAX_TOKENS, SAFETY, RECITATION, OTHER —
    // so we can spot the cause when content comes back truncated. This is a
    // log line, not an error; the response still ships to the user.
    if (finishReason && finishReason !== 'STOP') {
      console.warn('[gemini] chat finishReason=' + finishReason + ' tokens=' + tokensUsed)
    }

    const policyResult = checkPolicy(rawContent, language)

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
// CHAT (STREAMING)
//
// Same prompt construction as chat(); only the network call differs.
// Yields `{ text }` deltas as Gemini emits them, then a final `{ done: true,
// finishReason, tokensUsed }`. Callers run their own policy/citation passes
// over the accumulated text.
//
// Designed for SSE: it does NOT run the policy layer itself, because the
// handler needs to inspect the accumulated text incrementally between deltas
// to abort streaming the moment any blocked phrase appears.
// ─────────────────────────────────────────────────────────────
export type ChatStreamEvent =
  | { kind: 'delta'; text: string }
  | { kind: 'done';  finishReason?: string; tokensUsed: number | null }
  | { kind: 'error'; reason: 'api_error' | 'parse_error'; status?: number }

export async function* chatStream(
  messages: ChatMessage[],
  journeyType: string | undefined,
  systemAddendum: string | undefined,
  env: GeminiEnv,
  language: Language = 'fr',
  userDocsBlock: string | undefined = undefined,
  pathwayBlock: string | undefined = undefined,
): AsyncGenerator<ChatStreamEvent, void, unknown> {
  if (!env.VERTEX_SA_JSON || !env.GCP_PROJECT_ID || !env.GCP_REGION) {
    console.error('[gemini] VERTEX_SA_JSON / GCP_PROJECT_ID / GCP_REGION not set')
    yield { kind: 'error', reason: 'api_error' }
    return
  }

  let accessToken: string
  try {
    accessToken = await getVertexAccessToken(env.VERTEX_SA_JSON)
  } catch (e) {
    console.error('[gemini] vertex token mint failed:', e)
    yield { kind: 'error', reason: 'api_error' }
    return
  }

  const systemPrompt = buildSystemPrompt(language, journeyType, pathwayBlock, userDocsBlock, systemAddendum)

  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  let response: Response
  try {
    // `alt=sse` switches the streamGenerateContent endpoint to Server-Sent
    // Events. Without it, the response is a JSON array delivered as one chunk
    // (defeats the point).
    response = await fetchWithBackoff(
      buildVertexUrl(env.GCP_PROJECT_ID, env.GCP_REGION, CHAT_MODEL, 'streamGenerateContent', 'alt=sse'),
      {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            maxOutputTokens: 8192,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      },
    )
  } catch (e) {
    console.error('[gemini] streamGenerateContent fetch failed:', e)
    yield { kind: 'error', reason: 'api_error' }
    return
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    console.error('[gemini] stream API error:', response.status, errorBody)
    yield { kind: 'error', reason: 'api_error', status: response.status }
    return
  }
  if (!response.body) {
    yield { kind: 'error', reason: 'api_error' }
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finishReason: string | undefined
  let tokensUsed: number | null = null

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // SSE frames are separated by blank lines; each `data: …` line carries one
    // JSON payload. Keep the trailing partial in `buffer` for the next chunk.
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (!payload) continue

      let data: any
      try {
        data = JSON.parse(payload)
      } catch (e) {
        console.error('[gemini] SSE parse error:', e, payload.slice(0, 200))
        continue
      }

      const candidate = data.candidates?.[0]
      const text: string | undefined = candidate?.content?.parts?.[0]?.text
      if (typeof text === 'string' && text.length > 0) {
        yield { kind: 'delta', text }
      }
      if (candidate?.finishReason) finishReason = candidate.finishReason
      if (typeof data.usageMetadata?.candidatesTokenCount === 'number') {
        tokensUsed = data.usageMetadata.candidatesTokenCount
      }
    }
  }

  if (finishReason && finishReason !== 'STOP') {
    console.warn(`[gemini] chatStream finishReason=${finishReason} tokens=${tokensUsed}`)
  }

  yield { kind: 'done', finishReason, tokensUsed }
}

// ─────────────────────────────────────────────────────────────
// GENERATE SUMMARY
// ─────────────────────────────────────────────────────────────
export async function generateSummary(
  prompt: string,
  env: GeminiEnv,
): Promise<string | null> {
  if (!env.VERTEX_SA_JSON || !env.GCP_PROJECT_ID || !env.GCP_REGION) {
    console.error('[gemini] VERTEX_SA_JSON / GCP_PROJECT_ID / GCP_REGION not set')
    return null
  }

  let accessToken: string
  try {
    accessToken = await getVertexAccessToken(env.VERTEX_SA_JSON)
  } catch (e) {
    console.error('[gemini] vertex token mint failed:', e)
    return null
  }

  try {
    const response = await fetchWithBackoff(
      buildVertexUrl(env.GCP_PROJECT_ID, env.GCP_REGION, SUMMARY_MODEL, 'generateContent'),
      {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            // Physician-handoff summaries are structured JSON and can run
            // long for menopause / appointment-prep flows. 8192 gives room
            // without runaway risk. Keep some thinking on (this is the one
            // path where careful clinical phrasing matters) but capped so it
            // doesn't eat the visible JSON.
            maxOutputTokens:  8192,
            responseMimeType: 'application/json',
            thinkingConfig:   { thinkingBudget: 2048 },
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
