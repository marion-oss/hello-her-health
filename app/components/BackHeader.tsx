// Anoqi — BackHeader. Used on screens with a parent route. Chevron + wordmark.

import React from 'react'
import { Pressable, View } from 'react-native'

import { useTheme } from '../theme'
import { Icon } from './Icon'
import { Text } from './Text'

type Props = {
  onBack?: () => void
  rightSlot?: React.ReactNode
  showWordmark?: boolean
}

export function BackHeader({ onBack, rightSlot, showWordmark = true }: Props) {
  const theme = useTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing[5],
        paddingVertical: theme.spacing[3],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={onBack}
            hitSlop={12}
            style={{ marginRight: theme.spacing[3] }}
          >
            <Icon name="ChevronLeft" size={24} color={theme.colors.text.secondary} />
          </Pressable>
        ) : null}
        {showWordmark ? (
          <Text
            variant="h2Italic"
            style={{ color: theme.colors.text.primary, fontSize: 22, lineHeight: 26 }}
          >
            anoqi
          </Text>
        ) : null}
      </View>
      {rightSlot}
    </View>
  )
}
