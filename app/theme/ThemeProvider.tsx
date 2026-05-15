// Anoqi — ThemeProvider. Wraps the app, exposes light/dark theme via useTheme().
//
// The theme value is selected from the OS color scheme. To force a mode in
// development, wrap with <ThemeProvider mode="dark"> directly.

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

const ThemeContext = createContext<Theme>(buildTheme('dark'))

export function ThemeProvider({ children, mode }: { children: ReactNode; mode?: ThemeMode }) {
  // Anoqi is dark-only — OS color scheme is ignored unless the prop says
  // otherwise. lightColors aliases darkColors in colors.ts, so this is also
  // safe if a downstream surface ever passes mode="light".
  const resolvedMode: ThemeMode = mode ?? 'dark'
  const value = useMemo(() => buildTheme(resolvedMode), [resolvedMode])
  // Touch useColorScheme so the hook stays subscribed (avoids stale RN warnings).
  useColorScheme()
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = (): Theme => useContext(ThemeContext)
