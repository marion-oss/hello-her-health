/**
 * anoqi — OnboardingContext
 *
 * Shared state across the onboarding flow.
 * Persists language and objective so any screen can read them.
 * Cleared once onboarding is complete.
 */

import React, { createContext, useContext, useState, ReactNode } from 'react'

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
  setLanguage: (lang: Language) => void
  setObjective: (obj: HealthObjective) => void
  setBirthYear: (year: number) => void
  setCountry: (country: string) => void
}

const OnboardingContext = createContext<OnboardingState | null>(null)

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('fr')
  const [objective, setObjective] = useState<HealthObjective | null>(null)
  const [birthYear, setBirthYear] = useState<number | null>(null)
  const [country, setCountry] = useState<string | null>(null)

  return (
    <OnboardingContext.Provider value={{
      language, objective, birthYear, country,
      setLanguage, setObjective, setBirthYear, setCountry,
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
