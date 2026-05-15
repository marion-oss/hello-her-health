// Anoqi — EmptyState. Peony glyph + copy + optional CTA slot.

import React from 'react'
import { View, type ViewStyle, type StyleProp } from 'react-native'

import { useTheme } from '../theme'
import { Text } from './Text'
import { PeonyBloom } from './PeonyBloom'

type Props = {
  title: string
  body?: string
  ctaSlot?: React.ReactNode
  style?: StyleProp<ViewStyle>
}

export function EmptyState({ title, body, ctaSlot, style }: Props) {
  const theme = useTheme()
  return (
    <View
      style={[
        {
          alignItems: 'center',
          paddingVertical: theme.spacing[8],
          paddingHorizontal: theme.spacing[5],
        },
        style,
      ]}
    >
      <PeonyBloom size={56} />
      <Text
        variant="h4"
        tone="primary"
        align="center"
        style={{ marginTop: theme.spacing[4] }}
      >
        {title}
      </Text>
      {body ? (
        <Text
          variant="body"
          tone="secondary"
          align="center"
          style={{
            marginTop: theme.spacing[2],
            maxWidth: 280,
          }}
        >
          {body}
        </Text>
      ) : null}
      {ctaSlot ? <View style={{ marginTop: theme.spacing[5] }}>{ctaSlot}</View> : null}
    </View>
  )
}
