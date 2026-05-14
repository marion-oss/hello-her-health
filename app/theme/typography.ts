// Anoqi — typography tokens.
//
// Bricolage Grotesque ExtraBold for display; DM Sans for body.
// Line-heights are pre-computed to px (RN doesn't take em units).

import { Platform, type TextStyle } from 'react-native'

export const fontFamily = {
  display:       'DMSerifDisplay-Regular',
  displayItalic: 'DMSerifDisplay-Italic',
  regular:       'DMSans-Regular',
  medium:        'DMSans-Medium',
  bold:          'DMSans-Bold',
  mono:          Platform.select({
    web: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
    default: 'Menlo',
  })!,
} as const

type TypoStyle = Pick<TextStyle, 'fontFamily' | 'fontSize' | 'lineHeight' | 'letterSpacing'>

// Serifs need lighter optical tracking than geometric sans-display fonts —
// the inherent strokes already provide cohesion.
export const typography = {
  display:        { fontFamily: fontFamily.display,       fontSize: 60, lineHeight: 62, letterSpacing: -1.0 },
  displayItalic:  { fontFamily: fontFamily.displayItalic, fontSize: 60, lineHeight: 62, letterSpacing: -0.8 },
  h1:             { fontFamily: fontFamily.display,       fontSize: 44, lineHeight: 48, letterSpacing: -0.8 },
  h1Italic:       { fontFamily: fontFamily.displayItalic, fontSize: 44, lineHeight: 48, letterSpacing: -0.6 },
  h2:             { fontFamily: fontFamily.display,       fontSize: 32, lineHeight: 38, letterSpacing: -0.5 },
  h2Italic:       { fontFamily: fontFamily.displayItalic, fontSize: 32, lineHeight: 38, letterSpacing: -0.3 },
  h3:             { fontFamily: fontFamily.display,       fontSize: 24, lineHeight: 30, letterSpacing: -0.3 },
  h4:             { fontFamily: fontFamily.display,       fontSize: 20, lineHeight: 26, letterSpacing: 0 },

  bodyLg:   { fontFamily: fontFamily.regular, fontSize: 17, lineHeight: 26, letterSpacing: 0 },
  body:     { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 24, letterSpacing: 0 },
  bodyMed:  { fontFamily: fontFamily.medium,  fontSize: 15, lineHeight: 24, letterSpacing: 0 },
  bodyBold: { fontFamily: fontFamily.bold,    fontSize: 15, lineHeight: 24, letterSpacing: 0 },

  label:    { fontFamily: fontFamily.medium,  fontSize: 13, lineHeight: 18, letterSpacing: 0.2 },
  labelLg:  { fontFamily: fontFamily.medium,  fontSize: 14, lineHeight: 20, letterSpacing: 0.2 },
  caption:  { fontFamily: fontFamily.medium,  fontSize: 11, lineHeight: 14, letterSpacing: 0.5 },
  // Eyebrow — tracked uppercase, mavie-style "FOR MODERN MOTHERHOOD" feel
  eyebrow:  { fontFamily: fontFamily.medium,  fontSize: 11, lineHeight: 14, letterSpacing: 2.0 },
  mono:     { fontFamily: fontFamily.mono,    fontSize: 13, lineHeight: 18, letterSpacing: 0 },
} as const satisfies Record<string, TypoStyle>

export type TypographyTokens = typeof typography
export type TypographyVariant = keyof TypographyTokens
