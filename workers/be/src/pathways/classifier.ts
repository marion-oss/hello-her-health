/**
 * anoqi — Pathway routing classifier (Layer 1)
 *
 * One lightweight Gemini call on the FIRST message of a session (V2 §2.1
 * "What brings you here today?"). Returns the matching PathwayKey or null
 * (→ open chat). Constrained to the pathways actually loaded, so it can't
 * route to a pathway that has no module yet.
 *
 * Degrades safely: any failure (no creds, API error, unparseable output)
 * returns null, i.e. open chat. Routing is a hint, never a gate.
 */
import type { PathwayKey } from './types'
import { getVertexAccessToken } from '../lib/vertexAuth'
import { buildVertexUrl, CHAT_MODEL, type GeminiEnv } from '../lib/gemini'
import { loadedPathwayKeys } from './registry'

export async function classifyPathway(
  message: string,
  env:     GeminiEnv,
): Promise<PathwayKey | null> {
  if (!env.VERTEX_SA_JSON || !env.GCP_PROJECT_ID || !env.GCP_REGION) {
    console.error('[classifier] Vertex creds missing — routing to open chat')
    return null
  }

  const keys = loadedPathwayKeys()
  const allowed = [...keys, 'none']

  let accessToken: string
  try {
    accessToken = await getVertexAccessToken(env.VERTEX_SA_JSON)
  } catch (e) {
    console.error('[classifier] token mint failed (non-fatal):', e)
    return null
  }

  const systemPrompt =
    `You are a routing classifier for a women's health assistant. ` +
    `Read the user's opening message and decide which clinical pathway it belongs to. ` +
    `Reply with EXACTLY ONE word from this list, nothing else: ${allowed.join(', ')}. ` +
    `Use "none" for general wellbeing, unclear intent, or anything not covered by a listed pathway. ` +
    `Pathways: contraception = contraception, birth control, the pill, coil/IUD/IUS, implant, ` +
    `patch, ring, preventing pregnancy, managing periods with contraception.`

  try {
    const response = await fetch(
      buildVertexUrl(env.GCP_PROJECT_ID, env.GCP_REGION, CHAT_MODEL, 'generateContent'),
      {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: message }] }],
          generationConfig: {
            maxOutputTokens: 8,
            temperature:     0,
            thinkingConfig:  { thinkingBudget: 0 },
          },
        }),
      },
    )

    if (!response.ok) {
      console.error('[classifier] API error:', response.status)
      return null
    }

    const data: any = await response.json()
    const raw: string = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '')
      .toLowerCase()
      .trim()

    const match = keys.find(k => raw.includes(k))
    return match ?? null
  } catch (e) {
    console.error('[classifier] unexpected error (non-fatal):', e)
    return null
  }
}
