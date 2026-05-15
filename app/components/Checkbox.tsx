// Anoqi — Checkbox. Sage border, peony check when active.

import React from 'react'
import { Pressable, View } from 'react-native'

import { useTheme } from '../theme'
import { Icon } from './Icon'

type Props = {
  checked: boolean
  onChange: (next: boolean) => void
  size?: number
  accessibilityLabel?: string
}

export function Checkbox({ checked, onChange, size = 24, accessibilityLabel }: Props) {
  const theme = useTheme()
  const bg = checked ? theme.colors.accent.primary : theme.colors.bg.surface
  const border = checked ? theme.colors.accent.primary : theme.colors.border.default

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
      onPress={() => onChange(!checked)}
      hitSlop={8}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: theme.radii.sm,
          borderWidth: 1.5,
          borderColor: border,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked ? (
          <Icon
            name="Check"
            size={size * 0.66}
            color={theme.colors.accent.primaryOnText}
            strokeWidth={2.5}
          />
        ) : null}
      </View>
    </Pressable>
  )
}
