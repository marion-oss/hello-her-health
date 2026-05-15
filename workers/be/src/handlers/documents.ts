/**
 * anoqi — POST /documents (Workers port)
 *
 * Persists pre-processed, de-identified document payloads from the mobile app.
 * Authentication required (no anonymous uploads).
 *
 * The privacy posture is unchanged: this server NEVER sees raw files, original
 * filenames, or unstripped text. The mobile pipeline (app/lib/documentStore.ts)
 * pseudonymises everything before it leaves the device.
 */
import type { Context } from 'hono'

import type { Env } from '../index'
import { getServiceClient } from '../lib/supabase'
import { getUserIdFromRequest } from '../auth'

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const VALID_DOCUMENT_TYPES = [
  'analyses', 'imagerie', 'comptes_rendus',
  'ordonnances', 'vaccins', 'antecedents', 'autre',
] as const

type DocumentType = typeof VALID_DOCUMENT_TYPES[number]

const MAX_TEXT_LENGTH = 50_000  // chars — must match app/lib/documentStore.ts
const DEFAULT_RETENTION_DAYS = 365 * 3

// ─────────────────────────────────────────────────────────────
// REQUEST PAYLOAD
// ─────────────────────────────────────────────────────────────
type DocumentPayload = {
  documentType: DocumentType
  documentDate: string | null
  cleanText: string
  labValues: object[] | null
  medications: object[] | null
  researchConsent: boolean
  birthYear: number | null
  country: string | null
}

// ─────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────
export async function documentsHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  const supabase = getServiceClient(c.env)

  // Auth — required
  const userId = await getUserIdFromRequest(c.req.raw, supabase)
  if (!userId) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  // Parse body
  let body: DocumentPayload
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Request body must be valid JSON' }, 400)
  }

  // Validate
  const validationError = validatePayload(body)
  if (validationError) {
    return c.json({ error: validationError }, 400)
  }

  // Build record
  const retentionUntil = new Date()
  retentionUntil.setDate(retentionUntil.getDate() + DEFAULT_RETENTION_DAYS)

  const record = {
    user_id:          userId,
    document_type:    body.documentType,
    document_date:    body.documentDate ?? null,
    birth_year:       body.birthYear ?? null,
    country:          body.country ?? null,
    clean_text:       body.cleanText,
    lab_values:       body.labValues ?? null,
    medications:      body.medications ?? null,
    research_consent: body.researchConsent,
    pseudonymised_at: new Date().toISOString(),
    retention_until:  retentionUntil.toISOString().split('T')[0],
  }

  // Insert
  const { data: saved, error: dbError } = await supabase
    .from('documents')
    .insert(record)
    .select('id, document_type, created_at')
    .single()

  if (dbError || !saved) {
    console.error('DB insert failed:', dbError)
    return c.json({ error: 'Failed to save document' }, 500)
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id:     userId,
    actor_id:    userId,
    action:      'document.upload',
    resource:    'document',
    resource_id: saved.id,
    metadata: {
      document_type:    body.documentType,
      has_lab_values:   body.labValues !== null && body.labValues.length > 0,
      has_medications:  body.medications !== null && body.medications.length > 0,
      research_consent: body.researchConsent,
      text_length:      body.cleanText.length,
    },
  })

  return c.json(
    {
      document: {
        id:           saved.id,
        documentType: saved.document_type,
        createdAt:    saved.created_at,
      },
    },
    201,
  )
}

// ─────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────
function validatePayload(body: unknown): string | null {
  if (!body || typeof body !== 'object') return 'Request body is required'
  const b = body as Record<string, unknown>

  if (!b.documentType || !VALID_DOCUMENT_TYPES.includes(b.documentType as DocumentType)) {
    return `documentType must be one of: ${VALID_DOCUMENT_TYPES.join(', ')}`
  }

  if (typeof b.cleanText !== 'string' || b.cleanText.trim().length === 0) {
    return 'cleanText is required and must be a non-empty string'
  }
  if (b.cleanText.length > MAX_TEXT_LENGTH) {
    return `cleanText exceeds maximum length of ${MAX_TEXT_LENGTH} characters`
  }

  if (containsObviousPii(b.cleanText)) {
    console.warn(`PII detected in cleanText — rejecting document upload`)
    return 'cleanText appears to contain unstripped personal information. Please update the app.'
  }

  if (b.documentDate !== null && b.documentDate !== undefined) {
    if (typeof b.documentDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.documentDate)) {
      return 'documentDate must be in YYYY-MM-DD format or null'
    }
  }

  if (typeof b.researchConsent !== 'boolean') {
    return 'researchConsent must be a boolean'
  }

  if (b.birthYear !== null && b.birthYear !== undefined) {
    const year = Number(b.birthYear)
    if (!Number.isInteger(year) || year < 1920 || year > 2020) {
      return 'birthYear must be an integer between 1920 and 2020, or null'
    }
  }

  return null
}

// Belt-and-suspenders only — full pseudonymisation lives on the device.
function containsObviousPii(text: string): boolean {
  const EMAIL = /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/
  const NIR   = /\b[12]\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{3}\s?\d{2}\b/
  return EMAIL.test(text) || NIR.test(text)
}
