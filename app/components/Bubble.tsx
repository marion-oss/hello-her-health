// Anoqi — chat Bubble.
//
// Iridescent register:
//   user      — Fuchsia at high alpha, warm-white text.
//   assistant — frosted glass (warm-white at low alpha + warm-white-alpha
//               border); web gets backdrop-filter so the LiquidEmber layer
//               glows through.
//
// The notch radius is preserved on the trailing edge for spatial cohesion.

import React from 'react'
import { Platform, View, type ViewStyle, type StyleProp } from 'react-native'

import { useTheme } from '../theme'

type Props = {
  role: 'user' | 'assistant'
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
}

const webBackdrop = Platform.OS === 'web'
  ? ({
      backdropFilter: 'blur(18px) saturate(140%)',
      WebkitBackdropFilter: 'blur(18px) saturate(140%)',
    } as unknown as ViewStyle)
  : null

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
            backgroundColor: 'rgba(255, 4, 114, 0.85)',
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
          backgroundColor: 'rgba(255, 245, 238, 0.05)',
          borderWidth: 1,
          borderColor: 'rgba(255, 245, 238, 0.09)',
          borderBottomLeftRadius: theme.radii.bubbleNotch,
        },
        webBackdrop,
        style,
      ]}
    >
      {children}
    </View>
  )
}
