/**
 * anoqi — DocumentStorage (web)
 *
 * Stores each document as a JSON string in an IndexedDB object store at
 * database `anoqi`, store `documents`, keyed by document id.
 *
 * Capacity: IndexedDB quota is per-origin and typically multi-GB
 * (50–60% of free disk on Chromium/Firefox; ~1 GB on iOS Safari, growable
 * via navigator.storage.persist() once the user installs the PWA). Far
 * beyond what the feedback phase needs.
 *
 * Metro selects this file when bundling for web. iOS/Android use
 * documentStorage.ts.
 */
import { openDB, type IDBPDatabase } from 'idb'
import type { DocumentStorage } from './types'

const DB_NAME = 'anoqi'
const DB_VERSION = 1
const STORE_NAME = 'documents'

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb(): Promise<IDBPDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available in this environment'))
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      },
    })
  }
  return dbPromise
}

export const storage: DocumentStorage = {
  async writeDocument(id, json) {
    const db = await getDb()
    await db.put(STORE_NAME, json, id)
  },

  async readDocument(id) {
    const db = await getDb()
    const value = await db.get(STORE_NAME, id)
    return typeof value === 'string' ? value : null
  },

  async deleteDocument(id) {
    const db = await getDb()
    await db.delete(STORE_NAME, id)
  },

  async hasDocument(id) {
    const db = await getDb()
    const key = await db.getKey(STORE_NAME, id)
    return key !== undefined
  },
}
