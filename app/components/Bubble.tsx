// Anoqi — chat Bubble (v2.2 light register).
//
//   user      — solid Fuchsia, white text.
//   assistant — white surface, Sand hairline.
//
// The notch radius is preserved on the trailing edge for spatial cohesion.

import React from 'react'
import { View, type ViewStyle, type StyleProp } from 'react-native'

import { palette, useTheme } from '../theme'

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
    maxWidth: '86%',
  }

  if (isUser) {
    return (
      <View
        style={[
          base,
          {
            alignSelf: 'flex-end',
            backgroundColor: palette.fuchsia[500],
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
          backgroundColor: '#ffffff',
          borderWidth: 1,
          borderColor: palette.sand[300],
          borderBottomLeftRadius: theme.radii.bubbleNotch,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}
