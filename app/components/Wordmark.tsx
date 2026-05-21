// Anoqi — Wordmark (v2.2 light register).
//
// "anoqi" in Bricolage Grotesque 800 with the Fuchsia dot above the *i*.
// The dot is the only fully-saturated mark on the screen and pulses on a
// 4s heartbeat:
//
//   0%, 100% { opacity: 0.9; transform: scale(1);    }
//   50%      { opacity: 0.6; transform: scale(0.82); }
//
// Never a notification bounce. A breath.

import React, { useEffect } from 'react'
import { Platform, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

import { palette } from '../theme'
import { Text } from './Text'

type Props = {
  /** Size of the "anoqi" wordmark in px. The dot scales with it. */
  size?: number
  /** Override the wordmark color (e.g. on a colored surface). Default Void. */
  color?: string
}

const breath = Easing.bezier(0.45, 0, 0.55, 1)

export function Wordmark({ size = 22, color = palette.void[500] }: Props) {
  const t = useSharedValue(0)

  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 4000, easing: breath }), -1, true)
  }, [t])

  // Mirror the brand-deck keyframes precisely:
  //   t=0 → opacity 0.9, scale 1
  //   t=1 → opacity 0.6, scale 0.82
  const dotStyle = useAnimatedStyle(() => ({
    opacity: 0.9 - 0.3 * t.value,
    transform: [{ scale: 1 - 0.18 * t.value }],
  }))

  // Dot scales relative to wordmark cap height. Bricolage 800 is heavier
  // than the v1.0 Inter Light, so the proportions are tighter than the deck
  // baseline.
  const dotSize       = Math.max(4, Math.round(size * 0.32))
  const dotMarginTop  = Math.round(size * 0.10)
  const dotMarginLeft = Math.max(2, Math.round(size * 0.06))

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      <Text
        style={{
          fontFamily: 'BricolageGrotesque-ExtraBold',
          fontSize: size,
          letterSpacing: -0.025 * size,
          color,
          lineHeight: size,
        }}
      >
        anoqi
      </Text>
      <Animated.View
        style={[
          {
            width: dotSize,
            height: dotSize,
            borderRadius: 999,
            backgroundColor: palette.fuchsia[500],
            marginTop: dotMarginTop,
            marginLeft: dotMarginLeft,
            ...(Platform.OS === 'web'
              ? ({ boxShadow: '0 0 10px rgba(255, 4, 114, 0.45)' } as any)
              : {
                  shadowColor: palette.fuchsia[500],
                  shadowOpacity: 0.45,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 0 },
                }),
          },
          dotStyle,
        ]}
      />
    </View>
  )
}
