// Anoqi — bloom glyph (kept under the original PeonyBloom name for import
// stability; the design is now the Sanctuary mark: a miniature breathing-form
// ellipse with the fuchsia dot at the spot).
//
// Used at: Chat assistant avatar (28–32px), EmptyState header (56px), and a
// few small decorative slots. The Welcome screen uses the full BreathingForm
// component instead — this glyph is a compact echo of it.

import React from 'react'
import Svg, { Circle, Defs, Ellipse, G, RadialGradient, Stop } from 'react-native-svg'

import { palette } from '../theme'

type Props = {
  size?: number
  /** 'full' renders the multi-tone bloom. 'mono' renders a single-color silhouette. */
  variant?: 'full' | 'mono'
  /** Used when variant is 'mono'. */
  tint?: string
}

export function PeonyBloom({ size = 64, variant = 'full', tint }: Props) {
  // Render a square viewBox; the dot sits where the deck spot does.
  const view = 64

  if (variant === 'mono') {
    const c = tint ?? palette.fuchsia[500]
    return (
      <Svg width={size} height={size} viewBox={`0 0 ${view} ${view}`} fill="none">
        <G>
          <Ellipse cx={32} cy={36} rx={24} ry={16} fill={c} opacity={0.18} />
          <Ellipse cx={32} cy={36} rx={20} ry={13} fill="none" stroke={c} strokeWidth={0.8} opacity={0.5} />
          <Ellipse cx={32} cy={36} rx={15} ry={10} fill="none" stroke={c} strokeWidth={0.8} opacity={0.35} />
          <Circle cx={28} cy={31} r={3} fill={c} />
        </G>
      </Svg>
    )
  }

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${view} ${view}`} fill="none">
      <Defs>
        <RadialGradient id="bloom-fill" cx="55%" cy="55%" r="60%">
          <Stop offset="0%"   stopColor={palette.dusk[400]} stopOpacity={0.85} />
          <Stop offset="100%" stopColor={palette.dusk[400]} stopOpacity={0}    />
        </RadialGradient>
        <RadialGradient id="bloom-spot" cx="50%" cy="42%" r="50%">
          <Stop offset="0%"   stopColor={palette.warmWhite[100]} stopOpacity={0.55} />
          <Stop offset="100%" stopColor={palette.ember[500]}     stopOpacity={0.05} />
        </RadialGradient>
      </Defs>

      <Ellipse cx={32} cy={36} rx={26} ry={17} fill="url(#bloom-fill)" />
      <Ellipse
        cx={32} cy={36} rx={22} ry={14}
        fill="none"
        stroke={palette.fuchsia[500]} strokeOpacity={0.22} strokeWidth={0.8}
      />
      <Ellipse
        cx={32} cy={36} rx={17} ry={11}
        fill="none"
        stroke={palette.fuchsia[500]} strokeOpacity={0.16} strokeWidth={0.8}
      />
      <Circle cx={27} cy={31} r={6}   fill="url(#bloom-spot)" />
      <Circle cx={27} cy={31} r={1.6} fill={palette.fuchsia[500]} />
    </Svg>
  )
}
