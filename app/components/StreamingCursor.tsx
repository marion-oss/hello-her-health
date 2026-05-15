// Anoqi — StreamingCursor.
//
// Replaces the legacy block-character (▋) at the tip of an in-progress
// assistant reply with a single fuchsia dot that breathes. Rendered inline
// inside the parent <Text>, so it lives at the end of the streamed sentence
// and flows with the line break.
//
// Premium and minimalistic by virtue of being one mark — same fuchsia, same
// breath curve as the wordmark dot, but a faster cadence (900ms) so the
// reader senses the message is still arriving.

import React, { useEffect } from 'react'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

import { palette } from '../theme'

const ease = Easing.bezier(0.45, 0, 0.55, 1)

export function StreamingCursor() {
  const t = useSharedValue(0)

  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 900, easing: ease }), -1, true)
  }, [t])

  const style = useAnimatedStyle(() => ({
    opacity: 0.35 + 0.65 * t.value,
  }))

  return (
    <Animated.Text style={[style, { color: palette.fuchsia[500] }]}>
      {' ●'}
    </Animated.Text>
  )
}
