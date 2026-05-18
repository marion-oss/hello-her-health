// BreathingForm — Anoqi's brand-deck visual signature.
//
// Composition (bottom → top):
//   1. Middle dusk ellipse (#171317) — the body
//   2. Two outer fuchsia rings (#FF0472) — imperfect organic ovals,
//      drawn over the dusk so they read as crossing the body
//   3. Inner darker disc (#242023) — sits high-left within the middle
//   4. Warm-grey centre dot (#9A9690) — the heart
//
// Breathes on a single 6s cycle: scale 1 → 1.05 → 1. No opacity wash —
// the colours stay constant throughout the breath. Sinusoidal easing
// (cubic-bezier(0.45, 0, 0.55, 1)) — never snaps.
//
// Decorative only. Sits behind hero copy on the Welcome screen and as
// a faint background on quiet states.

import React, { useEffect } from 'react'
import { View, type ViewStyle } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg'

const breath = Easing.bezier(0.45, 0, 0.55, 1)

// SVG viewBox includes 200px of headroom above y=0 so ring 1 and ring 2 —
// which after their scale+offset transforms extend above y=0 in the original
// composition — render fully without being clipped. Width × height = 800 × 800
// (1:1) gives a clean square canvas around the form.
const VIEWBOX_X = 0
const VIEWBOX_Y = -200
const VIEWBOX_W = 800
const VIEWBOX_H = 800
const ASPECT = VIEWBOX_H / VIEWBOX_W // 1.0

export interface BreathingFormProps {
  /** Width in px of the SVG viewport. Height = size * 0.75 (4:3 viewBox). */
  size?: number
  /** Breath cycle in ms. Default 4000 — matches the wordmark dot pulse. */
  duration?: number
  style?: ViewStyle
}

export function BreathingForm({
  size = 520,
  duration = 4000,
  style,
}: BreathingFormProps) {
  const t = useSharedValue(0)

  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration, easing: breath }),
      -1,
      true,
    )
  }, [t, duration])

  // Scale 1 → 1.05 → 1, no opacity change.
  const wrap = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.05 * t.value }],
  }))

  const height = Math.round(size * ASPECT)

  return (
    <View pointerEvents="none" style={style}>
      <Animated.View style={[{ width: size, height }, wrap]}>
        <Svg width={size} height={height} viewBox={`${VIEWBOX_X} ${VIEWBOX_Y} ${VIEWBOX_W} ${VIEWBOX_H}`}>
          {/* 1. Middle dusk ellipse — the body. Solid fill, hard edge. */}
          <Ellipse
            cx={430}
            cy={300}
            rx={342}
            ry={190}
            fill="#171317"
          />

          {/* 2A. Outer fuchsia ring — imperfect organic oval, scaled
                non-uniformly and offset off-centre. The double-translate
                wraps a scale around the path's bbox centre (400, 300)
                to mimic CSS `transform-origin: center`. */}
          <G transform="translate(326 148) scale(0.82 1.28) translate(-400 -300)">
            <Path
              d="M 400,60 C 580,58 770,135 778,300 C 778,470 580,545 400,540 C 230,538 22,470 22,295 C 22,130 240,62 400,60 Z"
              fill="none"
              stroke="#FF0472"
              strokeWidth={0.4}
              strokeOpacity={0.32}
            />
          </G>

          {/* 2B. Second outer fuchsia ring — different organic curve,
                smaller, offset differently. The pair is what makes the
                form feel asymmetric and alive instead of a perfect oval. */}
          <G transform="translate(366 188) scale(0.58 0.80) translate(-400 -310)">
            <Path
              d="M 410,72 C 595,70 762,148 770,308 C 772,478 565,553 410,548 C 245,545 38,478 32,310 C 30,150 235,73 410,72 Z"
              fill="none"
              stroke="#FF0472"
              strokeWidth={0.4}
              strokeOpacity={0.22}
            />
          </G>

          {/* 3. Inner darker disc — sits on top of the rings, high-left. */}
          <Circle
            cx={360}
            cy={186}
            r={54}
            fill="#242023"
          />

          {/* 4. Warm-grey centre dot — the heart, always topmost. */}
          <Circle
            cx={360}
            cy={186}
            r={13}
            fill="#9A9690"
          />
        </Svg>
      </Animated.View>
    </View>
  )
}
