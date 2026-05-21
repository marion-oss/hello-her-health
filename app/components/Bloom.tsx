// Anoqi — Bloom (v2.0 brand mark).
//
// A single Soft Apricot radial gradient bleeding off the top-right corner,
// with a single Fuchsia dot inside it pulsing on a 4-second loop. See
// BRAND.md §4 for the canonical spec.
//
// Geometry is locked (BRAND.md §4.1): radialGradient cx="72%" cy="10%"
// r="55%", dot at (228, 85) on the 300-unit reference canvas.
//
// Use it as an absolutely-positioned overlay at the top of any screen:
//
//   <View style={{ flex: 1, backgroundColor: '#fff' }}>
//     <Bloom intensity={0.5} />
//     <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
//       ...content...
//     </SafeAreaView>
//   </View>
//
// Intensity:
//   1.0 — hero / Welcome screen
//   0.5 — default for inner screens (BRAND.md §4.3 "~60% on inner screens")
//   0   — bloom hidden entirely
//
// Position: top-right by default. BRAND.md §12.3 allows bottom-left or
// bottom-right on secondary screens for variety; pass `position` to switch.

import React, { useEffect } from 'react'
import { Platform, View, useWindowDimensions } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'

import { palette } from '../theme'

type Position = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'

type Props = {
  /** 0–1. 1.0 = hero (Welcome), 0.5 = default inner screens. Default 0.5. */
  intensity?: number
  /** Override the auto-computed size. Auto: ~360-480 at hero, ~300-400 inner. */
  size?: number
  /** Default top-right. */
  position?: Position
}

export function Bloom({ intensity = 0.5, size, position = 'top-right' }: Props) {
  const { width } = useWindowDimensions()
  const isCompact = width < 480

  const resolvedSize =
    size ??
    (intensity >= 0.9
      ? (isCompact ? 360 : 480)
      : (isCompact ? 300 : 400))

  const t = useSharedValue(0)
  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.bezier(0.45, 0, 0.55, 1) }),
      -1,
      true,
    )
  }, [t])

  const dotStyle = useAnimatedStyle(() => ({
    opacity: (0.92 - 0.57 * t.value) * intensity,
    transform: [{ scale: 1 - 0.38 * t.value }],
  }))

  // Dot position within the bloom canvas — keeps the same proportions as the
  // 300-unit reference SVG in BRAND.md §4.1.
  const dotX = resolvedSize * 0.76
  const dotY = resolvedSize * 0.21
  const dotR = intensity >= 0.9 ? 6.5 : 5

  const stop0 = 0.7  * intensity
  const stop1 = 0.38 * intensity
  const stop2 = 0.10 * intensity

  // Anchor the bloom container to the requested corner. Default top-right.
  const cornerStyle: Record<Position, Record<string, number>> = {
    'top-right':    { top: 0, right: 0 },
    'top-left':     { top: 0, left: 0 },
    'bottom-right': { bottom: 0, right: 0 },
    'bottom-left':  { bottom: 0, left: 0 },
  }

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: resolvedSize,
        height: resolvedSize,
        ...cornerStyle[position],
      }}
    >
      <Svg width={resolvedSize} height={resolvedSize} viewBox={`0 0 ${resolvedSize} ${resolvedSize}`}>
        <Defs>
          <RadialGradient id="apricotBloom" cx="72%" cy="10%" r="55%" fx="72%" fy="10%">
            <Stop offset="0%"   stopColor={palette.apricot[400]} stopOpacity={stop0} />
            <Stop offset="35%"  stopColor={palette.apricot[400]} stopOpacity={stop1} />
            <Stop offset="70%"  stopColor={palette.apricot[400]} stopOpacity={stop2} />
            <Stop offset="100%" stopColor={palette.apricot[400]} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={resolvedSize} height={resolvedSize} fill="url(#apricotBloom)" />
      </Svg>

      <Animated.View
        style={[
          {
            position: 'absolute',
            left: dotX - dotR,
            top:  dotY - dotR,
            width: dotR * 2,
            height: dotR * 2,
            borderRadius: 999,
            backgroundColor: palette.fuchsia[500],
            ...(Platform.OS === 'web'
              ? ({ boxShadow: `0 0 ${intensity >= 0.9 ? 16 : 14}px rgba(255, 4, 114, ${0.55 * intensity})` } as any)
              : {
                  shadowColor: palette.fuchsia[500],
                  shadowOpacity: 0.55 * intensity,
                  shadowRadius: intensity >= 0.9 ? 8 : 6,
                  shadowOffset: { width: 0, height: 0 },
                }),
          },
          dotStyle,
        ]}
      />
    </View>
  )
}
