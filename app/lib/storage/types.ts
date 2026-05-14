/**
 * anoqi — DocumentStorage interface
 *
 * Opaque blob storage keyed by document id. Each platform implements this
 * (native = expo-file-system, web = localStorage) so documentStore.ts has
 * one code path regardless of where it runs.
 *
 * Privacy invariant: implementations must keep data on-device only. Never
 * substitute remote storage (e.g. Supabase Storage) for this interface —
 * that's the job of uploadDocument() in documentStore.ts and requires
 * explicit consent.
 */
export interface DocumentStorage {
  writeDocument(id: string, json: string): Promise<void>
  readDocument(id: string): Promise<string | null>
  deleteDocument(id: string): Promise<void>
  hasDocument(id: string): Promise<boolean>
}
