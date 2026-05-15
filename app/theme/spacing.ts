// Anoqi — spacing scale. 4px base.

export const spacing = {
  px:  1,
  1:   4,
  2:   8,
  3:   12,
  4:   16,
  5:   20,
  6:   24,
  8:   32,
  10:  40,
  12:  48,
  14:  56,
  16:  64,
  20:  80,
  24:  96,
  32:  128,
} as const

export type SpacingToken = keyof typeof spacing
