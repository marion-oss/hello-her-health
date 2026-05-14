// Anoqi — chat Bubble. User (peony fill) or Anoqi (white, rose-bordered).

import React from 'react'
import { View, type ViewStyle, type StyleProp } from 'react-native'

import { useTheme } from '../theme'

type Props = {
  role: 'user' | 'assistant'
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
}

export function Bubble({ role, children, style }: Props) {
  const theme = useTheme()
  const isUser = role === 'user'

  const base: ViewStyle = {
    borderRadius: theme.radii.bubble,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    maxWidth: '82%',
  }

  if (isUser) {
    return (
      <View
        style={[
          base,
          {
            alignSelf: 'flex-end',
            backgroundColor: theme.colors.accent.primary,
            borderBottomRightRadius: theme.radii.bubbleNotch,
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
          alignSelf: 'flex-start',
          backgroundColor: theme.colors.bg.surface,
          borderWidth: 1,
          borderColor: theme.colors.border.subtle,
          borderBottomLeftRadius: theme.radii.bubbleNotch,
          ...theme.shadow('sm'),
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}
