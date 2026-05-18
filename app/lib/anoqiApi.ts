// Anoqi — tiny fetch wrapper for the CF Worker BE.
//
// Single endpoint right now: POST /chat. Mirrors the request/response shape
// declared in workers/be/src/handlers/chat.ts so the FE and the contract stay
// in sync. Treat this as the source of truth on the client side — keep types
// here when the BE schema evolves.
//
// Anonymous auth: the BE requires EITHER a Bearer token OR a sessionId in the
// body. We always pass sessionId (lives in OnboardingContext). When real auth
// lands, swap in the access token via the optional `accessToken` arg.

import type { HealthObjective, Language } from '../context/OnboardingContext'

const API_URL = (process.env.EXPO_PUBLIC_ANOQI_API_URL ?? '').replace(/\/+$/, '')

// ── Types ────────────────────────────────────────────────────────────────
// Mirrors workers/be/src/handlers/chat.ts. Source of truth lives there; if
// the contract changes, update both sides.

export type JourneyType =
  | 'free_chat'
  | 'symptoms'
  | 'contraception'
  | 'menopause'
  | 'fertility'
  | 'appointment_prep'
  | 'documents'

export type MessageSource = {
  label:       string
  source_kind: 'pathway' | 'source' | 'pathway_red_flag'
  source_ref:  string
}

export type SourceDisplay = MessageSource & {
  name:  string
  topic: string
  url?:  string
}

export type ChatResponse = {
  message: {
    id:              string
    content:         string
    role:            'assistant'
    sources:         MessageSource[]
    sources_display: SourceDisplay[]
    policyFlags:     unknown[]
    createdAt:       string
  }
  conversationId: string
  blocked:        boolean
}

// Subset of LocalDocument shipped to the BE as chat context. Carries only
// the pseudonymised cleanText (PII already stripped on device) plus the
// minimum identifying metadata needed for the prompt header.
export type ChatRequestDocument = {
  id:           string
  name:         string | null
  documentType: string
  documentDate: string | null
  cleanText:    string
}

export type ChatRequest = {
  message:         string
  language:        Language
  sessionId:       string
  conversationId?: string
  objective?:      HealthObjective | null
  accessToken?:    string  // future: signed-in users
  // Documents the user has marked as in-context. Truncated client-side
  // before send; the BE applies its own caps too.
  documents?:      ChatRequestDocument[]
}

export class AnoqiApiError extends Error {
  status: number
  body:   unknown
  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name   = 'AnoqiApiError'
    this.status = status
    this.body   = body
  }
}

// `general` is a frontend-only objective that doesn't exist on the BE.
// `journey_type` in the DB has a CHECK constraint that allows only the values
// below; map `general` (and `null`) to `free_chat`.
function objectiveToJourney(objective: HealthObjective | null | undefined): JourneyType {
  switch (objective) {
    case 'symptoms':
    case 'contraception':
    case 'menopause':
    case 'fertility':
      return objective
    default:
      return 'free_chat'
  }
}

export async function postChat(req: ChatRequest): Promise<ChatResponse> {
  if (!API_URL) {
    throw new AnoqiApiError(
      'EXPO_PUBLIC_ANOQI_API_URL is not set. Add it to .env and restart Metro.',
      0,
      null,
    )
  }

  const body = {
    message:        req.message,
    language:       req.language,
    sessionId:      req.sessionId,
    conversationId: req.conversationId,
    journeyType:    objectiveToJourney(req.objective),
    documents:      req.documents && req.documents.length > 0 ? req.documents : undefined,
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (req.accessToken) headers.Authorization = `Bearer ${req.accessToken}`

  const res = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  // Try to parse JSON either way — error responses use the same shape.
  const text = await res.text()
  let parsed: any = null
  try { parsed = text ? JSON.parse(text) : null } catch { /* keep null */ }

  if (!res.ok) {
    const reason = parsed?.error ?? `HTTP ${res.status}`
    throw new AnoqiApiError(reason, res.status, parsed ?? text)
  }

  return parsed as ChatResponse
}

// ── Streaming ────────────────────────────────────────────────────────────
//
// Server-Sent Events consumer for POST /chat. Same request body as
// `postChat`, but the response is consumed token-by-token. The server emits:
//
//   event: delta   data: { text }            — append to visible message
//   event: redact  data: { content }         — replace visible message
//                                              (output-policy block)
//   event: done    data: { id, cleanContent,
//                          sources, sources_display, policyFlags,
//                          conversationId, blocked, createdAt }
//   event: error   data: { error, status? }  — server-side failure
//
// Falls back to the existing buffered JSON path (`postChat`) automatically
// when the server returns a non-streaming response (older Worker deployments,
// proxies that strip `Accept: text/event-stream`, etc).

export type ChatStreamFinal = {
  id:              string
  cleanContent:    string
  sources:         MessageSource[]
  sources_display: SourceDisplay[]
  policyFlags:     unknown[]
  conversationId:  string
  blocked:         boolean
  createdAt:       string
}

export type ChatStreamCallbacks = {
  onDelta:  (text: string) => void
  onRedact: (replacement: string) => void
  onDone:   (final: ChatStreamFinal) => void
  onError:  (err: AnoqiApiError) => void
}

export async function postChatStream(
  req: ChatRequest,
  cb:  ChatStreamCallbacks,
): Promise<void> {
  if (!API_URL) {
    cb.onError(new AnoqiApiError(
      'EXPO_PUBLIC_ANOQI_API_URL is not set. Add it to .env and restart Metro.',
      0,
      null,
    ))
    return
  }

  const body = {
    message:        req.message,
    language:       req.language,
    sessionId:      req.sessionId,
    conversationId: req.conversationId,
    journeyType:    objectiveToJourney(req.objective),
    documents:      req.documents && req.documents.length > 0 ? req.documents : undefined,
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept':       'text/event-stream',
  }
  if (req.accessToken) headers.Authorization = `Bearer ${req.accessToken}`

  let res: Response
  try {
    res = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
  } catch (e) {
    cb.onError(new AnoqiApiError(
      e instanceof Error ? e.message : 'network error',
      0,
      null,
    ))
    return
  }

  // Fallback: server didn't honour SSE (old deployment, proxy stripped header,
  // server-side error returned as JSON). Decode body once and replay as a
  // single delta + done so the consumer can stay on the streaming code path.
  const contentType = res.headers.get('Content-Type') ?? ''
  if (!contentType.includes('text/event-stream') || !res.body) {
    const text = await res.text().catch(() => '')
    let parsed: any = null
    try { parsed = text ? JSON.parse(text) : null } catch { /* keep null */ }

    if (!res.ok) {
      const reason = parsed?.error ?? `HTTP ${res.status}`
      cb.onError(new AnoqiApiError(reason, res.status, parsed ?? text))
      return
    }

    const payload = parsed as ChatResponse | null
    if (!payload) {
      cb.onError(new AnoqiApiError('Empty response', res.status, null))
      return
    }
    cb.onDelta(payload.message.content)
    cb.onDone({
      id:              payload.message.id,
      cleanContent:    payload.message.content,
      sources:         payload.message.sources,
      sources_display: payload.message.sources_display,
      policyFlags:     payload.message.policyFlags,
      conversationId:  payload.conversationId,
      blocked:         payload.blocked,
      createdAt:       payload.message.createdAt,
    })
    return
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    cb.onError(new AnoqiApiError(`HTTP ${res.status}`, res.status, text))
    return
  }

  const reader  = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let done   = false

  try {
    while (!done) {
      const { value, done: streamDone } = await reader.read()
      if (streamDone) break
      buffer += decoder.decode(value, { stream: true })

      // SSE: events separated by `\n\n`. Each event is N lines of
      // `event: …` and `data: …`.
      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''

      for (const evt of events) {
        let eventType = 'message'
        let dataLines: string[] = []
        for (const line of evt.split('\n')) {
          if (line.startsWith('event: '))      eventType = line.slice(7).trim()
          else if (line.startsWith('event:'))  eventType = line.slice(6).trim()
          else if (line.startsWith('data: '))  dataLines.push(line.slice(6))
          else if (line.startsWith('data:'))   dataLines.push(line.slice(5))
        }
        if (dataLines.length === 0) continue

        let payload: any = null
        try { payload = JSON.parse(dataLines.join('\n')) } catch { continue }

        switch (eventType) {
          case 'delta':
            if (typeof payload?.text === 'string') cb.onDelta(payload.text)
            break
          case 'redact':
            cb.onRedact(typeof payload?.content === 'string' ? payload.content : '')
            break
          case 'done':
            cb.onDone(payload as ChatStreamFinal)
            done = true
            break
          case 'error':
            cb.onError(new AnoqiApiError(
              payload?.error ?? 'stream error',
              payload?.status ?? 0,
              payload,
            ))
            done = true
            break
        }
      }
    }
  } finally {
    try { reader.releaseLock?.() } catch { /* noop */ }
  }
}
