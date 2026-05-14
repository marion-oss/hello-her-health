// Anoqi — shadows.
//
// Shadows are sage/teal-tinted, not black. Black shadows on warm surfaces are
// the AI-slop tell. RN: shadow* on iOS, elevation on Android, web inherits iOS shape.

import { Platform, type ViewStyle } from 'react-native'
import { palette } from './colors'

const tintLight = palette.teal[600]
const tintDark  = palette.ink[950]

export type ShadowLevel = 'sm' | 'md' | 'lg' | 'xl'

const CONFIG: Record<ShadowLevel, {
  offset: { width: number; height: number }
  radius: number
  opacity: number
  elevation: number
}> = {
  sm: { offset: { width: 0, height: 1 }, radius: 2,  opacity: 0.04, elevation: 1 },
  md: { offset: { width: 0, height: 4 }, radius: 14, opacity: 0.07, elevation: 3 },
  lg: { offset: { width: 0, height: 10 }, radius: 24, opacity: 0.10, elevation: 8 },
  xl: { offset: { width: 0, height: 18 }, radius: 40, opacity: 0.14, elevation: 14 },
}

export function shadow(level: ShadowLevel, mode: 'light' | 'dark' = 'light'): ViewStyle {
  const c = CONFIG[level]
  const tint = mode === 'dark' ? tintDark : tintLight
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor:  tint,
      shadowOffset: c.offset,
      shadowRadius: c.radius,
      shadowOpacity: c.opacity,
    },
    android: {
      elevation:   c.elevation,
      shadowColor: tint,
    },
    default: {
      shadowColor:   tint,
      shadowOffset:  c.offset,
      shadowRadius:  c.radius,
      shadowOpacity: c.opacity,
    },
  })!
}
