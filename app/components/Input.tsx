// Anoqi — Input. Sage focus ring, peony for errors, floating label optional.

import React, { useState } from 'react'
import {
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
  type StyleProp,
} from 'react-native'

import { useTheme } from '../theme'
import { Text } from './Text'

type Props = TextInputProps & {
  label?: string
  helper?: string
  error?: string
  style?: StyleProp<ViewStyle>
}

export function Input({ label, helper, error, style, ...rest }: Props) {
  const theme = useTheme()
  const [focused, setFocused] = useState(false)
  const hasError = !!error

  const borderColor = hasError
    ? theme.colors.border.danger
    : focused
    ? theme.colors.border.focus
    : theme.colors.border.default

  return (
    <View style={style}>
      {label ? (
        <Text variant="label" tone="secondary" style={{ marginBottom: theme.spacing[2] }}>
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={theme.colors.text.placeholder}
        {...rest}
        onFocus={(e) => {
          setFocused(true)
          rest.onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          rest.onBlur?.(e)
        }}
        style={[
          {
            borderWidth: 1.5,
            borderColor,
            borderRadius: theme.radii.md,
            paddingHorizontal: theme.spacing[4],
            paddingVertical:   theme.spacing[3],
            color: theme.colors.text.primary,
            backgroundColor: theme.colors.bg.surface,
            ...theme.typography.body,
          },
        ]}
      />
      {hasError ? (
        <Text variant="caption" tone="danger" style={{ marginTop: theme.spacing[2] }}>
          {error}
        </Text>
      ) : helper ? (
        <Text variant="caption" tone="tertiary" style={{ marginTop: theme.spacing[2] }}>
          {helper}
        </Text>
      ) : null}
    </View>
  )
}
