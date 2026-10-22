/**
 * Design tokens copied exactly from design.md §2–§4.
 * Components consume these semantic names; raw hex values never appear in screens.
 */

export type ColorTokens = {
  canvas: string;
  surface: string;
  surfaceMuted: string;
  surfaceRaised: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  outline: string;
  outlineStrong: string;
  heroSurface: string;
  onHero: string;
  onHeroMuted: string;
  heroAccent: string;
  brandPrimary: string;
  brandPressed: string;
  onBrand: string;
  brandSubtle: string;
  focusRing: string;
  lentText: string;
  lentSurface: string;
  borrowedText: string;
  borrowedSurface: string;
  successText: string;
  successSurface: string;
  warningText: string;
  warningSurface: string;
  dangerText: string;
  dangerSurface: string;
  scrim: string;
  /** Neutral black behind full-screen receipt photos in both themes (design.md §6.1 S11). */
  viewerCanvas: string;
};

/** Terracotta & Cream (design.md §2.1). */
export const lightColors: ColorTokens = {
  canvas: '#FAF7F2',
  surface: '#FFFFFF',
  surfaceMuted: '#F3EDE5',
  surfaceRaised: '#FFFFFF',
  textPrimary: '#2A1B17',
  textSecondary: '#6B5A53',
  textTertiary: '#8C7B73',
  outline: '#E6DCD2',
  outlineStrong: '#A08F86',
  heroSurface: '#4A2620',
  onHero: '#FFF8EF',
  onHeroMuted: '#E3CBBE',
  heroAccent: '#F0936E',
  brandPrimary: '#B4472B',
  brandPressed: '#963821',
  onBrand: '#FFFFFF',
  brandSubtle: '#FBEAE3',
  focusRing: '#B4472B',
  lentText: '#A8432A',
  lentSurface: '#FBEAE3',
  borrowedText: '#34558A',
  borrowedSurface: '#E9EFF8',
  successText: '#2F6B45',
  successSurface: '#E8F3EB',
  warningText: '#8A5710',
  warningSurface: '#FCF1DC',
  dangerText: '#B3203F',
  dangerSurface: '#FDECEF',
  scrim: 'rgba(0, 0, 0, 0.48)',
  viewerCanvas: '#000000',
};

/** Onyx & Ember (design.md §2.2) — neutral black surfaces, ember accents only. */
export const darkColors: ColorTokens = {
  canvas: '#0B0B0C',
  surface: '#161618',
  surfaceMuted: '#1F1F22',
  surfaceRaised: '#27272B',
  textPrimary: '#F5F0EB',
  textSecondary: '#BFB8B2',
  textTertiary: '#948D88',
  outline: '#2F2F33',
  outlineStrong: '#6B6663',
  heroSurface: '#8E3B24',
  onHero: '#FFF8EF',
  onHeroMuted: '#F6D8C9',
  heroAccent: '#FFD3BF',
  brandPrimary: '#F08A65',
  brandPressed: '#E07450',
  onBrand: '#2A0F07',
  brandSubtle: '#221916',
  focusRing: '#F08A65',
  lentText: '#F39A78',
  lentSurface: '#221916',
  borrowedText: '#9DB7E6',
  borrowedSurface: '#161D29',
  successText: '#7FCB98',
  successSurface: '#13211A',
  warningText: '#F2C46B',
  warningSurface: '#241E12',
  dangerText: '#FF8A9E',
  dangerSurface: '#28141A',
  scrim: 'rgba(0, 0, 0, 0.68)',
  viewerCanvas: '#000000',
};

/** Spacing and radii in dp (design.md §4). */
export const space = {
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 20,
  s6: 24,
  s8: 32,
  s10: 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  full: 999,
} as const;

/** Minimum touch target (design.md §4). */
export const MIN_TOUCH_TARGET = 48;

type TextStyleToken = {
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '500' | '600' | '700';
};

/** Type scale in sp (design.md §3.2). Numerals use tabular figures where amounts are shown. */
export const typography: Record<
  | 'hero'
  | 'title'
  | 'section'
  | 'cardAmount'
  | 'body'
  | 'rowTitle'
  | 'secondary'
  | 'overline'
  | 'button',
  TextStyleToken
> = {
  hero: { fontSize: 34, lineHeight: 40, fontWeight: '700' },
  title: { fontSize: 27, lineHeight: 34, fontWeight: '700' },
  section: { fontSize: 19, lineHeight: 26, fontWeight: '600' },
  cardAmount: { fontSize: 22, lineHeight: 29, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  rowTitle: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  secondary: { fontSize: 14, lineHeight: 21, fontWeight: '400' },
  overline: { fontSize: 12, lineHeight: 17, fontWeight: '600' },
  button: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
};

export type Theme = {
  scheme: 'light' | 'dark';
  colors: ColorTokens;
};

export const lightTheme: Theme = { scheme: 'light', colors: lightColors };
export const darkTheme: Theme = { scheme: 'dark', colors: darkColors };
