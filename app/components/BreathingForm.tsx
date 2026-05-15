// BreathingForm — Anoqi's brand-deck visual signature, minimalist register.
//
// Flat geometric shapes only. No radial gradients, no fake 3D, no fuchsia
// glow on the outlines. The deck shows: a flat dusk-tinted disc with a
// small warm-grey dot at its center, and one or two very faint ellipse
// outlines partially visible at the edges. The whole group breathes on a
// 7-second cycle (opacity 0.55 ↔ 0.75, scale 1.0 ↔ 1.02) on the brand-deck
// curve.
//
// Decorative only. Sits behind hero copy on the Welcome screen and as a
// faint background on quiet states.

import React, { useEffect } from 'react'
import { View, type ViewStyle } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Circle, Ellipse } from 'react-native-svg'

const breath = Easing.bezier(0.45, 0, 0.55, 1)

export interface BreathingFormProps {
  size?: number
  opacity?: number
  style?: ViewStyle
}

export function BreathingForm({
  size = 460,
  opacity = 0.55,
  style,
}: BreathingFormProps) {
  const t = useSharedValue(0)

  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 7000, easing: breath }), -1, true)
  }, [t])

  const wrap = useAnimatedStyle(() => {
    const o = opacity + (0.75 - opacity) * t.value
    const s = 1 + 0.02 * t.value
    return {
      opacity: o,
      transform: [{ scale: s }],
    }
  })

  const height = Math.round(size * (380 / 460))

  return (
    <View pointerEvents="none" style={style}>
      <Animated.View style={[{ width: size, height }, wrap]}>
        <Svg width={size} height={height} viewBox="0 0 460 380">
          {/* One large ellipse outline arc — most of it sits beyond the
              canvas, only the upper-left curve registers. */}
          <Ellipse
            cx="290" cy="200" rx="280" ry="180"
            fill="none"
            stroke="rgba(196, 128, 106, 0.18)" strokeWidth="0.6"
          />
          {/* A second slightly smaller arc to give the form depth, also
              mostly cropped. */}
          <Ellipse
            cx="290" cy="200" rx="240" ry="150"
            fill="none"
            stroke="rgba(196, 128, 106, 0.10)" strokeWidth="0.6"
          />

          {/* The flat disc. No gradient — just a single dusk-tinted fill
              that reads as a quiet shape against the Void canvas. */}
          <Circle cx="240" cy="200" r="84" fill="rgba(46, 32, 48, 0.55)" />

          {/* Center dot — flat warm-grey, soft enough to feel like a moon
              against the disc, never a beacon. */}
          <Circle cx="240" cy="200" r="11" fill="rgba(196, 178, 165, 0.6)" />
        </Svg>
      </Animated.View>
    </View>
  )
}
