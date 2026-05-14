/**
 * anoqi — DocumentStorage (native default)
 *
 * Stores each document as a JSON file at:
 *   ${FileSystem.documentDirectory}anoqi/documents/<id>.json
 *
 * Metro selects this file on iOS and Android. The web build uses
 * documentStorage.web.ts.
 */
import * as FileSystem from 'expo-file-system/legacy'
import type { DocumentStorage } from './types'

const DOCS_DIR = `${FileSystem.documentDirectory}anoqi/documents/`

async function ensureDocsDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(DOCS_DIR)
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(DOCS_DIR, { intermediates: true })
  }
}

function docPath(id: string): string {
  return `${DOCS_DIR}${id}.json`
}

export const storage: DocumentStorage = {
  async writeDocument(id, json) {
    await ensureDocsDir()
    await FileSystem.writeAsStringAsync(docPath(id), json, {
      encoding: FileSystem.EncodingType.UTF8,
    })
  },

  async readDocument(id) {
    const path = docPath(id)
    const info = await FileSystem.getInfoAsync(path)
    if (!info.exists) return null
    return FileSystem.readAsStringAsync(path, {
      encoding: FileSystem.EncodingType.UTF8,
    })
  },

  async deleteDocument(id) {
    const path = docPath(id)
    const info = await FileSystem.getInfoAsync(path)
    if (info.exists) {
      await FileSystem.deleteAsync(path, { idempotent: true })
    }
  },

  async hasDocument(id) {
    const info = await FileSystem.getInfoAsync(docPath(id))
    return info.exists
  },
}
