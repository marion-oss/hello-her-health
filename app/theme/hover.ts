// Anoqi — hover tokens.
//
// Premium minimalistic web hover: a 1px lift + smooth transition. Variants
// layer their own surface treatment (border brighten, glow, etc.) on top.
// All values are web-only; on native they are no-ops.

import { Platform } from 'react-native'
import type { ViewStyle } from 'react-native'

import { easingCss, duration } from './motion'

const transition: ViewStyle = Platform.OS === 'web'
  ? ({
      transitionProperty:
        'transform, background-color, border-color, box-shadow, opacity',
      transitionDuration: `${duration.base - 20}ms`,
      transitionTimingFunction: easingCss.outQuint,
    } as ViewStyle)
  : {}

export const hover = {
  transition,
  lift: { transform: [{ translateY: -1 }] } as ViewStyle,
  glow: (rgba: string): ViewStyle =>
    Platform.OS === 'web'
      ? ({ boxShadow: `0 8px 22px -12px ${rgba}` } as ViewStyle)
      : {},
} as const
