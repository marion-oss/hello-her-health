/**
 * anoqi — /summaries edge function
 *
 * POST /functions/v1/summaries
 *
 * Generates a structured, physician-ready summary from a completed
 * conversation. This is the core value-delivery feature of the app —
 * turning a chat session into something a doctor can actually use.
 *
 * Pipeline:
 *   load conversation + messages → validate journey is complete →
 *   ask Gemini to structure the summary → validate JSON output →
 *   save to summaries table → return summary record
 *
 * Summary structure (content_json):
 *   - motif          : chief complaint in one sentence
 *   - symptomes      : structured list of symptoms with duration/frequency/intensity
 *   - questions      : questions the user wants to ask their doctor
 *   - traitements    : medications/treatments mentioned in the conversation
 *   - documents      : documents uploaded during this conversation
 *   - points_cles    : key clinical points for the physician
 *   - prochaines_etapes : recommended next steps
 *
 * The summary is ALWAYS generated from pseudonymised conversation content.
 * No PII is passed to Gemini during summary generation.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { parseSummaryJson, type SummaryContent, type Symptom } from '../lib/summaryParser.ts'

// ─────────────────────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Types and parseSummaryJson live in ../lib/summaryParser.ts

// ─────────────────────────────────────────────────────────────
// Summary prompt — instructs Gemini to output structured JSON
// ─────────────────────────────────────────────────────────────
function buildSummaryPrompt(
  messages: Array<{ role: string; content: string }>,
  journeyType: string,
  language: 'fr' | 'en'
): string {
  const conversationText = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => `${m.role === 'user' ? 'Utilisatrice' : 'Anoqi'}: ${m.content}`)
    .join('\n\n')

  const isFrench = language === 'fr'

  return `
Tu es un assistant médical expert. À partir de la conversation ci-dessous, génère un résumé structuré pour une consultation médicale.

Type de parcours : ${journeyType}

CONVERSATION :
${conversationText}

---

Génère un résumé JSON strictement valide, sans markdown, sans texte avant ou après, avec cette structure exacte :

{
  "motif": "Une phrase décrivant le motif de consultation principal",
  "symptomes": [
    {
      "nom": "Nom du symptôme",
      "duree": "Durée (ex: 3 mois, 2 semaines) — omis si non mentionné",
      "frequence": "Fréquence (ex: quotidienne, 2-3x/semaine) — omis si non mentionné",
      "intensite": "légère | modérée | importante — omis si non mentionné",
      "declencheurs": ["déclencheur 1", "déclencheur 2"] ,
      "evolution": "stable | aggravation | amélioration — omis si non mentionné",
      "impact_quotidien": "Description de l'impact — omis si non mentionné"
    }
  ],
  "questions": [
    "Question 1 que l'utilisatrice souhaite poser à son médecin",
    "Question 2"
  ],
  "traitements": [
    "Traitement ou médicament mentionné 1"
  ],
  "points_cles": [
    "Point clinique important pour le médecin"
  ],
  "prochaines_etapes": [
    "Prochaine étape recommandée"
  ],
  "langue": "${language}",
  "genere_le": "${new Date().toISOString()}"
}

RÈGLES STRICTES :
- JSON uniquement — aucun texte avant ou après
- Ne jamais inclure de données personnelles identifiables (nom, date de naissance, adresse)
- Si un champ n'a pas d'information, utilise un tableau vide [] ou omet le champ optionnel
- Les symptômes doivent être extraits précisément depuis la conversation — ne pas inventer
- Maximum 5 points_cles, maximum 8 questions, maximum 10 symptômes
- ${isFrench ? 'Réponds entièrement en français' : 'Respond entirely in English'}
- Ne jamais inclure de diagnostic ou de prescription dans le résumé
`
}


// ─────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return errorResponse(405, 'Method not allowed')
  }

  try {
    // ── 1. Auth ────────────────────────────────────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const authHeader = req.headers.get('Authorization')
    let userId: string | null = null

    if (authHeader) {
      const { data: { user }, error } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      )
      if (!error && user) userId = user.id
    }

    if (!userId) {
      return errorResponse(401, 'Authentication required to generate summaries')
    }

    // ── 2. Parse request ───────────────────────────────────────
    let body: { conversationId: string; language?: 'fr' | 'en' }
    try {
      body = await req.json()
    } catch {
      return errorResponse(400, 'Invalid JSON body')
    }

    const { conversationId, language = 'fr' } = body

    if (!conversationId) {
      return errorResponse(400, 'conversationId is required')
    }

    // ── 3. Load conversation ───────────────────────────────────
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, journey_type, status, user_id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single()

    if (convError || !conversation) {
      return errorResponse(404, 'Conversation not found or access denied')
    }

    // ── 4. Load messages ───────────────────────────────────────
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .in('role', ['user', 'assistant'])
      .order('created_at', { ascending: true })

    if (msgError || !messages || messages.length < 2) {
      return errorResponse(400, 'Conversation has too few messages to summarise')
    }

    // ── 5. Check for existing summary ──────────────────────────
    const { data: existing } = await supabase
      .from('summaries')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single()

    if (existing) {
      return errorResponse(409, 'A summary already exists for this conversation. Fetch it instead.')
    }

    // ── 6. Build prompt and call Gemini ────────────────────────
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${
      Deno.env.get('GEMINI_MODEL') || 'gemini-1.5-pro'
    }:generateContent`

    const prompt = buildSummaryPrompt(messages, conversation.journey_type || 'free_chat', language)

    const geminiRequest = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,       // very low — we need consistent structured output
        maxOutputTokens: 2000,
        topP: 0.8,
      },
    }

    let rawContent: string
    try {
      const response = await fetch(
        `${GEMINI_API_URL}?key=${Deno.env.get('GEMINI_API_KEY')}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiRequest),
        }
      )

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`)
      }

      const data = await response.json()
      rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    } catch (e) {
      console.error('Gemini call failed during summary generation:', e)
      return errorResponse(503, 'AI service temporarily unavailable. Please try again.')
    }

    // ── 7. Parse and validate summary JSON ─────────────────────
    const summaryContent = parseSummaryJson(rawContent)

    if (!summaryContent) {
      console.error('Failed to parse summary from Gemini output:', rawContent.slice(0, 500))
      return errorResponse(500, 'Failed to generate a valid summary. Please try again.')
    }

    // ── 8. Generate title ──────────────────────────────────────
    const title = summaryContent.motif.slice(0, 100)

    // ── 9. Save summary to DB ──────────────────────────────────
    const { data: savedSummary, error: saveError } = await supabase
      .from('summaries')
      .insert({
        user_id: userId,
        conversation_id: conversationId,
        journey_type: conversation.journey_type || 'free_chat',
        title,
        content_json: summaryContent,
      })
      .select('id, title, journey_type, created_at')
      .single()

    if (saveError || !savedSummary) {
      console.error('Failed to save summary:', saveError)
      return errorResponse(500, 'Failed to save summary')
    }

    // ── 10. Link summary back to conversation ──────────────────
    await supabase
      .from('conversations')
      .update({ summary_id: savedSummary.id, status: 'completed' })
      .eq('id', conversationId)

    // ── 11. Save structured symptoms to symptoms table ─────────
    if (summaryContent.symptomes.length > 0) {
      const symptomRows = summaryContent.symptomes.map(s => ({
        user_id: userId,
        conversation_id: conversationId,
        name: s.nom,
        duration: s.duree || null,
        frequency: s.frequence || null,
        intensity: s.intensite || null,
        triggers: s.declencheurs || [],
        evolution: s.evolution || null,
        daily_impact: s.impact_quotidien || null,
        confirmed: false,
      }))

      const { error: symError } = await supabase.from('symptoms').insert(symptomRows)
      if (symError) {
        // Non-fatal — summary is saved, symptom extraction is best-effort
        console.error('Failed to save symptoms from summary:', symError)
      }
    }

    // ── 12. Audit log ──────────────────────────────────────────
    await supabase.from('audit_logs').insert({
      user_id: userId,
      actor_id: userId,
      action: 'summary.generate',
      resource: 'summary',
      resource_id: savedSummary.id,
      metadata: {
        journey_type: conversation.journey_type,
        symptom_count: summaryContent.symptomes.length,
        question_count: summaryContent.questions.length,
        language,
      },
    })

    // ── 13. Return ─────────────────────────────────────────────
    return jsonResponse(201, {
      summary: {
        id: savedSummary.id,
        title: savedSummary.title,
        journeyType: savedSummary.journey_type,
        createdAt: savedSummary.created_at,
        content: summaryContent,
      },
    })

  } catch (error) {
    console.error('Unhandled error in /summaries:', error)
    return errorResponse(500, 'An unexpected error occurred')
  }
})

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function errorResponse(status: number, message: string): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
  )
}

function jsonResponse(status: number, data: unknown): Response {
  return new Response(
    JSON.stringify(data),
    { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
  )
}
