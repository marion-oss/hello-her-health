/**
 * anoqi — /documents edge function
 *
 * POST /functions/v1/documents
 *
 * Receives a pre-processed, de-identified document payload from the
 * mobile app and persists it to the documents table.
 *
 * Architecture — privacy by design:
 *   All processing happens on the user's device BEFORE this function
 *   is called. This server never sees raw files or unstripped text.
 *
 *   Device pipeline (app/lib/documentStore.ts):
 *     raw text → pseudonymise() → classifyDocument() → extractStructured()
 *         ↓
 *   This function receives:
 *     { documentType, documentDate, cleanText, labValues, medications,
 *       researchConsent, birthYear, country }
 *
 * What this function does:
 *   1. Authenticate the request
 *   2. Validate the payload
 *   3. Insert into documents table
 *   4. Write audit log
 *   5. Return the new document id
 *
 * What this function does NOT do:
 *   - OCR, file storage, text extraction, pseudonymisation
 *   - Accept raw files or multipart form data
 *   - Store original filenames or unstripped content
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─────────────────────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const VALID_DOCUMENT_TYPES = [
  'analyses', 'imagerie', 'comptes_rendus',
  'ordonnances', 'vaccins', 'antecedents', 'autre',
] as const

type DocumentType = typeof VALID_DOCUMENT_TYPES[number]

const MAX_TEXT_LENGTH  = 50_000   // chars — must match app/lib/documentStore.ts
const DEFAULT_RETENTION_DAYS = 365 * 3

// ─────────────────────────────────────────────────────────────
// REQUEST PAYLOAD
// ─────────────────────────────────────────────────────────────
type DocumentPayload = {
  documentType: DocumentType
  documentDate: string | null          // "YYYY-MM-DD" or null
  cleanText: string                    // pseudonymised, required
  labValues: object[] | null           // [{name, value, unit, referenceRange, flag}]
  medications: object[] | null         // [{name, dose, frequency, duration}]
  researchConsent: boolean
  birthYear: number | null             // from user profile (sign-up)
  country: string | null               // ISO 3166-1 alpha-2 or null
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
    if (!authHeader) {
      return errorResponse(401, 'Authentication required')
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return errorResponse(401, 'Invalid or expired token')
    }

    const userId = user.id

    // ── 2. Parse body ──────────────────────────────────────────
    let body: DocumentPayload
    try {
      body = await req.json() as DocumentPayload
    } catch {
      return errorResponse(400, 'Request body must be valid JSON')
    }

    // ── 3. Validate ────────────────────────────────────────────
    const validationError = validatePayload(body)
    if (validationError) {
      return errorResponse(400, validationError)
    }

    // ── 4. Build document record ───────────────────────────────
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

    // ── 5. Insert ──────────────────────────────────────────────
    const { data: saved, error: dbError } = await supabase
      .from('documents')
      .insert(record)
      .select('id, document_type, created_at')
      .single()

    if (dbError || !saved) {
      console.error('DB insert failed:', dbError)
      return errorResponse(500, 'Failed to save document')
    }

    // ── 6. Audit log ───────────────────────────────────────────
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

    // ── 7. Respond ─────────────────────────────────────────────
    return jsonResponse(201, {
      document: {
        id:           saved.id,
        documentType: saved.document_type,
        createdAt:    saved.created_at,
      },
    })

  } catch (err) {
    console.error('Unhandled error in /documents:', err)
    return errorResponse(500, 'An unexpected error occurred')
  }
})

// ─────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────
function validatePayload(body: unknown): string | null {
  if (!body || typeof body !== 'object') {
    return 'Request body is required'
  }

  const b = body as Record<string, unknown>

  // documentType
  if (!b.documentType || !VALID_DOCUMENT_TYPES.includes(b.documentType as DocumentType)) {
    return `documentType must be one of: ${VALID_DOCUMENT_TYPES.join(', ')}`
  }

  // cleanText
  if (typeof b.cleanText !== 'string' || b.cleanText.trim().length === 0) {
    return 'cleanText is required and must be a non-empty string'
  }
  if (b.cleanText.length > MAX_TEXT_LENGTH) {
    return `cleanText exceeds maximum length of ${MAX_TEXT_LENGTH} characters`
  }

  // Sanity check: cleanText must not contain obvious PII patterns
  // (belt-and-suspenders — the device should have stripped these already)
  if (containsObviousPii(b.cleanText)) {
    console.warn(`PII detected in cleanText — rejecting document upload`)
    return 'cleanText appears to contain unstripped personal information. Please update the app.'
  }

  // documentDate
  if (b.documentDate !== null && b.documentDate !== undefined) {
    if (typeof b.documentDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.documentDate)) {
      return 'documentDate must be in YYYY-MM-DD format or null'
    }
  }

  // researchConsent
  if (typeof b.researchConsent !== 'boolean') {
    return 'researchConsent must be a boolean'
  }

  // birthYear
  if (b.birthYear !== null && b.birthYear !== undefined) {
    const year = Number(b.birthYear)
    if (!Number.isInteger(year) || year < 1920 || year > 2020) {
      return 'birthYear must be an integer between 1920 and 2020, or null'
    }
  }

  return null
}

// Quick server-side PII check — belt-and-suspenders only.
// The full pseudonymisation pipeline lives on the device.
function containsObviousPii(text: string): boolean {
  const EMAIL = /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/
  const NIR   = /\b[12]\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{3}\s?\d{2}\b/
  return EMAIL.test(text) || NIR.test(text)
}

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
