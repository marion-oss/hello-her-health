/**
 * anoqi — POST /summaries (Workers port)
 *
 * Generates a structured, physician-ready summary from a completed
 * conversation. Authentication required.
 *
 * Pipeline:
 *   load conversation + messages → ask Gemini for structured JSON →
 *   validate → save to summaries table → save extracted symptoms →
 *   audit → return.
 *
 * No PII reaches Gemini — the conversation content was already
 * pseudonymised at message-creation time on the device.
 */
import type { Context } from 'hono'

import type { Env } from '../index'
import { getServiceClient } from '../lib/supabase'
import { getUserIdFromRequest } from '../auth'
import { generateSummary } from '../lib/gemini'
import { parseSummaryJson } from '../lib/summaryParser'

// ─────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────
export async function summariesHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  const supabase = getServiceClient(c.env)

  // Auth — required
  const userId = await getUserIdFromRequest(c.req.raw, supabase)
  if (!userId) {
    return c.json({ error: 'Authentication required to generate summaries' }, 401)
  }

  // Parse request
  let body: { conversationId: string; language?: 'fr' | 'en' }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const { conversationId, language = 'fr' } = body
  if (!conversationId) {
    return c.json({ error: 'conversationId is required' }, 400)
  }

  // Load conversation (must belong to this user)
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id, journey_type, status, user_id')
    .eq('id', conversationId)
    .eq('user_id', userId)
    .single()

  if (convError || !conversation) {
    return c.json({ error: 'Conversation not found or access denied' }, 404)
  }

  // Load messages
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .in('role', ['user', 'assistant'])
    .order('created_at', { ascending: true })

  if (msgError || !messages || messages.length < 2) {
    return c.json({ error: 'Conversation has too few messages to summarise' }, 400)
  }

  // Idempotency — one summary per conversation
  const { data: existing } = await supabase
    .from('summaries')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .single()

  if (existing) {
    return c.json({ error: 'A summary already exists for this conversation. Fetch it instead.' }, 409)
  }

  // Generate via Gemini Pro (structured JSON)
  const prompt = buildSummaryPrompt(messages, conversation.journey_type || 'free_chat', language)
  const rawContent = await generateSummary(prompt, c.env)

  if (!rawContent) {
    console.error('Gemini call failed during summary generation')
    return c.json({ error: 'AI service temporarily unavailable. Please try again.' }, 503)
  }

  const summaryContent = parseSummaryJson(rawContent)
  if (!summaryContent) {
    console.error('Failed to parse summary from Gemini output:', rawContent.slice(0, 500))
    return c.json({ error: 'Failed to generate a valid summary. Please try again.' }, 500)
  }

  const title = summaryContent.motif.slice(0, 100)

  const { data: savedSummary, error: saveError } = await supabase
    .from('summaries')
    .insert({
      user_id:         userId,
      conversation_id: conversationId,
      journey_type:    conversation.journey_type || 'free_chat',
      title,
      content_json:    summaryContent,
    })
    .select('id, title, journey_type, created_at')
    .single()

  if (saveError || !savedSummary) {
    console.error('Failed to save summary:', saveError)
    return c.json({ error: 'Failed to save summary' }, 500)
  }

  // Link summary back to conversation
  await supabase
    .from('conversations')
    .update({ summary_id: savedSummary.id, status: 'completed' })
    .eq('id', conversationId)

  // Save structured symptoms (best-effort)
  if (summaryContent.symptomes.length > 0) {
    const symptomRows = summaryContent.symptomes.map(s => ({
      user_id:         userId,
      conversation_id: conversationId,
      name:            s.nom,
      duration:        s.duree || null,
      frequency:       s.frequence || null,
      intensity:       s.intensite || null,
      triggers:        s.declencheurs || [],
      evolution:       s.evolution || null,
      daily_impact:    s.impact_quotidien || null,
      confirmed:       false,
    }))

    const { error: symError } = await supabase.from('symptoms').insert(symptomRows)
    if (symError) {
      console.error('Failed to save symptoms from summary:', symError)
    }
  }

  // Audit
  await supabase.from('audit_logs').insert({
    user_id:     userId,
    actor_id:    userId,
    action:      'summary.generate',
    resource:    'summary',
    resource_id: savedSummary.id,
    metadata: {
      journey_type:   conversation.journey_type,
      symptom_count:  summaryContent.symptomes.length,
      question_count: summaryContent.questions.length,
      language,
    },
  })

  return c.json(
    {
      summary: {
        id:          savedSummary.id,
        title:       savedSummary.title,
        journeyType: savedSummary.journey_type,
        createdAt:   savedSummary.created_at,
        content:     summaryContent,
      },
    },
    201,
  )
}

// ─────────────────────────────────────────────────────────────
// PROMPT
// ─────────────────────────────────────────────────────────────
function buildSummaryPrompt(
  messages: Array<{ role: string; content: string }>,
  journeyType: string,
  language: 'fr' | 'en',
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
