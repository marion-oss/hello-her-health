/**
 * anoqi — /documents edge function
 *
 * POST /functions/v1/documents
 *
 * Handles medical document upload. Full pipeline:
 *   receive file → store original in Storage → extract text →
 *   pseudonymise → auto-classify → save to DB → return record
 *
 * The original file is stored untouched in private Supabase Storage.
 * Only the pseudonymised text extract is stored in the DB and
 * ever passed to the AI. PII never reaches Gemini.
 *
 * Supported file types for text extraction (v1):
 * - Plain text (.txt)
 * - Markdown (.md)
 * - Pre-extracted text sent directly in the request body
 *
 * PDF and image OCR require client-side extraction in v1.
 * The mobile app extracts text before upload; this function
 * receives the extracted text alongside the raw file.
 * Full server-side PDF extraction is planned for Phase 2.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { pseudonymise, classifyDocument } from '../lib/pseudonymise.ts'

// ─────────────────────────────────────────────────────────────
// CORS headers
// ─────────────────────────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024   // 10MB
const STORAGE_BUCKET = 'documents'

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
]

// GDPR retention — documents deleted after this many days by default
const DEFAULT_RETENTION_DAYS = 365 * 3  // 3 years

// ─────────────────────────────────────────────────────────────
// Request shape
// ─────────────────────────────────────────────────────────────
// The request must be multipart/form-data with:
//   file          — the raw document file (required)
//   extractedText — pre-extracted plain text from the file (required for PDF/image)
//   conversationId — optional, links document to a conversation
//   retentionDays — optional, override default retention

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
      return errorResponse(401, 'Authentication required to upload documents')
    }

    // ── 2. Parse multipart form ────────────────────────────────
    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return errorResponse(400, 'Request must be multipart/form-data')
    }

    const file = formData.get('file') as File | null
    const extractedText = formData.get('extractedText') as string | null
    const conversationId = formData.get('conversationId') as string | null
    const retentionDaysRaw = formData.get('retentionDays') as string | null
    const retentionDays = retentionDaysRaw ? parseInt(retentionDaysRaw, 10) : DEFAULT_RETENTION_DAYS

    // ── 3. Validate file ───────────────────────────────────────
    if (!file) {
      return errorResponse(400, 'No file provided')
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return errorResponse(413, `File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`)
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return errorResponse(415, `File type not supported: ${file.type}. Allowed: PDF, JPEG, PNG, HEIC, TXT, DOCX`)
    }

    // Determine file type category
    const fileType = getFileType(file.type)

    // ── 4. Store original file in Supabase Storage ─────────────
    // Path: {userId}/{timestamp}-{random}.{ext}
    const ext = getExtension(file.type)
    const timestamp = Date.now()
    const randomSuffix = crypto.randomUUID().split('-')[0]
    const storagePath = `${userId}/${timestamp}-${randomSuffix}.${ext}`

    const fileBuffer = await file.arrayBuffer()

    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (storageError) {
      console.error('Storage upload failed:', storageError)
      return errorResponse(500, 'Failed to store document')
    }

    // ── 5. Pseudonymise extracted text ─────────────────────────
    // For PDFs and images, the app extracts text client-side and sends it
    // For text files, we can extract server-side
    let textForProcessing = extractedText || ''

    if (!textForProcessing && fileType === 'text') {
      // Extract text from plain text files server-side
      const decoder = new TextDecoder('utf-8')
      textForProcessing = decoder.decode(fileBuffer)
    }

    let pseudonymisedExtract: string | null = null
    let detectedPiiTypes: string[] = []

    if (textForProcessing.trim().length > 0) {
      const pseudoResult = pseudonymise(textForProcessing)
      pseudonymisedExtract = pseudoResult.pseudonymisedText
      detectedPiiTypes = pseudoResult.detectedTypes

      // Audit log: how many PII items were stripped
      console.log(`Pseudonymised document: ${pseudoResult.replacementCount} PII items removed, types: ${detectedPiiTypes.join(', ')}`)
    }

    // ── 6. Auto-classify document ──────────────────────────────
    const autoCategory = pseudonymisedExtract
      ? classifyDocument(pseudonymisedExtract)
      : 'autre'

    // ── 7. Calculate retention date ────────────────────────────
    const retentionUntil = new Date()
    retentionUntil.setDate(retentionUntil.getDate() + retentionDays)

    // ── 8. Save document record to DB ──────────────────────────
    const documentRecord = {
      user_id: userId,
      conversation_id: conversationId || null,
      storage_path: storagePath,
      original_filename: file.name || null,
      category: autoCategory,
      category_confirmed: false,       // user must confirm auto-classification
      pseudonymised: pseudonymisedExtract !== null,
      pseudonymised_at: pseudonymisedExtract !== null ? new Date().toISOString() : null,
      extracted_content: pseudonymisedExtract,
      file_type: fileType,
      file_size_bytes: file.size,
      retention_until: retentionUntil.toISOString().split('T')[0],  // date only
    }

    const { data: savedDoc, error: dbError } = await supabase
      .from('documents')
      .insert(documentRecord)
      .select('id, category, category_confirmed, pseudonymised, file_type, file_size_bytes, created_at')
      .single()

    if (dbError || !savedDoc) {
      console.error('DB insert failed:', dbError)
      // Clean up the uploaded file if DB insert fails
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath])
      return errorResponse(500, 'Failed to save document record')
    }

    // ── 9. Audit log ───────────────────────────────────────────
    await supabase.from('audit_logs').insert({
      user_id: userId,
      actor_id: userId,
      action: 'document.upload',
      resource: 'document',
      resource_id: savedDoc.id,
      metadata: {
        file_type: fileType,
        file_size_bytes: file.size,
        pii_types_detected: detectedPiiTypes,
        auto_category: autoCategory,
      }
    })

    // ── 10. Return response ────────────────────────────────────
    return jsonResponse(201, {
      document: {
        id: savedDoc.id,
        category: savedDoc.category,
        categoryConfirmed: savedDoc.category_confirmed,
        pseudonymised: savedDoc.pseudonymised,
        fileType: savedDoc.file_type,
        fileSizeBytes: savedDoc.file_size_bytes,
        createdAt: savedDoc.created_at,
        // Note: we never return original filename, storage path, or extracted content
        // in the response — these stay server-side only
      },
      // Tell the client whether text was successfully extracted and pseudonymised
      textExtracted: pseudonymisedExtract !== null,
      // If text couldn't be extracted, prompt user to confirm category manually
      requiresCategoryConfirmation: true,
    })

  } catch (error) {
    console.error('Unhandled error in /documents:', error)
    return errorResponse(500, 'An unexpected error occurred')
  }
})

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function getFileType(mimeType: string): 'pdf' | 'image' | 'text' | 'docx' {
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx'
  return 'text'
}

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/heic': 'heic',
    'image/heif': 'heif',
    'text/plain': 'txt',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  }
  return map[mimeType] || 'bin'
}

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
