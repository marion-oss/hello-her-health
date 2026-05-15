// Anoqi — Sanctuary Palette
//
// Six decisions, locked from the brand deck:
//   Void         #0D0D12   primary canvas
//   Surface      #16161E   cards & UI layers
//   Fuchsia      #FF0472   signal — used as a single dot or a sparse accent
//   Warm White   #FFF5EE   primary type
//   Ember        #C4806A   warmth & depth wash
//   Dusk         #2E2030   ghost borders
//
// Anoqi is dark-only. Both lightColors and darkColors map to the same dark
// values so OS-level light mode does not bleed through into the app.

export const palette = {
  // Void — the room. Surface and cards step up from here.
  void: {
    50:  '#52525a',
    100: '#3d3d44',
    200: '#28282f',
    300: '#1e1e28',
    400: '#16161e', // Surface
    500: '#0d0d12', // anchor — Void canvas
    600: '#0a0a0e',
    700: '#070709',
    800: '#040406',
    900: '#020203',
  },

  // Fuchsia — the signal. Ghosted, never structural.
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

  // Ember — the warmth. Dusty rose / terracotta, used for em, source chips,
  // the slow-moving liquid glow under cards.
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

  // Warm white — primary type. Cream tone, never pure white.
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

  // Dusk — ghost borders + deep mauve corners.
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

  // Burgundy — restrained danger (not fire-engine red).
  burgundy: {
    100: '#f7e2e6',
    400: '#b94a64',
    500: '#9c3654',
    700: '#6e2238',
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

// Anoqi's dark mode (the only mode). Surfaces sit just barely above Void so
// the breathing-form and liquid-ember layers underneath can register.
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

// Locked dark. lightColors is an alias so consumers that expect both
// continue to work without rewriting downstream.
export const lightColors: ColorTokens = darkColors
