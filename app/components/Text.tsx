// Anoqi — Text component. All typography flows through here.

import React from 'react'
import {
  Text as RNText,
  type TextProps as RNTextProps,
  type TextStyle,
  type StyleProp,
} from 'react-native'

import { useTheme, type TypographyVariant } from '../theme'

type Tone = 'primary' | 'secondary' | 'tertiary' | 'inverse' | 'accent' | 'danger'

type Props = RNTextProps & {
  variant?: TypographyVariant
  tone?: Tone
  align?: 'left' | 'center' | 'right'
  style?: StyleProp<TextStyle>
  children: React.ReactNode
}

export function Text({
  variant = 'body',
  tone = 'primary',
  align,
  style,
  children,
  ...rest
}: Props) {
  const theme = useTheme()
  const typo = theme.typography[variant]
  const color = theme.colors.text[tone]
  return (
    <RNText
      {...rest}
      style={[typo, { color }, align ? { textAlign: align } : null, style]}
    >
      {children}
    </RNText>
  )
}
