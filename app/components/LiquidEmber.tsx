// LiquidEmber — slow-moving warmth layer for card backgrounds.
//
// Three absolutely-positioned blob layers drift on independent long periods
// (22 / 27 / 31 seconds) with an `ease-in-out` curve from the brand deck
// (`cubic-bezier(0.45, 0, 0.55, 1)`). The result reads like a very slow
// magma — present, premium, never grabs the eye.
//
// On web the blobs get a heavy CSS `filter: blur(...)` so each circle softens
// into a true liquid blob. On native there is no equivalent without
// `@shopify/react-native-skia`; we ship a high-borderRadius View with a soft
// radial-style gradient instead — visually less buttery than web but the
// same motion language.
//
// Usage:
//   <View style={{ overflow: 'hidden', borderRadius: 22 }}>
//     <LiquidEmber intensity={0.8} />
//     {/* card content sits on top */}
//   </View>
//
// Props:
//   intensity   — multiplier on blob alpha (0..1.5). Default 1.
//   fuchsia     — include the small fuchsia spot blob. Default true.
//   blur        — web CSS blur radius in px. Default 48.
//   borderRadius — pass through so the layer clips with the parent.

import React, { useEffect, useState } from 'react'
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'

const breath = Easing.bezier(0.45, 0, 0.55, 1)

export interface LiquidEmberProps {
  intensity?: number
  fuchsia?: boolean
  blur?: number
  borderRadius?: number
  style?: ViewStyle
}

export function LiquidEmber({
  intensity = 1,
  fuchsia = true,
  blur = 48,
  borderRadius = 0,
  style,
}: LiquidEmberProps) {
  // Each blob has its own X and Y drift, with different periods so the
  // pattern never repeats visibly. Numbers are tuned for "barely moving" —
  // 22s is the fastest leg, 31s the slowest, all eased so direction changes
  // are gentle.
  const ax = useSharedValue(0)
  const ay = useSharedValue(0)
  const bx = useSharedValue(0)
  const by = useSharedValue(0)
  const cx = useSharedValue(0)
  const cy = useSharedValue(0)

  // Page Visibility on web: don't burn CPU/GPU animating six blurred blob
  // layers when the tab isn't visible. On native, Reanimated already throttles
  // when the app backgrounds, so we only wire this up for web.
  const [visible, setVisible] = useState(() =>
    Platform.OS === 'web' && typeof document !== 'undefined'
      ? document.visibilityState !== 'hidden'
      : true,
  )
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return
    const onChange = () => setVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])

  useEffect(() => {
    if (!visible) {
      // Freeze the values where they are; cancelling preserves the current
      // visual position so the resume looks like a pause, not a snap.
      cancelAnimation(ax)
      cancelAnimation(ay)
      cancelAnimation(bx)
      cancelAnimation(by)
      cancelAnimation(cx)
      cancelAnimation(cy)
      return
    }
    ax.value = withRepeat(withTiming(1, { duration: 22000, easing: breath }), -1, true)
    ay.value = withRepeat(withTiming(1, { duration: 27000, easing: breath }), -1, true)
    bx.value = withRepeat(withTiming(1, { duration: 26000, easing: breath }), -1, true)
    by.value = withRepeat(withTiming(1, { duration: 29000, easing: breath }), -1, true)
    cx.value = withRepeat(withTiming(1, { duration: 31000, easing: breath }), -1, true)
    cy.value = withRepeat(withTiming(1, { duration: 24000, easing: breath }), -1, true)
    return () => {
      cancelAnimation(ax)
      cancelAnimation(ay)
      cancelAnimation(bx)
      cancelAnimation(by)
      cancelAnimation(cx)
      cancelAnimation(cy)
    }
  }, [visible, ax, ay, bx, by, cx, cy])

  // Blob A — large ember in the upper-left, drifts diagonally.
  const blobA = useAnimatedStyle(() => ({
    transform: [
      { translateX: `${-40 + ax.value * 80}%` },
      { translateY: `${-40 + ay.value * 70}%` },
    ],
  }))
  // Blob B — large ember in the lower-right, counter-drifts.
  const blobB = useAnimatedStyle(() => ({
    transform: [
      { translateX: `${40 - bx.value * 80}%` },
      { translateY: `${30 - by.value * 60}%` },
    ],
  }))
  // Blob C — small fuchsia, drifts on a tighter orbit.
  const blobC = useAnimatedStyle(() => ({
    transform: [
      { translateX: `${-10 + cx.value * 40}%` },
      { translateY: `${50 - cy.value * 60}%` },
    ],
  }))

  // Web gets a real blur. Native falls back to a generous borderRadius +
  // softer color stops — the motion language survives.
  const webBlur = Platform.OS === 'web'
    ? ({ filter: `blur(${blur}px)` } as unknown as ViewStyle)
    : null

  const emberInner   = `rgba(196, 128, 106, ${0.48 * intensity})`
  const emberMid     = `rgba(196, 128, 106, ${0.20 * intensity})`
  const emberOuter   = 'rgba(196, 128, 106, 0)'
  const fuchsiaInner = `rgba(255, 4, 114, ${0.16 * intensity})`
  const fuchsiaMid   = `rgba(255, 4, 114, ${0.06 * intensity})`
  const fuchsiaOuter = 'rgba(255, 4, 114, 0)'

  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { borderRadius, overflow: 'hidden' },
        style,
      ]}
    >
      <Animated.View style={[styles.bigBlob, blobA, webBlur]}>
        <LinearGradient
          colors={[emberInner, emberMid, emberOuter]}
          locations={[0, 0.55, 1]}
          start={{ x: 0.3, y: 0.3 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        />
      </Animated.View>

      <Animated.View style={[styles.bigBlob, blobB, webBlur]}>
        <LinearGradient
          colors={[emberInner, emberMid, emberOuter]}
          locations={[0, 0.55, 1]}
          start={{ x: 0.7, y: 0.7 }}
          end={{ x: 0, y: 0 }}
          style={styles.gradient}
        />
      </Animated.View>

      {fuchsia && (
        <Animated.View style={[styles.smallBlob, blobC, webBlur]}>
          <LinearGradient
            colors={[fuchsiaInner, fuchsiaMid, fuchsiaOuter]}
            locations={[0, 0.55, 1]}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          />
        </Animated.View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  bigBlob: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '110%',
    height: '110%',
    borderRadius: 9999,
  },
  smallBlob: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '70%',
    height: '70%',
    borderRadius: 9999,
  },
  gradient: {
    flex: 1,
    borderRadius: 9999,
  },
})
