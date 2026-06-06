/**
 * anoqi — Pathway registry
 *
 * The single place that knows which pathway modules exist. Two responsibilities:
 *   1. Resolve a (PathwayKey, Language) → PathwayModule.
 *   2. Derive the SymptomRegistry by walking every module's declaredSymptoms.
 *
 * Nobody authors the SymptomRegistry directly — it emerges from declarations.
 * The moment a new pathway module is added to ALL_PATHWAYS, the registry gains
 * its symptoms and differential awareness becomes available with no other
 * change (see PATHWAYS.md primitive #2).
 */
import type { Language, PathwayKey, PathwayModule, SymptomRegistry } from './types'
import { contraceptionFr } from './contraception.fr'
import { contraceptionEn } from './contraception.en'

/** Every loaded module. Add a new pathway by appending its fr + en modules. */
const ALL_PATHWAYS: PathwayModule[] = [
  contraceptionFr,
  contraceptionEn,
]

/** Resolve a pathway module for a key + language. Falls back to the FR module
 *  if the requested language isn't authored yet (FR is canonical). Returns
 *  undefined if the key is unknown. */
export function getPathway(key: PathwayKey, language: Language): PathwayModule | undefined {
  return (
    ALL_PATHWAYS.find(m => m.key === key && m.language === language) ??
    ALL_PATHWAYS.find(m => m.key === key && m.language === 'fr')
  )
}

/** Keys that currently route (i.e. have at least one loaded module). Used by
 *  the classifier to constrain its output to pathways that actually exist. */
export function loadedPathwayKeys(): PathwayKey[] {
  const seen = new Set<PathwayKey>()
  for (const m of ALL_PATHWAYS) seen.add(m.key)
  return [...seen]
}

/** Built from declarations. Memoised — the module set is static at runtime. */
let cachedRegistry: SymptomRegistry | null = null

export function buildSymptomRegistry(modules: PathwayModule[]): SymptomRegistry {
  const reg: SymptomRegistry = {}
  for (const m of modules) {
    for (const sym of m.declaredSymptoms) {
      const list = reg[sym] ?? (reg[sym] = [])
      if (!list.includes(m.key)) list.push(m.key)
    }
  }
  return reg
}

export function getSymptomRegistry(): SymptomRegistry {
  if (!cachedRegistry) cachedRegistry = buildSymptomRegistry(ALL_PATHWAYS)
  return cachedRegistry
}
