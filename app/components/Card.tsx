// Anoqi — Card.
//
// Two languages only: quiet (1px sage border, rose-tinted bg, no shadow)
// and lifted (sage-tinted shadow, no border).

import React from 'react'
import { View, type ViewStyle, type StyleProp } from 'react-native'

import { useTheme } from '../theme'

type Props = {
  variant?: 'quiet' | 'lifted'
  padding?: number
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
}

export function Card({ variant = 'quiet', padding, children, style }: Props) {
  const theme = useTheme()

  const base: ViewStyle = {
    borderRadius: theme.radii.lg,
    padding: padding ?? theme.spacing[5],
  }

  if (variant === 'quiet') {
    return (
      <View
        style={[
          base,
          {
            backgroundColor: theme.colors.bg.surfaceMuted,
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
