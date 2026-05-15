// Anoqi — BackHeader. Used on screens with a parent route. Chevron + wordmark
// (with the brand-deck pulsing fuchsia dot) and an optional right slot.

import React from 'react'
import { Pressable, View } from 'react-native'

import { useTheme } from '../theme'
import { Icon } from './Icon'
import { Wordmark } from './Wordmark'

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
            <Icon name="ChevronLeft" size={22} color={theme.colors.text.secondary} />
          </Pressable>
        ) : null}
        {showWordmark ? <Wordmark size={20} /> : null}
      </View>
      {rightSlot}
    </View>
  )
}
