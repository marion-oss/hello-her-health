// Anoqi — Card.
//
// Three variants for the iridescent register:
//   quiet     — flat Surface with a hairline Dusk border. No shadow.
//   lifted    — Surface with sage-tinted shadow. Used sparingly.
//   glass     — frosted Surface alpha + 1px warm-white-alpha border. On web
//               we add `backdrop-filter: blur(20px)` so the LiquidEmber layer
//               underneath shows through softly; native gets the same alpha
//               composition without the blur (acceptable, the ember motion
//               still reads).
//
// If a screen wants the slow liquid warmth under the card, it wraps the
// LiquidEmber inside the same View and lets Card sit on top:
//
//   <View style={{ borderRadius: 22, overflow: 'hidden' }}>
//     <LiquidEmber />
//     <Card variant="glass">{...}</Card>
//   </View>

import React from 'react'
import { Platform, View, type ViewStyle, type StyleProp } from 'react-native'

import { useTheme } from '../theme'

type Props = {
  variant?: 'quiet' | 'lifted' | 'glass'
  padding?: number
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
}

const webBackdrop = Platform.OS === 'web'
  ? ({
      backdropFilter: 'blur(20px) saturate(140%)',
      WebkitBackdropFilter: 'blur(20px) saturate(140%)',
    } as unknown as ViewStyle)
  : null

export function Card({ variant = 'quiet', padding, children, style }: Props) {
  const theme = useTheme()

  const base: ViewStyle = {
    borderRadius: theme.radii.lg,
    padding: padding ?? theme.spacing[5],
  }

  if (variant === 'glass') {
    return (
      <View
        style={[
          base,
          {
            backgroundColor: 'rgba(255, 245, 238, 0.05)',
            borderWidth: 1,
            borderColor: 'rgba(255, 245, 238, 0.09)',
          },
          webBackdrop,
          style,
        ]}
      >
        {children}
      </View>
    )
  }

  if (variant === 'quiet') {
    return (
      <View
        style={[
          base,
          {
            backgroundColor: theme.colors.bg.surface,
            borderWidth: 1,
            borderColor: theme.colors.border.subtle,
          },
          style,
        ]}
      >
        {children}
      </View>
    )
  }

  return (
    <View
      style={[
        base,
        {
          backgroundColor: theme.colors.bg.surface,
          borderRadius: theme.radii.lg,
          ...theme.shadow('md'),
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}
