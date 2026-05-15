// Anoqi — SectionTitle. Small-caps eyebrow in teal, consistent across screens.

import React from 'react'
import { View } from 'react-native'

import { useTheme } from '../theme'
import { Text } from './Text'

type Props = {
  label: string
  rightSlot?: React.ReactNode
}

export function SectionTitle({ label, rightSlot }: Props) {
  const theme = useTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing[3],
      }}
    >
      <Text
        variant="eyebrow"
        tone="secondary"
        style={{ textTransform: 'uppercase' }}
      >
        {label}
      </Text>
      {rightSlot}
    </View>
  )
}
