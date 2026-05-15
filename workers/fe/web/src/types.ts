// Mirrors workers/be/src/handlers/chat.ts and lib/citationParser.ts shapes.
// Keep in sync if you change the BE response.

export type Role = 'user' | 'assistant'

export type JourneyType =
  | 'symptoms'
  | 'contraception'
  | 'menopause'
  | 'fertility'
  | 'appointment_prep'
  | 'documents'
  | 'free_chat'

export type Language = 'fr' | 'en'

export interface MessageSource {
  label:           string
  row_id:          string
  source_kind:     'pathway' | 'source' | 'pathway_red_flag'
  source_ref:      string
  pathway_key:     string | null
  pathway_version: string | null
}

export interface SourceDisplay {
  label:       string
  source_kind: 'pathway' | 'source' | 'pathway_red_flag'
  source_ref:  string
  name:        string
  topic:       string
  url?:        string
}

export interface ChatMessage {
  id:               string
  role:             Role
  content:          string
  sources?:         MessageSource[]
  sources_display?: SourceDisplay[]
  blocked?:         boolean
  createdAt?:       string
}

export interface ChatRequestBody {
  message:         string
  conversationId?: string
  sessionId?:      string
  journeyType?:    JourneyType
  language?:       Language
}

export interface ChatResponseBody {
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
  blocked: boolean
}
