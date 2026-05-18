// Anoqi — shadows.
//
// Anoqi is dark-only. Shadows are ember-tinted on Void canvas — black shadows
// on a warm dark would muddy the room. The tint sits just below the surface,
// barely registers, gives layers a subtle warmth at depth.
// RN: shadow* on iOS, elevation on Android, web inherits iOS shape.

import { Platform, type ViewStyle } from 'react-native'
import { palette } from './colors'

const emberTint = palette.ember[900]   // deep warm tint
const voidTint  = palette.void[900]    // bottom-of-room

export type ShadowLevel = 'sm' | 'md' | 'lg' | 'xl'

const CONFIG: Record<ShadowLevel, {
  offset: { width: number; height: number }
  radius: number
  opacity: number
  elevation: number
}> = {
  sm: { offset: { width: 0, height: 1 },  radius: 2,  opacity: 0.18, elevation: 1 },
  md: { offset: { width: 0, height: 4 },  radius: 14, opacity: 0.28, elevation: 3 },
  lg: { offset: { width: 0, height: 10 }, radius: 24, opacity: 0.38, elevation: 8 },
  xl: { offset: { width: 0, height: 18 }, radius: 40, opacity: 0.48, elevation: 14 },
}

export function shadow(level: ShadowLevel, mode: 'light' | 'dark' = 'dark'): ViewStyle {
  const c = CONFIG[level]
  const tint = mode === 'light' ? emberTint : voidTint
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
