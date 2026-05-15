// Anoqi — Avatar. Sage circle with the bloom glyph or an initial.

import React from 'react'
import { View } from 'react-native'

import { useTheme } from '../theme'
import { Text } from './Text'
import { PeonyBloom } from './PeonyBloom'

type Props = {
  /** If provided, renders the initial. Else renders the bloom glyph. */
  initial?: string
  size?: number
  tone?: 'sage' | 'rose' | 'teal'
}

export function Avatar({ initial, size = 36, tone = 'sage' }: Props) {
  const theme = useTheme()
  const bgPalette = {
    sage: theme.colors.accent.successSurface,
    rose: theme.colors.bg.surfaceMuted,
    teal: theme.colors.accent.infoSurface,
  }
  const bg = bgPalette[tone]

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {initial ? (
        <Text
          variant={size >= 40 ? 'h4' : 'label'}
          style={{ color: theme.colors.text.secondary }}
        >
          {initial}
        </Text>
      ) : (
        <PeonyBloom size={size * 0.75} variant="full" />
      )}
    </View>
  )
}
