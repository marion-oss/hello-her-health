// Anoqi — color tokens.
//
// Palette is OKLCH-tuned: chroma drops at the lightness extremes so the
// 50 and 950 shades stay perceptually balanced (no muddy 300, no blown 800).
// Anchors come from the Sweet Peony brief.

export const palette = {
  // Sweet Peony — primary brand accent
  peony: {
    50:  '#fbf3f7',
    100: '#f9e6ef',
    200: '#f4cadd',
    300: '#eda5c4',
    400: '#e588b1',
    500: '#e06c9f', // anchor
    600: '#c8508a',
    700: '#a73e72',
    800: '#82325b',
    900: '#5d2542',
    950: '#371827',
  },
  // Pink Carnation — celebration / focus
  carnation: {
    50:  '#fdf2f7',
    100: '#fbe6f0',
    200: '#f7ccdf',
    300: '#f5a8c8',
    400: '#f283b6', // anchor
    500: '#e96aa3',
    600: '#d24f87',
    700: '#b03d6e',
    800: '#883157',
    900: '#5e2640',
    950: '#371727',
  },
  // Cotton Rose — warm surface tint
  rose: {
    50:  '#fdf6f4',
    100: '#fbede9',
    200: '#edbfb7', // anchor
    300: '#ddaba1',
    400: '#c89589',
    500: '#b07a6d',
    600: '#946357',
    700: '#735045',
    800: '#573e36',
    900: '#392922',
    950: '#1f1612',
  },
  // Dry Sage — secondary structure
  sage: {
    50:  '#f5f6f0',
    100: '#ebede2',
    200: '#d8ddc9',
    300: '#c4ccae',
    400: '#b5bfa1', // anchor
    500: '#9aa685',
    600: '#7d886a',
    700: '#636d55',
    800: '#4d5443',
    900: '#353a2f',
    950: '#1d201a',
  },
  // Muted Teal — secondary text / icon / success
  teal: {
    50:  '#f0f5f3',
    100: '#dde9e3',
    200: '#c0d4cb',
    300: '#9bbaad',
    400: '#80a591',
    500: '#6e9887', // anchor
    600: '#547b6c',
    700: '#426258',
    800: '#344c44',
    900: '#233330',
    950: '#131c1a',
  },
  // Mauve-ink — body text. Deep, peony-tilted, NOT black.
  ink: {
    50:  '#f7f3f5',
    100: '#ece4e8',
    200: '#d4c5cd',
    300: '#b09ba6',
    400: '#866e7b',
    500: '#634f5b',
    600: '#4a3a45',
    700: '#332831',
    800: '#241a22',
    900: '#1d1419',
    950: '#120a0f',
  },
  // Burgundy — restrained danger color (not fire-engine red)
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

// Light theme role tokens.
export const lightColors: ColorTokens = {
  bg: {
    canvas:         '#fdfcfc', // near-white, faintly peony-tinted (chroma 0.005)
    surface:        '#fdfcfc', // single neutral layer — cards lift via border or muted
    surfaceMuted:   '#faf3f1', // subtle warm card surface — sits 1-2% off canvas
    surfaceWarm:    palette.rose[200], // Cotton Rose — accent moments only
    surfaceInverse: palette.ink[900],
    overlay:        'rgba(237, 191, 183, 0.86)', // Cotton Rose at 86% — not a black scrim
  },
  text: {
    primary:   palette.ink[900],
    secondary: palette.teal[700],
    tertiary:  palette.sage[600],
    inverse:   '#fbf6f3',
    accent:    palette.peony[600],
    danger:    palette.burgundy[500],
    placeholder: palette.sage[500],
  },
  border: {
    subtle:  palette.rose[100],
    default: palette.sage[300],
    strong:  palette.teal[500],
    focus:   palette.peony[500],
    danger:  palette.burgundy[400],
  },
  accent: {
    primary:        palette.peony[500],
    primaryHover:   palette.peony[600],
    primaryActive:  palette.peony[700],
    primaryOnText:  '#fefcfb',
    celebration:    palette.carnation[400],
    success:        palette.teal[600],
    successSurface: palette.teal[100],
    warning:        palette.rose[500],
    warningSurface: palette.rose[100],
    danger:         palette.burgundy[500],
    dangerSurface:  palette.burgundy[100],
    info:           palette.teal[500],
    infoSurface:    palette.teal[100],
  },
  // Status badges for the physician portal-style states.
  status: {
    draftBg:        palette.rose[100],
    draftText:      palette.peony[900],
    draftRing:      palette.peony[200],
    inReviewBg:     palette.teal[100],
    inReviewText:   palette.teal[800],
    inReviewRing:   palette.teal[300],
    approvedBg:     palette.sage[100],
    approvedText:   palette.sage[800],
    approvedRing:   palette.sage[300],
    liveBg:         palette.peony[100],
    liveText:       palette.peony[800],
    liveRing:       palette.peony[400],
    archivedBg:     palette.ink[100],
    archivedText:   palette.ink[700],
    archivedRing:   palette.ink[200],
  },
}

// Dark theme role tokens — same shape, flipped values.
// Scene: 11:40pm in bed, phone glow on her face. Sage deepens to ink, peony whispers.
export const darkColors: ColorTokens = {
  bg: {
    canvas:         palette.ink[900],
    surface:        palette.ink[900],
    surfaceMuted:   palette.ink[800],
    surfaceWarm:    palette.rose[900],
    surfaceInverse: '#fdfcfc',
    overlay:        'rgba(29, 20, 25, 0.88)',
  },
  text: {
    primary:     '#fbf6f3',
    secondary:   palette.teal[300],
    tertiary:    palette.sage[500],
    inverse:     palette.ink[900],
    accent:      palette.peony[300],
    danger:      palette.carnation[400],
    placeholder: palette.sage[700],
  },
  border: {
    subtle:  palette.ink[700],
    default: palette.sage[800],
    strong:  palette.teal[500],
    focus:   palette.peony[400],
    danger:  palette.burgundy[400],
  },
  accent: {
    primary:        palette.peony[500],
    primaryHover:   palette.peony[400],
    primaryActive:  palette.peony[300],
    primaryOnText:  palette.ink[900],
    celebration:    palette.carnation[400],
    success:        palette.teal[400],
    successSurface: palette.teal[900],
    warning:        palette.rose[400],
    warningSurface: palette.rose[900],
    danger:         palette.burgundy[400],
    dangerSurface:  palette.burgundy[700],
    info:           palette.teal[400],
    infoSurface:    palette.teal[900],
  },
  status: {
    draftBg:      palette.peony[900],
    draftText:    palette.peony[200],
    draftRing:    palette.peony[700],
    inReviewBg:   palette.teal[900],
    inReviewText: palette.teal[200],
    inReviewRing: palette.teal[700],
    approvedBg:   palette.sage[900],
    approvedText: palette.sage[200],
    approvedRing: palette.sage[700],
    liveBg:       palette.peony[800],
    liveText:     palette.peony[200],
    liveRing:     palette.peony[500],
    archivedBg:   palette.ink[800],
    archivedText: palette.ink[300],
    archivedRing: palette.ink[700],
  },
}
