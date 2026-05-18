/**
 * anoqi — OnboardingContext
 *
 * Shared state across the onboarding flow.
 * Persists language and objective so any screen can read them.
 * Cleared once onboarding is complete.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type Language = 'fr' | 'en'

export type HealthObjective =
  | 'symptoms'        // Understanding my symptoms
  | 'contraception'   // Contraception guidance
  | 'menopause'       // Menopause support
  | 'fertility'       // Fertility questions
  | 'general'         // General women's health

type OnboardingState = {
  language: Language
  objective: HealthObjective | null
  birthYear: number | null
  country: string | null
  /**
   * Stable anonymous session ID used to authenticate against /chat when the
   * user hasn't signed up. Generated lazily on first read, persisted to
   * AsyncStorage. Stays the same across reloads so conversations stick.
   */
  sessionId: string
  setLanguage:  (lang: Language) => void
  setObjective: (obj: HealthObjective) => void
  setBirthYear: (year: number) => void
  setCountry:   (country: string) => void
  /**
   * Call this when onboarding is complete (AccountScreen sign-up, login,
   * or anonymous path). Triggers the navigator swap in App.tsx.
   */
  markDone: () => void
}

type ProviderProps = {
  children:    ReactNode
  /** Called by markDone() — wired in App.tsx to swap navigators */
  onComplete?: () => void
}

const OnboardingContext = createContext<OnboardingState | null>(null)

const LANGUAGE_KEY  = 'anoqi_language'
const OBJECTIVE_KEY = 'anoqi_objective'
const SESSION_ID_KEY = 'anoqi_session_id'

const VALID_OBJECTIVES: ReadonlyArray<HealthObjective> = [
  'symptoms', 'contraception', 'menopause', 'fertility', 'general',
]

// RFC 4122 v4 UUID. Avoids pulling a uuid lib; works on web and native.
// Uses globalThis.crypto where available, falls back to Math.random.
function generateSessionId(): string {
  const g: any = typeof globalThis !== 'undefined' ? (globalThis as any) : {}
  if (g.crypto?.randomUUID) return g.crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function OnboardingProvider({ children, onComplete }: ProviderProps) {
  const [language, setLanguageState]   = useState<Language>('fr')
  const [objective, setObjectiveState] = useState<HealthObjective | null>(null)
  const [birthYear, setBirthYear]      = useState<number | null>(null)
  const [country, setCountry]          = useState<string | null>(null)
  // Seed synchronously so the first render already has a valid sessionId.
  // The rehydration effect below replaces it with the persisted one if any.
  const [sessionId, setSessionId]      = useState<string>(() => generateSessionId())

  // Rehydrate persisted prefs on mount. Anything user-visible across sessions
  // (language + objective) writes through AsyncStorage so the Home pill and
  // Chat starter set survive a reload after onboarding. sessionId is also
  // persisted so anonymous /chat conversations stick across reloads.
  useEffect(() => {
    (async () => {
      try {
        const [lang, obj, persistedSession] = await Promise.all([
          AsyncStorage.getItem(LANGUAGE_KEY),
          AsyncStorage.getItem(OBJECTIVE_KEY),
          AsyncStorage.getItem(SESSION_ID_KEY),
        ])
        if (lang === 'fr' || lang === 'en') setLanguageState(lang)
        if (obj && VALID_OBJECTIVES.includes(obj as HealthObjective)) {
          setObjectiveState(obj as HealthObjective)
        }
        if (persistedSession) {
          setSessionId(persistedSession)
        } else {
          // First run: write the synchronously-generated id so it survives.
          AsyncStorage.setItem(SESSION_ID_KEY, sessionId).catch(() => {})
        }
      } catch {
        // Non-fatal: defaults are fine.
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function setLanguage(lang: Language) {
    setLanguageState(lang)
    AsyncStorage.setItem(LANGUAGE_KEY, lang).catch(() => {})
  }

  function setObjective(obj: HealthObjective) {
    setObjectiveState(obj)
    AsyncStorage.setItem(OBJECTIVE_KEY, obj).catch(() => {})
  }

  function markDone() {
    onComplete?.()
  }

  return (
    <OnboardingContext.Provider value={{
      language, objective, birthYear, country, sessionId,
      setLanguage, setObjective, setBirthYear, setCountry,
      markDone,
    }}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding(): OnboardingState {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error('useOnboarding must be used inside OnboardingProvider')
  return ctx
}
