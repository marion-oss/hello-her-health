// Anoqi — Starter prompt card (v2.2 light register).
//
// White card with a Sand hairline, fuchsia hover ring, Bricolage 700 body.
// Card height grows with content, stacks 1-up on phones and 2-up at
// ≥ 520px viewport.

import React, { useEffect, useState } from 'react'
import { Platform, Pressable, useWindowDimensions } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated'

import { Text } from '../../components'
import { palette, useTheme } from '../../theme'
import { easing } from '../../theme/motion'

const TWO_UP_BREAKPOINT = 520
const SMALL_TYPE_BREAKPOINT = 380

export interface StarterCardProps {
  text: string
  index: number
  onPress: () => void
}

export function StarterCard({ text, index, onPress }: StarterCardProps) {
  const theme = useTheme()
  const { width } = useWindowDimensions()
  const reduceMotion = useReducedMotion()

  const twoUp = width >= TWO_UP_BREAKPOINT
  const smallType = width < SMALL_TYPE_BREAKPOINT

  const [hovered, setHovered] = useState(false)

  // Stagger fade-up entrance. Each card 60ms after the previous. 320ms
  // outQuart matches Anoqi's motion tokens.
  const enter = useSharedValue(reduceMotion ? 1 : 0)
  useEffect(() => {
    if (reduceMotion) {
      enter.value = 1
      return
    }
    enter.value = withDelay(
      index * 60,
      withTiming(1, { duration: 320, easing: easing.outQuart }),
    )
  }, [enter, index, reduceMotion])

  const enterStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 8 }],
  }))

  return (
    <Animated.View
      style={[
        {
          flexGrow: 1,
          flexBasis: twoUp ? '47%' : '100%',
          borderRadius: 22,
          minHeight: 88,
        },
        enterStyle,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={text}
        onPress={onPress}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={({ pressed }) => [
          {
            flex: 1,
            backgroundColor: pressed
              ? palette.petal[100]
              : '#ffffff',
            borderWidth: 1.5,
            borderColor: hovered
              ? palette.fuchsia[500]
              : palette.sand[300],
            borderRadius: 22,
            paddingVertical: theme.spacing[5],
            paddingHorizontal: theme.spacing[4],
            justifyContent: 'center',
            transform: [{ scale: pressed ? 0.97 : 1 }],
          },
          Platform.OS === 'web'
            ? ({
                transitionProperty: 'transform, background-color, border-color',
                transitionDuration: '200ms',
                transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
                ...(hovered
                  ? { boxShadow: '0 4px 14px rgba(255, 4, 114, 0.10)' }
                  : null),
              } as any)
            : null,
        ]}
      >
        <Text
          style={[
            {
              fontFamily: 'BricolageGrotesque-Bold',
              color: theme.colors.text.primary,
              fontSize: smallType ? 18 : 20,
              lineHeight: smallType ? 22 : 26,
              letterSpacing: -0.2,
            },
            Platform.OS === 'web' ? ({ textWrap: 'balance' } as any) : null,
          ]}
        >
          {text}
        </Text>
      </Pressable>
    </Animated.View>
  )
}
