// Anoqi — colour tokens.
//
// Two themes live in this file:
//
//   darkColors  — v1.0 Sanctuary. Dark canvas, ember warmth, warm-white type.
//                 Still the app default; existing screens render on this.
//
//   lightColors — v2.0 (the rebrand). White canvas, fuchsia signal, soft
//                 apricot as decoration only. See BRAND.md.
//
// Screens migrating to v2.0 wrap themselves in <ThemeProvider mode="light">
// and they pick up the new tokens. App.tsx will flip its default mode to
// "light" once all screens are migrated.
//
// Both modes share the SAME ColorTokens shape, so component code that reads
// theme.colors.bg.canvas / .text.primary / etc. just works in either mode.

export const palette = {
  // ── v1.0 Sanctuary scales — kept for backwards compatibility ────────────
  // Direct palette references in legacy components still resolve. These
  // remain accurate values for the dark theme.

  // Void — the dark canvas. Also the v2.0 primary text colour on white.
  void: {
    50:  '#52525a',
    100: '#3d3d44',
    200: '#28282f',
    300: '#1e1e28',
    400: '#16161e', // Surface (dark)
    500: '#0d0d12', // anchor — Void
    600: '#0a0a0e',
    700: '#070709',
    800: '#040406',
    900: '#020203',
  },

  // Fuchsia — the signal. Carried into v2.0 unchanged; this is the bridge
  // colour between the two themes.
  fuchsia: {
    50:  '#fff0f6',
    100: '#ffdce9',
    200: '#ffb0ce',
    300: '#ff7cae',
    400: '#ff4290',
    500: '#ff0472', // anchor
    600: '#d40460',
    700: '#a8044c',
    800: '#7c0438',
    900: '#500323',
    950: '#2a0212',
  },

  // Ember — v1.0 warmth wash. Deprecated in v2.0; replaced by apricot
  // (decoration only) and warmGray (secondary text).
  ember: {
    50:  '#faf1eb',
    100: '#f1dcce',
    200: '#e6bfa8',
    300: '#d7a082',
    400: '#cc8e71',
    500: '#c4806a', // anchor
    600: '#a56850',
    700: '#83513e',
    800: '#623c2d',
    900: '#3f281f',
    950: '#231510',
  },

  // Warm white — v1.0 primary type. Still used as v1.0 text on dark.
  warmWhite: {
    50:  '#fffcf9',
    100: '#fff5ee', // anchor
    200: '#f7e5d2',
    300: '#efd2b7',
    400: '#e5bd9a',
    500: '#cda17e',
    600: '#a98064',
    700: '#82624d',
    800: '#5b473a',
    900: '#382c24',
  },

  // Dusk — v1.0 ghost borders on dark.
  dusk: {
    100: '#5e4761',
    200: '#4e3a51',
    300: '#3f2e41',
    400: '#352636',
    500: '#2e2030', // anchor
    600: '#241825',
    700: '#1a111b',
    800: '#100a11',
    900: '#080308',
  },

  // Burgundy — restrained danger. Kept in v2.0 for now (status pill rework
  // pending, see BRAND.md §10).
  burgundy: {
    100: '#f7e2e6',
    400: '#b94a64',
    500: '#9c3654',
    700: '#6e2238',
  },

  // ── v2.0 additions ──────────────────────────────────────────────────────

  // Soft Apricot — v2.0 decoration only. Radial-gradient bloom in hero and
  // empty-state moments. Never text, never UI, never status colour.
  apricot: {
    50:  '#fff6eb',
    100: '#feedd1',
    200: '#fed7a8',
    300: '#fdc283',
    400: '#fdba74', // anchor — the bloom colour
    500: '#f8a35a',
    600: '#e08a45',
    700: '#b56b35',
    800: '#854e26',
    900: '#553118',
  },

  // Petal — v2.0 subtle warmth. Pill backgrounds, soft card tints, hover
  // surfaces. Never text, never strong containers.
  petal: {
    50:  '#fffafc',
    100: '#fef0f4', // anchor — the standard pill tint
    200: '#fde0ea',
    300: '#fbcad7',
    400: '#f8a8bf',
  },

  // Sand — v2.0 quiet structure. Secondary button outlines (1.5px), hairline
  // dividers, very-subtle separators. Never text, never fills.
  sand: {
    100: '#f5f0eb',
    200: '#ece3da',
    300: '#e8e0d8', // anchor — secondary-button outline colour
    400: '#dccfc1',
    500: '#c8b8a8',
  },

  // Warm gray — v2.0 secondary body copy. Softer than full Void; for
  // subtitles, captions, helper text where Void would compete with the
  // headline.
  warmGray: {
    100: '#878088',
    300: '#5c5460',
    500: '#3a3040', // anchor — the standard subtitle colour
    700: '#231b27',
  },
} as const

// Role tokens — what screens actually consume.
export type ColorTokens = {
  bg: {
    canvas: string
    surface: string
    surfaceMuted: string
    surfaceWarm: string
    surfaceInverse: string
    overlay: string
  }
  text: {
    primary: string
    secondary: string
    tertiary: string
    inverse: string
    accent: string
    danger: string
    placeholder: string
  }
  border: {
    subtle: string
    default: string
    strong: string
    focus: string
    danger: string
  }
  accent: {
    primary: string
    primaryHover: string
    primaryActive: string
    primaryOnText: string
    celebration: string
    success: string
    successSurface: string
    warning: string
    warningSurface: string
    danger: string
    dangerSurface: string
    info: string
    infoSurface: string
  }
  status: {
    draftBg: string
    draftText: string
    draftRing: string
    inReviewBg: string
    inReviewText: string
    inReviewRing: string
    approvedBg: string
    approvedText: string
    approvedRing: string
    liveBg: string
    liveText: string
    liveRing: string
    archivedBg: string
    archivedText: string
    archivedRing: string
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// v1.0 Sanctuary — dark theme (unchanged).
// ─────────────────────────────────────────────────────────────────────────────
export const darkColors: ColorTokens = {
  bg: {
    canvas:         palette.void[500],
    surface:        palette.void[400],          // #16161E
    surfaceMuted:   palette.void[300],          // #1E1E28
    surfaceWarm:    'rgba(196, 128, 106, 0.10)',// ember at low alpha
    surfaceInverse: palette.warmWhite[100],
    overlay:        'rgba(13, 13, 18, 0.85)',
  },
  text: {
    primary:     palette.warmWhite[100],
    secondary:   'rgba(255, 245, 238, 0.72)',
    tertiary:    'rgba(255, 245, 238, 0.50)',
    inverse:     palette.void[500],
    accent:      palette.ember[400],
    danger:      palette.burgundy[400],
    placeholder: 'rgba(255, 245, 238, 0.38)',
  },
  border: {
    subtle:  'rgba(255, 245, 238, 0.06)',
    default: palette.dusk[500],
    strong:  'rgba(255, 245, 238, 0.16)',
    focus:   palette.fuchsia[500],
    danger:  palette.burgundy[400],
  },
  accent: {
    primary:        palette.fuchsia[500],
    primaryHover:   palette.fuchsia[400],
    primaryActive:  palette.fuchsia[600],
    primaryOnText:  palette.warmWhite[100],
    celebration:    palette.fuchsia[400],
    success:        palette.ember[400],
    successSurface: 'rgba(196, 128, 106, 0.16)',
    warning:        palette.ember[400],
    warningSurface: 'rgba(196, 128, 106, 0.12)',
    danger:         palette.burgundy[400],
    dangerSurface:  'rgba(185, 74, 100, 0.15)',
    info:           palette.ember[400],
    infoSurface:    'rgba(196, 128, 106, 0.12)',
  },
  status: {
    draftBg:        'rgba(196, 128, 106, 0.14)',
    draftText:      palette.ember[200],
    draftRing:      palette.ember[700],
    inReviewBg:     'rgba(255, 4, 114, 0.14)',
    inReviewText:   palette.fuchsia[300],
    inReviewRing:   palette.fuchsia[700],
    approvedBg:     'rgba(196, 128, 106, 0.22)',
    approvedText:   palette.ember[200],
    approvedRing:   palette.ember[600],
    liveBg:         palette.fuchsia[900],
    liveText:       palette.fuchsia[200],
    liveRing:       palette.fuchsia[500],
    archivedBg:     palette.dusk[600],
    archivedText:   palette.warmWhite[300],
    archivedRing:   palette.dusk[300],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// v2.0 — light theme (the rebrand). See BRAND.md.
//
// To migrate a screen onto v2.0, wrap it in <ThemeProvider mode="light">.
// All theme.colors.* keys resolve to the v2.0 values below.
//
// Status pill values below are a "good-enough" mapping for now. The proper
// re-derivation of status colour theory against the white canvas is open
// (BRAND.md §10.1). Treat anything in status.* as provisional.
// ─────────────────────────────────────────────────────────────────────────────
export const lightColors: ColorTokens = {
  bg: {
    // White is the canvas. Cards live directly on white with a hairline,
    // not on a tinted surface. Petal serves as a soft tint for pills only.
    canvas:         '#ffffff',
    surface:        '#ffffff',
    surfaceMuted:   palette.petal[100],                  // #FEF0F4
    surfaceWarm:    'rgba(253, 186, 116, 0.10)',         // apricot at 10% alpha
    surfaceInverse: palette.void[500],
    overlay:        'rgba(13, 13, 18, 0.55)',            // lighter scrim than dark mode
  },
  text: {
    primary:     palette.void[500],                      // #0D0D12 — headlines, body
    secondary:   palette.warmGray[500],                  // #3A3040 — subtitles, captions
    tertiary:    'rgba(13, 13, 18, 0.50)',
    inverse:     '#ffffff',
    accent:      palette.fuchsia[500],                   // signal, not apricot
    danger:      palette.burgundy[500],
    placeholder: 'rgba(13, 13, 18, 0.38)',
  },
  border: {
    subtle:  'rgba(13, 13, 18, 0.06)',
    default: palette.sand[300],                          // #E8E0D8 — secondary buttons
    strong:  'rgba(13, 13, 18, 0.20)',
    focus:   palette.fuchsia[500],
    danger:  palette.burgundy[500],
  },
  accent: {
    primary:        palette.fuchsia[500],                // #FF0472 — primary CTA fill
    primaryHover:   palette.fuchsia[400],
    primaryActive:  palette.fuchsia[600],
    primaryOnText:  '#ffffff',                           // text on top of fuchsia button
    celebration:    palette.fuchsia[400],
    success:        palette.fuchsia[500],                // provisional — see BRAND.md §10.1
    successSurface: palette.petal[100],
    warning:        palette.apricot[600],                // provisional
    warningSurface: 'rgba(253, 186, 116, 0.18)',
    danger:         palette.burgundy[500],
    dangerSurface:  'rgba(156, 54, 84, 0.10)',
    info:           palette.fuchsia[500],
    infoSurface:    palette.petal[100],
  },
  // Status — provisional v2.0 mapping. Pending the rework in BRAND.md §10.1.
  status: {
    draftBg:        palette.sand[100],
    draftText:      palette.warmGray[500],
    draftRing:      palette.sand[400],
    inReviewBg:     palette.petal[100],
    inReviewText:   palette.fuchsia[700],
    inReviewRing:   palette.fuchsia[300],
    approvedBg:     palette.petal[200],
    approvedText:   palette.fuchsia[700],
    approvedRing:   palette.fuchsia[400],
    liveBg:         palette.fuchsia[500],
    liveText:       '#ffffff',
    liveRing:       palette.fuchsia[600],
    archivedBg:     palette.sand[200],
    archivedText:   palette.warmGray[500],
    archivedRing:   palette.sand[400],
  },
}
