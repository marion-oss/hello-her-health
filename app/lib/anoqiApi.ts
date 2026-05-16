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
