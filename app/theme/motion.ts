// Anoqi — motion tokens.
//
// Strong custom easings. The built-in CSS / RN easings are too weak.
// No bounce, no elastic.

import { Easing } from 'react-native'

// Bezier curves — exposed as both Easing functions (for Animated)
// and as raw bezier strings (for react-native-web CSS interop).
export const easing = {
  outQuart:   Easing.bezier(0.22, 1, 0.36, 1),
  outQuint:   Easing.bezier(0.16, 1, 0.3, 1),
  inOutExpo:  Easing.bezier(0.87, 0, 0.13, 1),
  standard:   Easing.bezier(0.4, 0, 0.2, 1),
  // Press feedback — fast, decisive snap-back
  pressIn:    Easing.bezier(0.4, 0, 0.6, 1),
  pressOut:   Easing.bezier(0.22, 1, 0.36, 1),
} as const

export const easingCss = {
  outQuart:  'cubic-bezier(0.22, 1, 0.36, 1)',
  outQuint:  'cubic-bezier(0.16, 1, 0.3, 1)',
  inOutExpo: 'cubic-bezier(0.87, 0, 0.13, 1)',
  standard:  'cubic-bezier(0.4, 0, 0.2, 1)',
} as const

export const duration = {
  instant: 0,
  fast:    120,
  base:    200,
  slow:    320,
  slower:  520,
  pulse:   1400, // breathing typing dots
} as const

export type DurationToken = keyof typeof duration
