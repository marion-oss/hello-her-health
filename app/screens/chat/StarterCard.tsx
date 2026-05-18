// Anoqi — Starter prompt card.
//
// One inscribed card on warm ember glass. No icon — the italic serif
// question is the whole composition. Card height grows with content,
// stacks 1-up on phones and 2-up at ≥ 520px viewport.

import React, { useEffect, useState } from 'react'
import { Platform, Pressable, useWindowDimensions } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated'

import { LiquidEmber, Text } from '../../components'
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

  // Stagger fade-up entrance. Each card 60ms after the previous.
  // 320ms outQuart matches Anoqi's motion tokens; under Emil's 300ms-per-step
  // ceiling for UI animation while still reading as intentional.
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
          overflow: 'hidden',
          position: 'relative',
          minHeight: 88,
        },
        enterStyle,
      ]}
    >
      <LiquidEmber intensity={0.55} fuchsia={false} blur={36} borderRadius={22} />
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
              ? 'rgba(255, 245, 238, 0.10)'
              : hovered
              ? 'rgba(255, 245, 238, 0.075)'
              : 'rgba(255, 245, 238, 0.05)',
            borderWidth: 1,
            borderColor: hovered
              ? 'rgba(255, 245, 238, 0.18)'
              : 'rgba(255, 245, 238, 0.09)',
            borderRadius: 22,
            paddingVertical: theme.spacing[5],
            paddingHorizontal: theme.spacing[4],
            justifyContent: 'center',
            transform: [{ scale: pressed ? 0.97 : 1 }],
          },
          Platform.OS === 'web'
            ? ({
                backdropFilter: 'blur(18px) saturate(140%)',
                WebkitBackdropFilter: 'blur(18px) saturate(140%)',
                transitionProperty: 'transform, background-color, border-color',
                transitionDuration: '200ms',
                transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
              } as any)
            : null,
        ]}
      >
        <Text
          variant="h4Italic"
          style={[
            {
              color: palette.warmWhite[100],
              fontSize: smallType ? 18 : 20,
              lineHeight: smallType ? 22 : 26,
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
