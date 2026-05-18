// Anoqi — typography tokens (v2.0).
//
// Two families. Each does one job.
//
//   Bricolage Grotesque — all headlines, wordmark, primary CTA labels.
//                          800-weight on display sizes (the joy is in the weight).
//   Inter               — all body copy, secondary buttons, captions, UI labels.
//                          300 by default — light, never cold.
//   JetBrains Mono      — code, data, mono-spaced values only.
//
// v1.0 used Cormorant Garamond italic for display. That's gone. See BRAND.md §3.
//
// Italic variants (h1Italic, h2Italic, etc.) are kept for backwards-compatible
// call sites but their values point at upright Bricolage — italics aren't part
// of the v2.0 register. Calls that explicitly need italic styling should
// switch to the non-italic variant; no visual difference.

import { Platform, type TextStyle } from 'react-native'

export const fontFamily = {
  // Bricolage Grotesque — the display family.
  display:       'BricolageGrotesque-Bold',     // 700 (used at H3+ scale)
  displayMed:    'BricolageGrotesque-Medium',   // 500 (used at H4 + primary-button labels)
  displayHeavy:  'BricolageGrotesque-ExtraBold',// 800 (used at display + H1 hero)

  // Bricolage italic family — kept exported for any code that constructs
  // font names by string, but the v2.0 typography variants below do not
  // use them.
  displayItalic: 'BricolageGrotesque-Bold',
  displayMedIt:  'BricolageGrotesque-Medium',

  // Inter — the body family.
  light:    'Inter-Light',
  regular:  'Inter-Regular',
  medium:   'Inter-Medium',
  bold:     'Inter-SemiBold',

  // Mono — held in reserve for code / data only.
  mono:     Platform.select({
    web: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
    default: 'Menlo',
  })!,
} as const

type TypoStyle = Pick<TextStyle, 'fontFamily' | 'fontSize' | 'lineHeight' | 'letterSpacing' | 'fontStyle'>

// Type scale — 1.33 modular ratio off a 13px body base.
// Values are the rounded "use these literally" ones, not the formula.
// Letter-spacing in pixels (absolute), not em — RN doesn't support em.
export const typography = {
  // ── Display + headlines: Bricolage 800 / 700 / 500 ─────────────────────
  display:       { fontFamily: fontFamily.displayHeavy, fontSize: 56, lineHeight: 59, letterSpacing: -1.8 },
  // Legacy alias for any caller that still imports `displayItalic`.
  displayItalic: { fontFamily: fontFamily.displayHeavy, fontSize: 56, lineHeight: 59, letterSpacing: -1.8 },

  h1:            { fontFamily: fontFamily.displayHeavy, fontSize: 38, lineHeight: 41, letterSpacing: -1.2 },
  h1Italic:      { fontFamily: fontFamily.displayHeavy, fontSize: 38, lineHeight: 41, letterSpacing: -1.2 },

  h2:            { fontFamily: fontFamily.displayHeavy, fontSize: 30, lineHeight: 34, letterSpacing: -0.8 },
  h2Italic:      { fontFamily: fontFamily.displayHeavy, fontSize: 30, lineHeight: 34, letterSpacing: -0.8 },

  h3:            { fontFamily: fontFamily.display,      fontSize: 24, lineHeight: 28, letterSpacing: -0.4 },
  h3Italic:      { fontFamily: fontFamily.display,      fontSize: 24, lineHeight: 28, letterSpacing: -0.4 },

  h4:            { fontFamily: fontFamily.displayMed,   fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  h4Italic:      { fontFamily: fontFamily.displayMed,   fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },

  // ── Body: Inter 300 by default ─────────────────────────────────────────
  bodyLg:       { fontFamily: fontFamily.light,    fontSize: 16, lineHeight: 26, letterSpacing: 0 },
  bodyLgBold:   { fontFamily: fontFamily.bold,     fontSize: 16, lineHeight: 26, letterSpacing: 0 },
  bodyLgItalic: { fontFamily: fontFamily.light,    fontSize: 16, lineHeight: 26, letterSpacing: 0, fontStyle: 'italic' },

  body:         { fontFamily: fontFamily.light,    fontSize: 13, lineHeight: 23, letterSpacing: 0 }, // 1.75 leading
  bodyLight:    { fontFamily: fontFamily.light,    fontSize: 13, lineHeight: 23, letterSpacing: 0 },
  bodyMed:      { fontFamily: fontFamily.regular,  fontSize: 13, lineHeight: 21, letterSpacing: 0 },
  bodyBold:     { fontFamily: fontFamily.bold,     fontSize: 13, lineHeight: 21, letterSpacing: 0 },

  // ── UI text: Inter Regular / Medium ────────────────────────────────────
  label:   { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 17, letterSpacing: 0.24 },
  labelLg: { fontFamily: fontFamily.medium,  fontSize: 14, lineHeight: 20, letterSpacing: 0.28 },
  caption: { fontFamily: fontFamily.regular, fontSize: 11, lineHeight: 17, letterSpacing: 0.44 },

  // Eyebrow — small caps with heavy tracking. "POUR LA SANTÉ DES FEMMES."
  eyebrow: { fontFamily: fontFamily.medium,  fontSize: 9,  lineHeight: 13, letterSpacing: 1.98 },

  // Mono — JetBrains, code only.
  mono:    { fontFamily: fontFamily.mono,    fontSize: 11, lineHeight: 17, letterSpacing: 0 },
} as const satisfies Record<string, TypoStyle>

export type TypographyTokens = typeof typography
export type TypographyVariant = keyof TypographyTokens
