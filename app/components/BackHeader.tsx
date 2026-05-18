// Anoqi — BackHeader. Used on screens with a parent route. Chevron + wordmark
// (with the brand-deck pulsing fuchsia dot) and an optional right slot.

import React from 'react'
import { Pressable, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'

import { hover, useTheme } from '../theme'
import { Icon } from './Icon'
import { Wordmark } from './Wordmark'

type Props = {
  onBack?: () => void
  rightSlot?: React.ReactNode
  showWordmark?: boolean
}

export function BackHeader({ onBack, rightSlot, showWordmark = true }: Props) {
  const theme = useTheme()
  const navigation = useNavigation<any>()

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
            style={({ hovered }: any) => [
              { marginRight: theme.spacing[3] },
              hover.transition,
              hovered && { opacity: 0.75, transform: [{ translateX: -1 }] },
            ]}
          >
            <Icon name="ChevronLeft" size={22} color={theme.colors.text.secondary} />
          </Pressable>
        ) : null}
        {showWordmark ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Home"
            onPress={() => navigation.navigate('Home')}
            hitSlop={8}
            style={({ pressed, hovered }: any) => ({
              opacity: pressed ? 0.6 : hovered ? 0.85 : 1,
              transform: pressed ? [{ scale: 0.97 }] : undefined,
            })}
          >
            <Wordmark size={20} />
          </Pressable>
        ) : null}
      </View>
      {rightSlot}
    </View>
  )
}
