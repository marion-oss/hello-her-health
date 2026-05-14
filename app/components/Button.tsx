// Anoqi — Button.
//
// Variants: primary (peony fill), secondary (sage outline), ghost (text-only).
// Sizes: sm / md / lg. Press feedback: scale 0.97 in 100ms (Emil's rule).

import React, { useRef } from 'react'
import {
  Pressable,
  Animated,
  Easing,
  ActivityIndicator,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native'

import { useTheme } from '../theme'
import { Text } from './Text'

type Variant = 'primary' | 'secondary' | 'ghost' | 'ghostDanger'
type Size = 'sm' | 'md' | 'lg'

type Props = Omit<PressableProps, 'style' | 'children'> & {
  label: string
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  loading?: boolean
  disabled?: boolean
  leftAdornment?: React.ReactNode
  rightAdornment?: React.ReactNode
  style?: StyleProp<ViewStyle>
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  fullWidth,
  loading,
  disabled,
  leftAdornment,
  rightAdornment,
  style,
  ...rest
}: Props) {
  const theme = useTheme()
  const scale = useRef(new Animated.Value(1)).current

  const handlePressIn = () => {
    Animated.timing(scale, {
      toValue: 0.97,
      duration: 100,
      easing: Easing.bezier(0.4, 0, 0.6, 1),
      useNativeDriver: true,
    }).start()
  }
  const handlePressOut = () => {
    Animated.timing(scale, {
      toValue: 1,
      duration: 200,
      easing: theme.easing.outQuart,
      useNativeDriver: true,
    }).start()
  }

  const isDisabled = disabled || loading

  const paddingBySize: Record<Size, { vertical: number; horizontal: number }> = {
    sm: { vertical: 8,  horizontal: 14 },
    md: { vertical: 14, horizontal: 20 },
    lg: { vertical: 18, horizontal: 24 },
  }
  const padding = paddingBySize[size]

  // Map variant → bg / text / border colors
  const styles = (() => {
    switch (variant) {
      case 'primary':
        return {
          bg:     isDisabled ? theme.colors.bg.surfaceWarm : theme.colors.accent.primary,
          border: 'transparent',
          text:   isDisabled ? theme.colors.text.tertiary   : theme.colors.accent.primaryOnText,
        }
      case 'secondary':
        return {
          bg:     'transparent',
          border: theme.colors.border.default,
          text:   isDisabled ? theme.colors.text.tertiary : theme.colors.text.primary,
        }
      case 'ghost':
        return {
          bg:     'transparent',
          border: 'transparent',
          text:   isDisabled ? theme.colors.text.tertiary : theme.colors.text.accent,
        }
      case 'ghostDanger':
        return {
          bg:     'transparent',
          border: 'transparent',
          text:   isDisabled ? theme.colors.text.tertiary : theme.colors.text.danger,
        }
    }
  })()

  return (
    <Animated.View
      style={[
        { transform: [{ scale }], alignSelf: fullWidth ? 'stretch' : 'flex-start' },
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        {...rest}
        style={{
          backgroundColor: styles.bg,
          borderColor:     styles.border,
          borderWidth:     variant === 'secondary' ? 1.5 : 0,
          paddingVertical:   padding.vertical,
          paddingHorizontal: padding.horizontal,
          borderRadius: theme.radii.pill,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isDisabled ? 0.7 : 1,
        }}
      >
        {leftAdornment ? <View style={{ marginRight: 8 }}>{leftAdornment}</View> : null}
        {loading ? (
          <ActivityIndicator size="small" color={styles.text} />
        ) : (
          <Text
            variant={size === 'sm' ? 'label' : 'bodyBold'}
            style={{ color: styles.text }}
          >
            {label}
          </Text>
        )}
        {rightAdornment ? <View style={{ marginLeft: 8 }}>{rightAdornment}</View> : null}
      </Pressable>
    </Animated.View>
  )
}
