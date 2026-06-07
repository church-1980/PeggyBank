// The Plastic Surgeon — Design System
//
// Built on an 8pt grid. Generous spacing reduces cognitive load and makes
// tap targets comfortable for one-handed phone use (Mobile First pillar).

export { ColorPalette, DarkColors, LightColors } from './colors';

// Static fallback (dark mode defaults). Screens use useColors() for live switching.
export const Colors = {
  bg:           '#0F1117',
  bgCard:       '#171B24',
  bgElevated:   '#1E2332',
  bgInput:      '#171B24',
  border:       '#252A38',
  borderLight:  '#2E354A',
  primary:      '#FF6B2B',
  primaryDim:   '#FF6B2B18',
  primaryGlow:  '#FF6B2B28',
  primaryLight: '#FF8C56',
  healthy:      '#2CC9A8',
  warning:      '#F5A623',
  critical:     '#E84855',
  info:         '#4B9EFF',
  premium:      '#B27EFF',
  textPrimary:  '#E8EAF2',
  textSecondary:'#8B8FA8',
  textHint:     '#525670',
  textOnPrimary:'#FFFFFF',
  white:        '#FFFFFF',
  black:        '#000000',
};

// ─────────────────────────────────────────────
// SPACING — 8pt grid, thumb-friendly
// ─────────────────────────────────────────────
export const Spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  36,
  xxl: 52,
};

// ─────────────────────────────────────────────
// RADIUS — rounded, approachable
// ─────────────────────────────────────────────
export const Radius = {
  sm:   10,
  md:   16,
  lg:   22,
  xl:   30,
  full: 999,
};

// ─────────────────────────────────────────────
// TYPOGRAPHY — readable, calm hierarchy
// DM Sans: approachable, technical-but-friendly
// Line heights are generous for beginner-friendly readability.
// ─────────────────────────────────────────────
export const Typography = {
  // Display — hero numbers (health score, hours)
  hero:      { fontSize: 46, fontWeight: '700' as const, letterSpacing: -1.5 },

  // Headings
  h1:        { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5, lineHeight: 36 },
  h2:        { fontSize: 22, fontWeight: '700' as const, lineHeight: 30 },
  h3:        { fontSize: 18, fontWeight: '700' as const, lineHeight: 26 },

  // Body — beginner-friendly line height
  body:      { fontSize: 16, fontWeight: '400' as const, lineHeight: 28 },
  bodyBold:  { fontSize: 16, fontWeight: '600' as const, lineHeight: 26 },

  // Small — supporting text
  small:     { fontSize: 14, fontWeight: '400' as const, lineHeight: 24 },
  smallBold: { fontSize: 14, fontWeight: '600' as const, lineHeight: 22 },

  // Caption — dates, hints, labels
  caption:   { fontSize: 12, fontWeight: '400' as const, lineHeight: 19 },

  // Label — section titles, tab labels
  label:     { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.6 },
};

// ─────────────────────────────────────────────
// SHADOWS — workshop depth
// ─────────────────────────────────────────────
export const Shadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  soft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 7,
  },
  glow: {
    shadowColor: '#FF6B2B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
};

// ─────────────────────────────────────────────
// ANIMATION TIMING
// ─────────────────────────────────────────────
export const Motion = {
  quick:    150,
  standard: 220,
  enter:    280,
  exit:     200,
};
