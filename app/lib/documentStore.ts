/**
 * anoqi — Document Store
 *
 * On-device document storage and processing pipeline.
 *
 * Architecture (privacy by design):
 *   User pastes / types text
 *       ↓
 *   pseudonymise()          — strip PII on device
 *       ↓
 *   classifyDocument()      — detect document type
 *       ↓
 *   extractStructured()     — parse lab values or medications
 *       ↓
 *   saveDocument()          — write JSON to expo-file-system
 *       ↓
 *   uploadToServer()        — send ONLY clean payload to Supabase
 *
 * Original text NEVER leaves the device.
 * Clean text + structured data are uploaded once research_consent = true
 * or when needed for the user's own summaries (always pseudonymised).
 *
 * Local storage path:
 *   FileSystem.documentDirectory + 'anoqi/documents/<id>.json'
 *
 * Dependencies:
 *   expo-file-system     — file I/O
 *   @react-native-async-storage/async-storage  — document index
 */

import * as FileSystem from 'expo-file-system'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  pseudonymise,
  classifyDocument,
  extractLabValues,
  extractMedications,
  type DocumentCategory,
  type LabValue,
  type Medication,
} from './pseudonymise'

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const DOCS_DIR        = `${FileSystem.documentDirectory}anoqi/documents/`
const INDEX_KEY       = 'anoqi_document_index'   // AsyncStorage key for the doc list
const MAX_TEXT_LENGTH = 50_000                   // chars — refuse suspiciously large pastes

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
export type LocalDocument = {
  id: string
  documentType: DocumentCategory
  documentDate: string | null          // ISO date string "YYYY-MM-DD", from user or parsed
  createdAt: string                    // ISO datetime string
  cleanText: string                    // pseudonymised full text
  labValues: LabValue[] | null         // structured, for analyses
  medications: Medication[] | null     // structured, for ordonnances
  researchConsent: boolean
  uploadedAt: string | null            // ISO datetime if already sent to server
  serverId: string | null              // documents.id from Supabase, once uploaded
}

// Minimal record stored in the AsyncStorage index (avoids loading every full doc)
export type DocumentIndexEntry = {
  id: string
  documentType: DocumentCategory
  documentDate: string | null
  createdAt: string
  uploadedAt: string | null
}

// What gets sent to the server — no original text, no filenames
export type DocumentUploadPayload = {
  documentType: DocumentCategory
  documentDate: string | null
  cleanText: string
  labValues: LabValue[] | null
  medications: Medication[] | null
  researchConsent: boolean
  // Added by upload fn from OnboardingContext / user profile:
  birthYear: number | null
  country: string | null
}

// ─────────────────────────────────────────────────────────────
// STORAGE HELPERS
// ─────────────────────────────────────────────────────────────
async function ensureDocsDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(DOCS_DIR)
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(DOCS_DIR, { intermediates: true })
  }
}

function docPath(id: string): string {
  return `${DOCS_DIR}${id}.json`
}

async function readIndex(): Promise<DocumentIndexEntry[]> {
  const raw = await AsyncStorage.getItem(INDEX_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as DocumentIndexEntry[]
  } catch {
    return []
  }
}

async function writeIndex(entries: DocumentIndexEntry[]): Promise<void> {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(entries))
}

// ─────────────────────────────────────────────────────────────
// PROCESS
// Full pipeline: raw text → LocalDocument (not yet saved)
// ─────────────────────────────────────────────────────────────
export type ProcessResult = {
  document: LocalDocument
  piiDetected: boolean
  piiTypes: string[]
  replacementCount: number
}

export function processText(
  rawText: string,
  options: {
    documentDate?: string | null
    researchConsent: boolean
    overrideType?: DocumentCategory  // if user manually selected a type
  }
): ProcessResult {
  if (!rawText || rawText.trim().length === 0) {
    throw new Error('Document text is empty')
  }
  if (rawText.length > MAX_TEXT_LENGTH) {
    throw new Error(`Document is too long (${rawText.length} chars). Maximum is ${MAX_TEXT_LENGTH}.`)
  }

  // 1. Pseudonymise
  const { pseudonymisedText, detectedTypes, replacementCount } = pseudonymise(rawText)

  // 2. Classify
  const documentType = options.overrideType ?? classifyDocument(pseudonymisedText)

  // 3. Extract structured data (type-specific)
  const labValues: LabValue[] | null =
    documentType === 'analyses' ? extractLabValues(pseudonymisedText) : null

  const medications: Medication[] | null =
    documentType === 'ordonnances' ? extractMedications(pseudonymisedText) : null

  // 4. Build LocalDocument (not yet persisted)
  const doc: LocalDocument = {
    id: generateId(),
    documentType,
    documentDate: options.documentDate ?? null,
    createdAt: new Date().toISOString(),
    cleanText: pseudonymisedText,
    labValues: labValues && labValues.length > 0 ? labValues : null,
    medications: medications && medications.length > 0 ? medications : null,
    researchConsent: options.researchConsent,
    uploadedAt: null,
    serverId: null,
  }

  return {
    document: doc,
    piiDetected: detectedTypes.length > 0,
    piiTypes: detectedTypes,
    replacementCount,
  }
}

// ─────────────────────────────────────────────────────────────
// SAVE
// Writes doc to FileSystem and updates the AsyncStorage index
// ─────────────────────────────────────────────────────────────
export async function saveDocument(doc: LocalDocument): Promise<void> {
  await ensureDocsDir()
  await FileSystem.writeAsStringAsync(
    docPath(doc.id),
    JSON.stringify(doc),
    { encoding: FileSystem.EncodingType.UTF8 }
  )

  // Update index
  const index = await readIndex()
  const entry: DocumentIndexEntry = {
    id: doc.id,
    documentType: doc.documentType,
    documentDate: doc.documentDate,
    createdAt: doc.createdAt,
    uploadedAt: doc.uploadedAt,
  }
  const filtered = index.filter(e => e.id !== doc.id) // replace if re-saving
  await writeIndex([...filtered, entry])
}

// ─────────────────────────────────────────────────────────────
// LOAD
// ─────────────────────────────────────────────────────────────
export async function loadDocument(id: string): Promise<LocalDocument | null> {
  const path = docPath(id)
  const info = await FileSystem.getInfoAsync(path)
  if (!info.exists) return null

  const raw = await FileSystem.readAsStringAsync(path, {
    encoding: FileSystem.EncodingType.UTF8,
  })
  try {
    return JSON.parse(raw) as LocalDocument
  } catch {
    return null
  }
}

export async function listDocuments(): Promise<DocumentIndexEntry[]> {
  const index = await readIndex()
  return index.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

// ─────────────────────────────────────────────────────────────
// DELETE
// Removes the file and the index entry
// ─────────────────────────────────────────────────────────────
export async function deleteDocument(id: string): Promise<void> {
  const path = docPath(id)
  const info = await FileSystem.getInfoAsync(path)
  if (info.exists) {
    await FileSystem.deleteAsync(path, { idempotent: true })
  }
  const index = await readIndex()
  await writeIndex(index.filter(e => e.id !== id))
}

export async function deleteAllDocuments(): Promise<void> {
  const index = await readIndex()
  await Promise.all(index.map(e => deleteDocument(e.id)))
}

// ─────────────────────────────────────────────────────────────
// UPLOAD
// Sends the clean payload to the Supabase Edge Function.
// Call only after the user is authenticated (token required).
// Updates the local doc record with serverId + uploadedAt on success.
// ─────────────────────────────────────────────────────────────
export async function uploadDocument(
  doc: LocalDocument,
  options: {
    supabaseUrl: string
    accessToken: string
    birthYear: number | null
    country: string | null
  }
): Promise<{ serverId: string }> {
  const payload: DocumentUploadPayload = {
    documentType: doc.documentType,
    documentDate: doc.documentDate,
    cleanText: doc.cleanText,
    labValues: doc.labValues,
    medications: doc.medications,
    researchConsent: doc.researchConsent,
    birthYear: options.birthYear,
    country: options.country,
  }

  const response = await fetch(
    `${options.supabaseUrl}/functions/v1/documents`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${options.accessToken}`,
      },
      body: JSON.stringify(payload),
    }
  )

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error ?? `Upload failed with status ${response.status}`)
  }

  const { document: serverDoc } = await response.json()
  const serverId: string = serverDoc.id

  // Persist upload metadata locally so we don't re-upload
  const updated: LocalDocument = {
    ...doc,
    serverId,
    uploadedAt: new Date().toISOString(),
  }
  await saveDocument(updated)

  return { serverId }
}

// ─────────────────────────────────────────────────────────────
// UPLOAD PENDING
// Uploads all local documents that have not yet been sent to the server.
// Call after sign-up or when the user grants research consent.
// ─────────────────────────────────────────────────────────────
export async function uploadPendingDocuments(
  options: {
    supabaseUrl: string
    accessToken: string
    birthYear: number | null
    country: string | null
  }
): Promise<{ uploaded: number; failed: number }> {
  const index = await listDocuments()
  const pending = index.filter(e => !e.uploadedAt)

  let uploaded = 0
  let failed = 0

  for (const entry of pending) {
    const doc = await loadDocument(entry.id)
    if (!doc) continue

    try {
      await uploadDocument(doc, options)
      uploaded++
    } catch (err) {
      console.warn(`Failed to upload document ${entry.id}:`, err)
      failed++
    }
  }

  return { uploaded, failed }
}

// ─────────────────────────────────────────────────────────────
// UTIL
// ─────────────────────────────────────────────────────────────
function generateId(): string {
  // RFC4122 v4 UUID via crypto — available in React Native's Hermes engine
  // Falls back to timestamp-based ID if crypto is unavailable
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
