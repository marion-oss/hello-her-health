// Anoqi — SourceChip. Small teal pill with a Bookmark icon. Tap to view source.

import React from 'react'
import { Pressable, View } from 'react-native'

import { hover, useTheme } from '../theme'
import { Icon } from './Icon'
import { Text } from './Text'

type Props = {
  label: string
  onPress?: () => void
}

export function SourceChip({ label, onPress }: Props) {
  const theme = useTheme()
  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.accent.infoSurface,
        borderRadius: theme.radii.pill,
        borderWidth: 1,
        borderColor: 'rgba(196, 128, 106, 0.32)',
        paddingVertical: 4,
        paddingHorizontal: theme.spacing[3],
      }}
    >
      <Icon name="Bookmark" size={12} color={theme.colors.accent.info} strokeWidth={1.8} />
      <Text
        variant="caption"
        style={{ color: theme.colors.accent.info, marginLeft: 6 }}
      >
        {label}
      </Text>
    </View>
  )

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="link"
        onPress={onPress}
        hitSlop={6}
        style={({ hovered }: any) => [
          hover.transition,
          hovered && hover.lift,
          hovered && { opacity: 0.9 },
        ]}
      >
        {content}
      </Pressable>
    )
  }
  return content
}
