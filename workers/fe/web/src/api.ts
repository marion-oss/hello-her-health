import type { ChatRequestBody, ChatResponseBody } from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
if (!API_BASE_URL) {
  // Fail loudly at module load, not on first request — easier to spot misconfig.
  throw new Error(
    'VITE_API_BASE_URL is not set. Add it to workers/fe/web/.env and rebuild.',
  )
}

/**
 * Anonymous-session helpers. The BE Worker accepts either a Supabase JWT
 * (Authorization header) or a stable client-generated `sessionId`. Web
 * users are anonymous in this build; we generate the sessionId once and
 * persist it in localStorage.
 */
const SESSION_KEY = 'anoqi_web_session_id'

export function getOrCreateSessionId(): string {
  const existing = localStorage.getItem(SESSION_KEY)
  if (existing) return existing
  const fresh = crypto.randomUUID()
  localStorage.setItem(SESSION_KEY, fresh)
  return fresh
}

/**
 * POST /chat against the BE Worker. Throws on network or non-2xx.
 */
export async function postChat(body: ChatRequestBody): Promise<ChatResponseBody> {
  const res = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    let detail = ''
    try {
      const errBody = await res.json()
      detail = (errBody as { error?: string }).error ?? ''
    } catch {
      // ignore JSON parse failure
    }
    throw new Error(detail || `Request failed (${res.status})`)
  }

  return (await res.json()) as ChatResponseBody
}
