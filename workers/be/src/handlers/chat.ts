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
import { classifyInput, checkPolicy } from '../policy/policyChecker'
import { chat as geminiChat, chatStream as geminiChatStream } from '../lib/gemini'
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
// Setup pipeline shared by JSON + streaming finishers.
//
// Returns either a fully-formed early Response (validation failure, auth
// failure, conversation not found, input blocked by safety policy) OR a
// "prep" bundle the finishers can use to call Gemini and assemble the reply.
// ─────────────────────────────────────────────────────────────
type ChatPrep = {
  kind: 'proceed'
  supabase: SupabaseClient
  userId: string | null
  activeConversationId: string
  isNewConversation: boolean
  message: string
  language: 'fr' | 'en'
  journeyType: string | undefined
  messageHistory: { role: 'user' | 'assistant'; content: string }[]
  snippets: Snippet[]
  systemAddendum: string | undefined
}

async function prepareChat(
  c: Context<{ Bindings: Env }>,
): Promise<ChatPrep | { kind: 'early'; response: Response }> {
  let body: ChatRequest
  try {
    body = await c.req.json()
  } catch {
    return { kind: 'early', response: c.json({ error: 'Invalid JSON body' }, 400) }
  }

  const { message, conversationId, sessionId, journeyType } = body
  const language: 'fr' | 'en' = body.language === 'en' ? 'en' : 'fr'

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return {
      kind: 'early',
      response: c.json({ error: 'message is required and must be a non-empty string' }, 400),
    }
  }
  if (message.length > 4000) {
    return {
      kind: 'early',
      response: c.json({ error: 'message exceeds maximum length of 4000 characters' }, 400),
    }
  }

  const supabase = getServiceClient(c.env)
  const userId = await getUserIdFromRequest(c.req.raw, supabase)

  if (!userId && !sessionId) {
    return {
      kind: 'early',
      response: c.json(
        { error: 'Either a valid auth token or a sessionId is required' },
        401,
      ),
    }
  }

  let activeConversationId = conversationId
  let isNewConversation = false

  if (!activeConversationId) {
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        session_id: sessionId ?? null,
        journey_type: journeyType ?? 'free_chat',
        status: 'active',
      })
      .select('id')
      .single()

    if (convError || !conv) {
      console.error('Failed to create conversation:', convError)
      return {
        kind: 'early',
        response: c.json({ error: 'Failed to create conversation' }, 500),
      }
    }
    activeConversationId = conv.id as string
    isNewConversation = true
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
      return {
        kind: 'early',
        response: c.json({ error: 'Conversation not found or access denied' }, 404),
      }
    }
    if (conv.status === 'archived') {
      return {
        kind: 'early',
        response: c.json(
          { error: 'Cannot send messages to an archived conversation' },
          400,
        ),
      }
    }
  }

  // History load and RAG retrieval are independent — fire them in parallel.
  // The previous serial pipeline blocked ~30 ms on history before kicking off
  // the embedding round-trip; with `Promise.all` the embedding starts the
  // moment we know `activeConversationId`. RAG-disabled deployments skip the
  // call entirely and the second slot resolves to an empty snippet list.
  const ragEnabled = (c.env.ANOQI_RAG_ENABLED ?? '').toLowerCase() === 'true'
  const trimmedMessage = message.trim()

  const historyP = supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', activeConversationId)
    .in('role', ['user', 'assistant'])
    .order('created_at', { ascending: true })
    .limit(20)

  const retrieveP: Promise<Snippet[]> = ragEnabled
    ? retrieve(
        supabase,
        { message: trimmedMessage, journeyType, language, topK: 5 },
        c.env,
      ).catch((e) => {
        console.error('[chat] retrieval failed (non-fatal):', e)
        return []
      })
    : Promise.resolve([])

  const [{ data: existingMessages, error: historyError }, snippets] = await Promise.all([
    historyP,
    retrieveP,
  ])

  if (historyError) {
    console.error('Failed to load message history:', historyError)
    return {
      kind: 'early',
      response: c.json({ error: 'Failed to load conversation history' }, 500),
    }
  }

  // Whether or not this is the first message (i.e. should we auto-title).
  // For an existing conversation the loader returns 0 rows on the very first
  // call too, so this is shared by both paths.
  const isFirstMessage = !existingMessages || existingMessages.length === 0
  isNewConversation = isNewConversation || isFirstMessage

  const inputCheck = classifyInput(trimmedMessage)
  if (!inputCheck.safe) {
    await persistMessages(supabase, {
      conversationId: activeConversationId,
      userId,
      userMessage: trimmedMessage,
      assistantContent: INPUT_BLOCKED_RESPONSE,
      policyFlags: [{ rule: 'input_blocked', reason: inputCheck.reason }],
      sources: [],
      tokensUsed: null,
      modelUsed: 'policy_layer',
    })

    const payload: ChatResponse = {
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

    // Streaming clients still want the redaction; non-streaming gets JSON.
    const acceptsSSE = (c.req.header('Accept') ?? '').includes('text/event-stream')
    if (acceptsSSE) {
      return {
        kind: 'early',
        response: sseEarlyMessage(payload, INPUT_BLOCKED_RESPONSE),
      }
    }
    return { kind: 'early', response: c.json(payload, 200) }
  }

  const messageHistory = [
    ...(existingMessages ?? []).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content as string,
    })),
    { role: 'user' as const, content: trimmedMessage },
  ]

  const systemAddendum = renderSnippetsForPrompt(snippets, language) ?? undefined

  return {
    kind: 'proceed',
    supabase,
    userId,
    activeConversationId,
    isNewConversation,
    message: trimmedMessage,
    language,
    journeyType,
    messageHistory,
    snippets,
    systemAddendum,
  }
}

// ─────────────────────────────────────────────────────────────
// HANDLER — dispatches on `Accept: text/event-stream`.
//
// Streaming clients see tokens land progressively (TTFT ~500 ms instead of
// ~5 s on a typical reply). Non-streaming clients get the original JSON
// response — both paths produce the same final shape.
// ─────────────────────────────────────────────────────────────
export async function chatHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  const acceptsSSE = (c.req.header('Accept') ?? '').includes('text/event-stream')
  return acceptsSSE ? chatStreamHandler(c) : chatJsonHandler(c)
}

async function chatJsonHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  const prep = await prepareChat(c)
  if (prep.kind === 'early') return prep.response

  const {
    supabase, userId, activeConversationId, isNewConversation,
    message, language, journeyType, messageHistory, snippets, systemAddendum,
  } = prep

  // Call Gemini (policy check runs inside)
  const aiResponse = await geminiChat(messageHistory, journeyType, systemAddendum, c.env, language)

  if (aiResponse.error === 'api_error') {
    return c.json(
      {
        error: 'AI service temporarily unavailable. Please try again in a moment.',
        conversationId: activeConversationId,
      },
      503,
    )
  }

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

  const sourcesDisplay = await enrichSources(supabase, citedSources, language)

  await persistMessages(supabase, {
    conversationId: activeConversationId,
    userId,
    userMessage: message,
    assistantContent: cleanContent,
    policyFlags: combinedFlags,
    sources: citedSources,
    tokensUsed: aiResponse.tokensUsed,
    modelUsed: aiResponse.modelUsed,
  })

  // Auto-title on the first message. The user never sees this update — it's
  // for the conversation list — so push it off the response path via
  // ctx.waitUntil. Local dev without `executionCtx` falls back to awaiting.
  if (isNewConversation) {
    const titleP = (async () => {
      const { error } = await supabase
        .from('conversations')
        .update({ title: generateTitle(message) })
        .eq('id', activeConversationId)
      if (error) console.error('[chat] auto-title update failed:', error)
    })()
    const waitUntil = c.executionCtx?.waitUntil?.bind(c.executionCtx)
    if (waitUntil) waitUntil(titleP)
    else await titleP
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
// STREAMING HANDLER — SSE
//
// Emits three event types over the wire:
//   event: delta   — partial token chunks (data: { "text": "…" })
//   event: redact  — incremental policy block, replaces accumulated text
//   event: done    — final metadata (id, sources_display, policyFlags, …)
//   event: error   — transport / Gemini failure
//
// Safety: every delta runs through `checkPolicy(accumulated)` before being
// flushed. If a blocked phrase appears, we send `redact` (replaces the visible
// text with the sanitised fallback) and stop forwarding further deltas.
// ─────────────────────────────────────────────────────────────
async function chatStreamHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  const prep = await prepareChat(c)
  if (prep.kind === 'early') return prep.response

  const {
    supabase, userId, activeConversationId, isNewConversation,
    message, language, journeyType, messageHistory, snippets, systemAddendum,
  } = prep

  const encoder = new TextEncoder()
  const send = (controller: ReadableStreamDefaultController, event: string, data: unknown) => {
    controller.enqueue(
      encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
    )
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let accumulated = ''
      let redactedContent: string | null = null
      let geminiErrored = false

      try {
        for await (const evt of geminiChatStream(
          messageHistory, journeyType, systemAddendum, c.env, language,
        )) {
          if (evt.kind === 'error') {
            geminiErrored = true
            send(controller, 'error', {
              error: 'AI service temporarily unavailable. Please try again in a moment.',
              status: evt.status ?? 503,
            })
            controller.close()
            return
          }
          if (evt.kind === 'done') {
            break
          }
          // evt.kind === 'delta'
          accumulated += evt.text
          // Incremental policy check — catches diagnosis language the moment
          // the pattern completes. Cheap regex pass; runs per-delta.
          const check = checkPolicy(accumulated)
          if (!check.safe) {
            redactedContent = check.sanitisedContent ?? ''
            send(controller, 'redact', { content: redactedContent })
            // Stop forwarding further deltas; we still want to drain Gemini
            // so the connection closes cleanly, but consumers won't see them.
            // Cheapest: break the loop — Gemini's response will be GC'd.
            break
          }
          send(controller, 'delta', { text: evt.text })
        }

        if (geminiErrored) return

        // Post-stream finalisation. `cleanContent` strips citation tokens from
        // visible text; the unstripped accumulated text is the one the client
        // already saw (which is what we want — citations are rendered as pills,
        // not raw markers).
        const finalContent = redactedContent ?? accumulated
        const { cleanContent, citedSources, hallucinatedLabels } = parseCitations(
          finalContent, snippets,
        )
        const citationFlags = hallucinatedLabels.length > 0
          ? [{
              rule: 'hallucinated_citation',
              severity: 'warn' as const,
              message: `Model cited unknown labels: ${hallucinatedLabels.join(', ')}`,
            }]
          : []
        const policyFlags = redactedContent !== null
          ? [{ rule: 'policy_block', severity: 'block' as const, message: 'Streamed reply blocked by output policy' }]
          : []
        const combinedFlags = [...policyFlags, ...citationFlags]

        const sourcesDisplay = await enrichSources(supabase, citedSources, language)

        // Persist + auto-title in the background — these are durable writes,
        // not on the user-visible critical path. `waitUntil` lets the Worker
        // keep them alive after the Response closes.
        const persistP = (async () => {
          await persistMessages(supabase, {
            conversationId: activeConversationId,
            userId,
            userMessage: message,
            assistantContent: cleanContent,
            policyFlags: combinedFlags,
            sources: citedSources,
            tokensUsed: null,
            modelUsed: 'gemini-2.5-flash',
          })
          if (isNewConversation) {
            const title = generateTitle(message)
            await supabase
              .from('conversations')
              .update({ title })
              .eq('id', activeConversationId)
          }
        })().catch((e) => console.error('[chat-stream] persist error:', e))

        const waitUntil = c.executionCtx?.waitUntil?.bind(c.executionCtx)
        if (waitUntil) waitUntil(persistP)

        send(controller, 'done', {
          id: crypto.randomUUID(),
          cleanContent,
          sources: citedSources,
          sources_display: sourcesDisplay,
          policyFlags: combinedFlags,
          conversationId: activeConversationId,
          blocked: redactedContent !== null,
          createdAt: new Date().toISOString(),
        })
        controller.close()
      } catch (e) {
        console.error('[chat-stream] handler error:', e)
        try {
          send(controller, 'error', { error: 'Internal error' })
        } catch { /* controller may already be closed */ }
        try { controller.close() } catch { /* idem */ }
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':       'text/event-stream',
      'Cache-Control':      'no-cache, no-transform',
      'Connection':         'keep-alive',
      // Disable proxy buffering (some CDN edges hold SSE until N bytes).
      'X-Accel-Buffering':  'no',
    },
  })
}

// Synthesises a short SSE stream for the early "input blocked" path so the
// streaming client doesn't have to special-case format detection.
function sseEarlyMessage(payload: ChatResponse, fullText: string): Response {
  const enc = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        enc.encode(`event: delta\ndata: ${JSON.stringify({ text: fullText })}\n\n`),
      )
      controller.enqueue(
        enc.encode(
          `event: done\ndata: ${JSON.stringify({
            id: payload.message.id,
            cleanContent: fullText,
            sources: [],
            sources_display: [],
            policyFlags: payload.message.policyFlags,
            conversationId: payload.conversationId,
            blocked: true,
            createdAt: payload.message.createdAt,
          })}\n\n`,
        ),
      )
      controller.close()
    },
  })
  return new Response(body, {
    headers: {
      'Content-Type':       'text/event-stream',
      'Cache-Control':      'no-cache, no-transform',
      'Connection':         'keep-alive',
      'X-Accel-Buffering':  'no',
    },
  })
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
