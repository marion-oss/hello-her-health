// Anoqi — Pill. For status tags, focus indicators, optional flags.

import React from 'react'
import { View, Pressable, type ViewStyle, type StyleProp } from 'react-native'

import { useTheme } from '../theme'
import { Text } from './Text'

type Tone = 'rose' | 'sage' | 'teal' | 'peony' | 'celebration'

type Props = {
  label: string
  tone?: Tone
  leftAdornment?: React.ReactNode
  onPress?: () => void
  style?: StyleProp<ViewStyle>
}

export function Pill({ label, tone = 'rose', leftAdornment, onPress, style }: Props) {
  const theme = useTheme()
  const palette: Record<Tone, { bg: string; text: string; border: string }> = {
    rose: {
      bg:     theme.colors.bg.surfaceMuted,
      text:   theme.colors.text.accent,
      border: theme.colors.border.subtle,
    },
    sage: {
      bg:     theme.colors.accent.successSurface,
      text:   theme.colors.accent.success,
      border: 'transparent',
    },
    teal: {
      bg:     theme.colors.accent.infoSurface,
      text:   theme.colors.accent.info,
      border: 'transparent',
    },
    peony: {
      bg:     theme.colors.accent.primary,
      text:   theme.colors.accent.primaryOnText,
      border: 'transparent',
    },
    celebration: {
      bg:     theme.colors.accent.celebration,
      text:   theme.colors.text.inverse,
      border: 'transparent',
    },
  }
  const c = palette[tone]

  const inner = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: c.bg,
          borderWidth: c.border === 'transparent' ? 0 : 1,
          borderColor: c.border,
          borderRadius: theme.radii.pill,
          paddingVertical: theme.spacing[2],
          paddingHorizontal: theme.spacing[4],
        },
        style,
      ]}
    >
      {leftAdornment ? <View style={{ marginRight: theme.spacing[2] }}>{leftAdornment}</View> : null}
      <Text variant="label" style={{ color: c.text }}>
        {label}
      </Text>
    </View>
  )

  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress}>
        {inner}
      </Pressable>
    )
  }
  return inner
}
