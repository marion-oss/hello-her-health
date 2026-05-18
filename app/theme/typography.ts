// Anoqi — typography tokens.
//
// Cormorant Garamond for display (warm, humanist, serif — headlines lean
// italic; "Mieux informée. / Mieux entendue." is set in italic).
// Inter Light/Regular for body — precise, never cold.
//
// Display sizes are pumped a touch beyond the deck spec ("more dramatic
// display size" per the build brief) — Cormorant carries it well, the room
// is dark, and editorial scale is part of the register.

import { Platform, type TextStyle } from 'react-native'

export const fontFamily = {
  display:       'CormorantGaramond-Regular',
  displayItalic: 'CormorantGaramond-Italic',
  displayMed:    'CormorantGaramond-Medium',
  displayMedIt:  'CormorantGaramond-MediumItalic',
  light:         'Inter-Light',
  regular:       'Inter-Regular',
  medium:        'Inter-Medium',
  bold:          'Inter-SemiBold',
  mono:          Platform.select({
    web: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
    default: 'Menlo',
  })!,
} as const

type TypoStyle = Pick<TextStyle, 'fontFamily' | 'fontSize' | 'lineHeight' | 'letterSpacing' | 'fontStyle'>

// Cormorant has a tall x-height and tight default tracking; we let it breathe
// at display sizes by adding a touch of negative letter-spacing only at the
// largest steps, where the serif strokes cohere on their own.
export const typography = {
  display:        { fontFamily: fontFamily.displayItalic,    fontSize: 68, lineHeight: 70, letterSpacing: -1.2 },
  displayItalic:  { fontFamily: fontFamily.displayItalic,    fontSize: 68, lineHeight: 70, letterSpacing: -1.2 },
  h1:             { fontFamily: fontFamily.display,          fontSize: 48, lineHeight: 52, letterSpacing: -0.6 },
  h1Italic:       { fontFamily: fontFamily.displayItalic,    fontSize: 48, lineHeight: 52, letterSpacing: -0.6 },
  h2:             { fontFamily: fontFamily.display,          fontSize: 36, lineHeight: 42, letterSpacing: -0.4 },
  h2Italic:       { fontFamily: fontFamily.displayItalic,    fontSize: 36, lineHeight: 42, letterSpacing: -0.4 },
  h3:             { fontFamily: fontFamily.display,          fontSize: 26, lineHeight: 32, letterSpacing: -0.2 },
  h3Italic:       { fontFamily: fontFamily.displayItalic,    fontSize: 26, lineHeight: 32, letterSpacing: -0.2 },
  h4:             { fontFamily: fontFamily.displayMed,       fontSize: 20, lineHeight: 26, letterSpacing: 0 },
  h4Italic:       { fontFamily: fontFamily.displayMedIt,     fontSize: 20, lineHeight: 26, letterSpacing: 0 },

  bodyLg:       { fontFamily: fontFamily.regular, fontSize: 17, lineHeight: 26, letterSpacing: 0 },
  bodyLgBold:   { fontFamily: fontFamily.bold,    fontSize: 17, lineHeight: 26, letterSpacing: 0 },
  bodyLgItalic: { fontFamily: fontFamily.regular, fontSize: 17, lineHeight: 26, letterSpacing: 0, fontStyle: 'italic' },
  body:     { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 24, letterSpacing: 0 },
  bodyLight:{ fontFamily: fontFamily.light,   fontSize: 15, lineHeight: 24, letterSpacing: 0 },
  bodyMed:  { fontFamily: fontFamily.medium,  fontSize: 15, lineHeight: 24, letterSpacing: 0 },
  bodyBold: { fontFamily: fontFamily.bold,    fontSize: 15, lineHeight: 24, letterSpacing: 0 },

  label:    { fontFamily: fontFamily.medium,  fontSize: 13, lineHeight: 18, letterSpacing: 0.2 },
  labelLg:  { fontFamily: fontFamily.medium,  fontSize: 14, lineHeight: 20, letterSpacing: 0.2 },
  caption:  { fontFamily: fontFamily.medium,  fontSize: 11, lineHeight: 14, letterSpacing: 0.5 },
  // Eyebrow — small caps tracking, deck-style "VOTRE INSIGHT"
  eyebrow:  { fontFamily: fontFamily.medium,  fontSize: 10, lineHeight: 12, letterSpacing: 2.4 },
  mono:     { fontFamily: fontFamily.mono,    fontSize: 13, lineHeight: 18, letterSpacing: 0 },
} as const satisfies Record<string, TypoStyle>

export type TypographyTokens = typeof typography
export type TypographyVariant = keyof TypographyTokens
