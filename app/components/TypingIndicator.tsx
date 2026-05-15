// Anoqi — TypingIndicator.
//
// Three fuchsia dots that wave-bounce up while Anoqi composes a reply. Each
// dot uses the brand-deck breath curve (`cubic-bezier(0.45, 0, 0.55, 1)`)
// and lifts 6px on its peak before settling. Phases are staggered by 180ms
// so the wave reads left-to-right, then loops.

import React, { useEffect } from 'react'
import { View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

import { palette } from '../theme'

const ease = Easing.bezier(0.45, 0, 0.55, 1)
const DURATION = 520

function Dot({ delay }: { delay: number }) {
  const t = useSharedValue(0)

  useEffect(() => {
    t.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: DURATION, easing: ease }),
          withTiming(0, { duration: DURATION, easing: ease }),
          // A brief held-low frame before the next round so the wave reads
          // as three discrete steps, not a smear.
          withTiming(0, { duration: 360 }),
        ),
        -1,
      ),
    )
  }, [t, delay])

  const style = useAnimatedStyle(() => ({
    opacity: 0.35 + 0.65 * t.value,
    transform: [{ translateY: -6 * t.value }],
  }))

  return (
    <Animated.View
      style={[
        style,
        {
          width: 6,
          height: 6,
          borderRadius: 999,
          backgroundColor: palette.fuchsia[500],
          marginHorizontal: 3,
        },
      ]}
    />
  )
}

export function TypingIndicator() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
        minHeight: 22,
      }}
    >
      <Dot delay={0} />
      <Dot delay={180} />
      <Dot delay={360} />
    </View>
  )
}
