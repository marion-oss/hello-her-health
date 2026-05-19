// Anoqi — border radius tokens.
// Two card languages (quiet + lifted), pill for chips/eyebrows,
// `lg = 14` for buttons (v2.0 tightened from 16; the heavier Bricolage type
// reads as too soft against fully-pilled buttons).

export const radii = {
  none: 0,
  sm:   8,
  md:   12,
  lg:   14,     // buttons (v2.0: was 16 in Sanctuary)
  xl:   20,
  '2xl': 28,
  bubble: 18,
  bubbleNotch: 4,
  pill: 999,
} as const

export type RadiusToken = keyof typeof radii
