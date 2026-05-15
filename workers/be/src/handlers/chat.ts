/**
 * anoqi — POST /chat (Workers port)
 *
 * Receives a user message, runs the full pipeline:
 *   classifyInput → retrieve (RAG) → Gemini → checkPolicy → persist → respond
 *
 * Mirrors api/functions/chat.ts behaviour identically. Differences are
 * mechanical: Hono context instead of raw Request/Response, env via
 * c.env instead of Deno.env, npm Supabase client instead of esm.sh.
 *
 * Feature gate: ANOQI_RAG_ENABLED (string 'true' to enable retrieval).
 * Default OFF until regulatory sign-off — see ROADMAP.md.
 */
import type { Context } from 'hono'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Env } from '../index'
import { getServiceClient } from '../lib/supabase'
import { getUserIdFromRequest } from '../auth'
import { classifyInput } from '../policy/policyChecker'
import { chat as geminiChat } from '../lib/gemini'
import { retrieve, renderSnippetsForPrompt, type Snippet } from '../lib/retrieval'
import { parseCitations, type MessageSource } from '../lib/citationParser'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface ChatRequest {
  message: string
  conversationId?: string
  sessionId?: string
  journeyType?: string
  language?: 'fr' | 'en'
}

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
    sources:         MessageSource[]
    sources_display: SourceDisplay[]
    policyFlags:     unknown[]
    createdAt:       string
  }
  conversationId: string
  blocked: boolean
}

const INPUT_BLOCKED_RESPONSE = `Je ne peux pas poser de diagnostic ni prescrire de traitement — c'est le rôle de ton médecin. Ce que je peux faire, c'est t'aider à préparer les bonnes questions pour ton prochain rendez-vous. Tu veux qu'on commence ?`

// ─────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────
export async function chatHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  // Parse body
  let body: ChatRequest
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const { message, conversationId, sessionId, journeyType } = body
  const language: 'fr' | 'en' = body.language === 'en' ? 'en' : 'fr'

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return c.json({ error: 'message is required and must be a non-empty string' }, 400)
  }
  if (message.length > 4000) {
    return c.json({ error: 'message exceeds maximum length of 4000 characters' }, 400)
  }

  // Auth — userId or anonymous sessionId
  const supabase = getServiceClient(c.env)
  const userId   = await getUserIdFromRequest(c.req.raw, supabase)

  if (!userId && !sessionId) {
    return c.json({ error: 'Either a valid auth token or a sessionId is required' }, 401)
  }

  // Get or create conversation
  let activeConversationId = conversationId

  if (!activeConversationId) {
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .insert({
        user_id:      userId,
        session_id:   sessionId ?? null,
        journey_type: journeyType ?? 'free_chat',
        status:       'active',
      })
      .select('id')
      .single()

    if (convError || !conv) {
      console.error('Failed to create conversation:', convError)
      return c.json({ error: 'Failed to create conversation' }, 500)
    }
    activeConversationId = conv.id as string
  } else {
    const filter = userId
      ? { id: activeConversationId, user_id: userId }
      : { id: activeConversationId, session_id: sessionId }

    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .select('id, status')
      .match(filter)
      .single()

    if (convError || !conv) {
      return c.json({ error: 'Conversation not found or access denied' }, 404)
    }
    if (conv.status === 'archived') {
      return c.json({ error: 'Cannot send messages to an archived conversation' }, 400)
    }
  }

  // Load history (last 20)
  const { data: existingMessages, error: historyError } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', activeConversationId)
    .in('role', ['user', 'assistant'])
    .order('created_at', { ascending: true })
    .limit(20)

  if (historyError) {
    console.error('Failed to load message history:', historyError)
    return c.json({ error: 'Failed to load conversation history' }, 500)
  }

  // Classify input
  const inputCheck = classifyInput(message.trim())
  if (!inputCheck.safe) {
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
        sources_display: [],
        policyFlags: [{ rule: 'input_blocked', severity: 'block' }],
        createdAt: new Date().toISOString(),
      },
      conversationId: activeConversationId,
      blocked: true,
    }
    return c.json(responsePayload, 200)
  }

  // Build message history for Gemini
  const messageHistory = [
    ...(existingMessages ?? []).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content as string,
    })),
    { role: 'user' as const, content: message.trim() },
  ]

  // Retrieval (gated)
  const ragEnabled = (c.env.ANOQI_RAG_ENABLED ?? '').toLowerCase() === 'true'
  let snippets: Snippet[] = []
  if (ragEnabled) {
    try {
      snippets = await retrieve(
        supabase,
        { message: message.trim(), journeyType, language, topK: 5 },
        c.env,
      )
    } catch (e) {
      console.error('[chat] retrieval failed (non-fatal):', e)
    }
  }
  const systemAddendum = renderSnippetsForPrompt(snippets, language) ?? undefined

  // Call Gemini (policy check runs inside)
  const aiResponse = await geminiChat(messageHistory, journeyType, systemAddendum, c.env, language)

  if (aiResponse.error === 'api_error') {
    return c.json(
      { error: 'AI service temporarily unavailable. Please try again in a moment.', conversationId: activeConversationId },
      503,
    )
  }

  // Parse citations + detect hallucinations
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

  // Enrich citations
  const sourcesDisplay = await enrichSources(supabase, citedSources, language)

  // Persist
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

  // First-message title
  if (!existingMessages || existingMessages.length === 0) {
    const title = generateTitle(message.trim())
    await supabase.from('conversations').update({ title }).eq('id', activeConversationId)
  }

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
  return c.json(responsePayload, 200)
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
async function persistMessages(
  supabase: SupabaseClient,
  opts: {
    conversationId: string
    userId: string | null
    userMessage: string
    assistantContent: string
    policyFlags: unknown[]
    sources: unknown[]
    tokensUsed: number | null
    modelUsed: string
  },
) {
  const rows = [
    {
      conversation_id: opts.conversationId,
      user_id: opts.userId,
      role: 'user',
      content: opts.userMessage,
      sources: [],
      policy_flags: [],
      tokens_used: null,
      model_used: null,
    },
    {
      conversation_id: opts.conversationId,
      user_id: opts.userId,
      role: 'assistant',
      content: opts.assistantContent,
      sources: opts.sources,
      policy_flags: opts.policyFlags,
      tokens_used: opts.tokensUsed,
      model_used: opts.modelUsed,
    },
  ]

  const { error } = await supabase.from('messages').insert(rows)
  if (error) {
    console.error('Failed to persist messages:', error)
  }
}

function generateTitle(message: string): string {
  const cleaned = message.replace(/\s+/g, ' ').trim()
  return cleaned.length > 60 ? cleaned.slice(0, 57) + '...' : cleaned
}

async function enrichSources(
  supabase:     SupabaseClient,
  citedSources: MessageSource[],
  language:     'fr' | 'en',
): Promise<SourceDisplay[]> {
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
  const SOURCE_FALLBACK = 'Source'
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
