// Anoqi — ThemeProvider. Wraps the app, exposes light/dark theme via useTheme().
//
// Anoqi is light-only since the v2.2 rebrand. The dark palette is kept in
// place for future contingency (dark-mode surfaces / future opt-in) but no
// screen renders against it today. Passing mode="dark" is still supported.

import React, { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useColorScheme } from 'react-native'

import { lightColors, darkColors, type ColorTokens } from './colors'
import { typography, type TypographyTokens } from './typography'
import { spacing } from './spacing'
import { radii } from './radii'
import { easing, easingCss, duration } from './motion'
import { shadow, type ShadowLevel } from './shadows'

export type ThemeMode = 'light' | 'dark'

export type Theme = {
  mode: ThemeMode
  colors: ColorTokens
  typography: TypographyTokens
  spacing: typeof spacing
  radii: typeof radii
  easing: typeof easing
  easingCss: typeof easingCss
  duration: typeof duration
  shadow: (level: ShadowLevel) => ReturnType<typeof shadow>
}

const buildTheme = (mode: ThemeMode): Theme => ({
  mode,
  colors: mode === 'dark' ? darkColors : lightColors,
  typography,
  spacing,
  radii,
  easing,
  easingCss,
  duration,
  shadow: (level: ShadowLevel) => shadow(level, mode),
})

const ThemeContext = createContext<Theme>(buildTheme('light'))

export function ThemeProvider({ children, mode }: { children: ReactNode; mode?: ThemeMode }) {
  // Default is light per the v2.2 rebrand. Pass mode="dark" only on surfaces
  // explicitly designed for the dark palette.
  const resolvedMode: ThemeMode = mode ?? 'light'
  const value = useMemo(() => buildTheme(resolvedMode), [resolvedMode])
  // Touch useColorScheme so the hook stays subscribed (avoids stale RN warnings).
  useColorScheme()
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = (): Theme => useContext(ThemeContext)
