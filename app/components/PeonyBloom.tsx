// Anoqi — PeonyBloom.
//
// Bespoke brand glyph. Layered ruffled bloom + sage stem + single leaf.
// Used at: Welcome top-right, Chat assistant avatar (smaller), empty states,
// splash, favicon. One shape — the eye learns it.

import React from 'react'
import Svg, { Path, Circle, G } from 'react-native-svg'

import { palette } from '../theme'

type Props = {
  size?: number
  /** 'full' renders the multi-tone bloom. 'mono' renders a single-color silhouette. */
  variant?: 'full' | 'mono'
  /** Used when variant is 'mono'. */
  tint?: string
}

export function PeonyBloom({ size = 64, variant = 'full', tint }: Props) {
  if (variant === 'mono') {
    const c = tint ?? palette.peony[500]
    return (
      <Svg width={size} height={size * (80 / 64)} viewBox="0 0 64 80" fill="none">
        <G>
          <Path
            d="M32 42 C33 52 30 60 30 72 C30 75 28 76 27 78"
            stroke={c}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
          <Path d="M30 58 C24 54 18 56 18 62 C22 66 28 64 30 60 Z" fill={c} opacity={0.55} />
          <Path
            d="M32 14 C28 14 22 18 22 24 C14 22 10 30 14 38 C8 42 12 52 22 50 C22 56 28 58 32 52 C36 58 42 56 42 50 C52 52 56 42 50 38 C54 30 50 22 42 24 C42 18 36 14 32 14 Z"
            fill={c}
            opacity={0.9}
          />
        </G>
      </Svg>
    )
  }

  return (
    <Svg width={size} height={size * (80 / 64)} viewBox="0 0 64 80" fill="none">
      {/* Stem */}
      <Path
        d="M32 42 C33 52 30 60 30 72 C30 75 28 76 27 78"
        stroke={palette.sage[700]}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      {/* Leaf */}
      <Path
        d="M30 58 C24 54 18 56 18 62 C22 66 28 64 30 60 Z"
        fill={palette.sage[400]}
      />
      {/* Outer ruffled petals */}
      <Path
        d="M32 14 C28 14 22 18 22 24 C14 22 10 30 14 38 C8 42 12 52 22 50 C22 56 28 58 32 52 C36 58 42 56 42 50 C52 52 56 42 50 38 C54 30 50 22 42 24 C42 18 36 14 32 14 Z"
        fill={palette.rose[200]}
      />
      {/* Mid petals — a touch darker, tighter cluster */}
      <Path
        d="M32 22 C28 22 26 28 28 32 C22 32 22 38 26 40 C26 44 30 46 32 42 C34 46 38 44 38 40 C42 38 42 32 36 32 C38 28 36 22 32 22 Z"
        fill={palette.rose[300]}
      />
      {/* Inner bloom */}
      <Path
        d="M32 28 C28 28 28 34 32 38 C36 34 36 28 32 28 Z"
        fill={palette.peony[500]}
      />
      {/* Center */}
      <Circle cx={32} cy={32} r={2} fill={palette.peony[800]} />
    </Svg>
  )
}
