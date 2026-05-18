/**
 * anoqi — /chat edge function
 *
 * POST /functions/v1/chat
 *
 * Receives a user message, runs the full pipeline:
 *   classifyInput → Gemini → checkPolicy → persist → respond
 *
 * Handles both authenticated users and anonymous sessions.
 * Every request is validated, every response is policy-checked.
 * No AI output ever reaches the user without passing the policy layer.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { chat } from '../lib/gemini.ts'
import { classifyInput } from '../policy/policyChecker.ts'
import { retrieve, renderSnippetsForPrompt, type Snippet } from '../lib/retrieval.ts'
import { parseCitations, type MessageSource } from '../lib/citationParser.ts'

// ─────────────────────────────────────────────────────────────
// CORS headers — required for browser clients
// ─────────────────────────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ─────────────────────────────────────────────────────────────
// Request / Response types
// ─────────────────────────────────────────────────────────────
interface ChatRequest {
  message: string                   // The user's new message
  conversationId?: string           // Existing conversation UUID (null for new)
  sessionId?: string                // Anonymous session UUID (unauthenticated users)
  journeyType?: string              // 'symptoms' | 'contraception' | 'appointment_prep' | 'documents' | 'free_chat'
  language?: 'fr' | 'en'            // User's interface language; drives retrieval-side language filter. Defaults to 'fr'.
}

/**
 * Display-side enrichment for cited sources. Joined server-side from
 * source_library / clinical_pathways / pathway_red_flags so the mobile
 * client never needs follow-up queries. Not persisted; recomputed per turn.
 */
interface SourceDisplay {
  label:       string
  source_kind: 'pathway' | 'source' | 'pathway_red_flag'
  source_ref:  string
  name:        string
  topic:       string
  url?:        string
}

interface ChatResponse {
  message: {
    id:              string
    content:         string
    role:            'assistant'
    sources:         MessageSource[]   // canonical refs (matches messages.sources)
    sources_display: SourceDisplay[]   // server-enriched display data
    policyFlags:     unknown[]
    createdAt:       string
  }
  conversationId: string
  blocked: boolean                  // true if policy layer blocked the response
}

// ─────────────────────────────────────────────────────────────
// SAFE FALLBACK — returned when input classifier blocks
// ─────────────────────────────────────────────────────────────
const INPUT_BLOCKED_RESPONSE = `Je ne peux pas poser de diagnostic ni prescrire de traitement — c'est le rôle de ton médecin. Ce que je peux faire, c'est t'aider à préparer les bonnes questions pour ton prochain rendez-vous. Tu veux qu'on commence ?`

// ─────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // ── 1. Parse and validate request ──────────────────────────
    let body: ChatRequest
    try {
      body = await req.json()
    } catch {
      return errorResponse(400, 'Invalid JSON body')
    }

    const { message, conversationId, sessionId, journeyType } = body
    const language: 'fr' | 'en' = body.language === 'en' ? 'en' : 'fr'

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return errorResponse(400, 'message is required and must be a non-empty string')
    }

    if (message.length > 4000) {
      return errorResponse(400, 'message exceeds maximum length of 4000 characters')
    }

    // ── 2. Auth — user or anonymous session ───────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // Try to get authenticated user from JWT
    const authHeader = req.headers.get('Authorization')
    let userId: string | null = null

    if (authHeader) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      )
      if (!authError && user) {
        userId = user.id
      }
    }

    // Require either a userId or a sessionId
    if (!userId && !sessionId) {
      return errorResponse(401, 'Either a valid auth token or a sessionId is required')
    }

    // ── 3. Get or create conversation ─────────────────────────
    let activeConversationId = conversationId

    if (!activeConversationId) {
      // Create a new conversation
      const newConversation = {
        user_id: userId,
        session_id: sessionId ?? null,
        journey_type: journeyType ?? 'free_chat',
        status: 'active',
      }

      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .insert(newConversation)
        .select('id')
        .single()

      if (convError || !conv) {
        console.error('Failed to create conversation:', convError)
        return errorResponse(500, 'Failed to create conversation')
      }

      activeConversationId = conv.id
    } else {
      // Verify the conversation belongs to this user/session
      const filter = userId
        ? { id: activeConversationId, user_id: userId }
        : { id: activeConversationId, session_id: sessionId }

      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .select('id, status')
        .match(filter)
        .single()

      if (convError || !conv) {
        return errorResponse(404, 'Conversation not found or access denied')
      }

      if (conv.status === 'archived') {
        return errorResponse(400, 'Cannot send messages to an archived conversation')
      }
    }

    // ── 4. Load conversation history ──────────────────────────
    const { data: existingMessages, error: historyError } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', activeConversationId)
      .in('role', ['user', 'assistant'])
      .order('created_at', { ascending: true })
      .limit(20) // Last 20 messages — keeps context window manageable

    if (historyError) {
      console.error('Failed to load message history:', historyError)
      return errorResponse(500, 'Failed to load conversation history')
    }

    // ── 5. Classify user input before sending to LLM ─────────
    const inputCheck = classifyInput(message.trim())

    if (!inputCheck.safe) {
      // Save the user message + the blocked response to DB for transparency
      await persistMessages(supabase, {
        conversationId: activeConversationId,
        userId,
        userMessage: message.trim(),
        assistantContent: INPUT_BLOCKED_RESPONSE,
        policyFlags: [{ rule: 'input_blocked', reason: inputCheck.reason }],
        sources: [],
        tokensUsed: null,
        modelUsed: 'policy_layer',
      })

      const responsePayload: ChatResponse = {
        message: {
          id: crypto.randomUUID(),
          content: INPUT_BLOCKED_RESPONSE,
          role: 'assistant',
          sources: [],
          policyFlags: [{ rule: 'input_blocked', severity: 'block' }],
          createdAt: new Date().toISOString(),
        },
        conversationId: activeConversationId,
        blocked: true,
      }

      return jsonResponse(200, responsePayload)
    }

    // ── 6. Build message history for Gemini ───────────────────
    const messageHistory = [
      ...(existingMessages ?? []).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message.trim() },
    ]

    // ── 6.5 Retrieval (RAG) ──────────────────────────────────
    // Pull supporting snippets from the embedded clinical corpus
    // (clinical_pathways + source_library + pathway_red_flags). Snippets
    // are rendered into the system prompt addendum with strict citation
    // rules. A retrieval failure MUST NOT block the chat: log it and
    // continue with no snippets (the LLM falls back to its base behaviour).
    //
    // Feature gate: RAG runs when EITHER the global flag is on OR the
    // authenticated user is in the pilot allowlist. Anonymous sessions
    // never qualify for pilot — pilot is auth-gated by design.
    //
    //   ANOQI_RAG_ENABLED       'true' | 'false'   — global flag
    //   ANOQI_RAG_PILOT_USERS   'uuid,uuid,...'    — pilot allowlist
    //
    // RAG-grounded chat is closer to the EU-MDR / medical-device threshold
    // than free conversation (see ROADMAP.md → "Clinical governance
    // angle"). Default global=OFF; pilot list named individually.
    const ragGlobal = (Deno.env.get('ANOQI_RAG_ENABLED') ?? '').toLowerCase() === 'true'
    const pilotList = (Deno.env.get('ANOQI_RAG_PILOT_USERS') ?? '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
    const ragPilot   = userId !== null && pilotList.includes(userId)
    const ragEnabled = ragGlobal || ragPilot

    let snippets: Snippet[] = []
    if (ragEnabled) {
      try {
        snippets = await retrieve(supabase, {
          message: message.trim(),
          journeyType,
          language,
          topK: 5,
        })
      } catch (e) {
        console.error('[chat] retrieval failed (non-fatal):', e)
      }
    }
    const systemAddendum = renderSnippetsForPrompt(snippets, language) ?? undefined

    // ── 7. Call Gemini (policy check runs inside gemini.ts) ───
    const aiResponse = await chat(messageHistory, journeyType, systemAddendum)

    if (aiResponse.error === 'api_error') {
      // API error — return safe message without saving a broken response
      return jsonResponse(503, {
        error: 'AI service temporarily unavailable. Please try again in a moment.',
        conversationId: activeConversationId,
      })
    }

    // ── 7.5 Parse citations & detect hallucinated source IDs ─
    // The LLM was instructed to cite [Sn] only from the provided snippet
    // set. Strip any tokens that fall outside that set and surface the
    // event as a non-blocking policy flag (Critic phase will gate later).
    const { cleanContent, citedSources, hallucinatedLabels } = parseCitations(
      aiResponse.content,
      snippets,
    )
    const citationFlags = hallucinatedLabels.length > 0
      ? [{
          rule: 'hallucinated_citation',
          severity: 'warn' as const,
          message: `Model cited unknown labels: ${hallucinatedLabels.join(', ')}`,
        }]
      : []
    const combinedFlags = [...aiResponse.policyResult.flags, ...citationFlags]

    // ── 7.6 Enrich citations with display data ───────────────
    // Join cited rows against source_library / clinical_pathways /
    // pathway_red_flags to produce sources_display for the mobile client.
    // Never persisted — recomputed each turn so display reflects current
    // source names / categories / URLs.
    const sourcesDisplay = await enrichSources(supabase, citedSources, language)

    // ── 8. Persist both messages to DB ────────────────────────
    await persistMessages(supabase, {
      conversationId: activeConversationId,
      userId,
      userMessage: message.trim(),
      assistantContent: cleanContent,
      policyFlags: combinedFlags,
      sources: citedSources,
      tokensUsed: aiResponse.tokensUsed,
      modelUsed: aiResponse.modelUsed,
    })

    // ── 9. Auto-generate conversation title on first message ──
    if (!existingMessages || existingMessages.length === 0) {
      const title = generateTitle(message.trim())
      await supabase
        .from('conversations')
        .update({ title })
        .eq('id', activeConversationId)
    }

    // ── 10. Return response ───────────────────────────────────
    const responsePayload: ChatResponse = {
      message: {
        id:              crypto.randomUUID(),
        content:         cleanContent,
        role:            'assistant',
        sources:         citedSources,
        sources_display: sourcesDisplay,
        policyFlags:     combinedFlags,
        createdAt:       new Date().toISOString(),
      },
      conversationId: activeConversationId,
      blocked: !aiResponse.policyResult.safe,
    }

    return jsonResponse(200, responsePayload)

  } catch (error) {
    console.error('Unhandled error in /chat:', error)
    return errorResponse(500, 'An unexpected error occurred')
  }
})

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Persist user message + assistant response as a pair.
 * Always saves both — even blocked responses — for audit purposes.
 */
async function persistMessages(
  supabase: ReturnType<typeof createClient>,
  opts: {
    conversationId: string
    userId: string | null
    userMessage: string
    assistantContent: string
    policyFlags: unknown[]
    sources: unknown[]
    tokensUsed: number | null
    modelUsed: string
  }
) {
  const { conversationId, userId, userMessage, assistantContent, policyFlags, sources, tokensUsed, modelUsed } = opts

  const messages = [
    {
      conversation_id: conversationId,
      user_id: userId,
      role: 'user',
      content: userMessage,
      sources: [],
      policy_flags: [],
      tokens_used: null,
      model_used: null,
    },
    {
      conversation_id: conversationId,
      user_id: userId,
      role: 'assistant',
      content: assistantContent,
      sources,
      policy_flags: policyFlags,
      tokens_used: tokensUsed,
      model_used: modelUsed,
    },
  ]

  const { error } = await supabase.from('messages').insert(messages)
  if (error) {
    // Log but don't throw — a DB write failure shouldn't crash the user's chat experience
    console.error('Failed to persist messages:', error)
  }
}

/**
 * Generate a short conversation title from the first user message.
 * Truncate at 60 chars, clean up whitespace.
 */
function generateTitle(message: string): string {
  const cleaned = message.replace(/\s+/g, ' ').trim()
  return cleaned.length > 60 ? cleaned.slice(0, 57) + '...' : cleaned
}

/** Return a JSON error response with CORS headers */
function errorResponse(status: number, message: string): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    }
  )
}

/** Return a JSON success response with CORS headers */
function jsonResponse(status: number, data: unknown): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    }
  )
}

/**
 * Enrich cited sources with display data joined from the originating
 * tables (source_library, clinical_pathways, pathway_red_flags). The
 * mobile client renders these as citation chips.
 *
 * One batched query per source kind; bounded by `citedSources.length`
 * which is at most topK (5). Total: ≤ 3 small `where id in (...)` reads.
 */
async function enrichSources(
  supabase:     ReturnType<typeof createClient>,
  citedSources: MessageSource[],
  language:     'fr' | 'en',
): Promise<Array<{
  label:       string
  source_kind: 'pathway' | 'source' | 'pathway_red_flag'
  source_ref:  string
  name:        string
  topic:       string
  url?:        string
}>> {
  if (citedSources.length === 0) return []

  const sourceIds  = citedSources.filter(s => s.source_kind === 'source')           .map(s => s.source_ref)
  const pathwayIds = citedSources.filter(s => s.source_kind === 'pathway')          .map(s => s.source_ref)
  const redFlagIds = citedSources.filter(s => s.source_kind === 'pathway_red_flag') .map(s => s.source_ref)

  const [srcRes, pthRes, rfRes] = await Promise.all([
    sourceIds.length
      ? supabase.from('source_library').select('id, name, url, category').in('id', sourceIds)
      : Promise.resolve({ data: [], error: null }),
    pathwayIds.length
      ? supabase.from('clinical_pathways').select('id, title, pathway_key').in('id', pathwayIds)
      : Promise.resolve({ data: [], error: null }),
    redFlagIds.length
      ? supabase.from('pathway_red_flags').select('id, pathway_key, escalation_type').in('id', redFlagIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  const srcMap = new Map((srcRes.data ?? []).map((r: any) => [r.id, r]))
  const pthMap = new Map((pthRes.data ?? []).map((r: any) => [r.id, r]))
  const rfMap  = new Map((rfRes.data ?? []).map((r: any) => [r.id, r]))

  const RED_FLAG_LABEL = language === 'fr' ? 'Drapeau rouge' : 'Red flag'
  const SOURCE_FALLBACK = language === 'fr' ? 'Source'       : 'Source'
  const PATH_FALLBACK   = language === 'fr' ? 'Parcours'     : 'Pathway'

  return citedSources.map(s => {
    if (s.source_kind === 'source') {
      const row: any = srcMap.get(s.source_ref)
      return {
        label:       s.label,
        source_kind: s.source_kind,
        source_ref:  s.source_ref,
        name:        row?.name     ?? SOURCE_FALLBACK,
        topic:       row?.category ?? '',
        url:         row?.url      ?? undefined,
      }
    }
    if (s.source_kind === 'pathway') {
      const row: any = pthMap.get(s.source_ref)
      return {
        label:       s.label,
        source_kind: s.source_kind,
        source_ref:  s.source_ref,
        name:        row?.title       ?? PATH_FALLBACK,
        topic:       row?.pathway_key ?? '',
      }
    }
    // pathway_red_flag
    const row: any = rfMap.get(s.source_ref)
    return {
      label:       s.label,
      source_kind: s.source_kind,
      source_ref:  s.source_ref,
      name:        RED_FLAG_LABEL,
      topic:       row?.pathway_key ?? '',
    }
  })
}
