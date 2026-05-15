// Anoqi — border radius tokens.
// Two card languages (quiet + lifted), pill for CTAs, notch for chat bubbles.

export const radii = {
  none: 0,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 28,
  bubble: 18,
  bubbleNotch: 4,
  pill: 999,
} as const

export type RadiusToken = keyof typeof radii
