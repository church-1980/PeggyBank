// PeggyBank Design System — "Evening Journal"
//
// Visual psychology goal: the app should feel like a warm, organized desk
// at the end of a calm evening. Trustworthy. Human. Low anxiety.
//
// Palette rules:
//   60% — neutral warm slate (bg, cards, surfaces)
//   30% — supporting tones (borders, secondary text, muted fills)
//   10% — accent (primary actions only — guide attention, don't shout)
//
// Emotional targets: cozy, premium, safe, readable, low cognitive load
// Accessibility: dyslexia-friendly spacing, generous line height, clear hierarchy

// ─────────────────────────────────────────────
// DARK MODE  (default)
// Muted warm navy-slate — NOT pure black, NOT cold tech navy
// Think: a warm notebook on a dimly lit desk
// ─────────────────────────────────────────────

// Static Colors export kept for backward compatibility and StyleSheet default.
// Screens should use useColors() from ThemeContext for live theme switching.
export { ColorPalette, DarkColors, LightColors } from './colors';

export const Colors = {
  // Backgrounds — layered warm slate depth
  // Each step lifts slightly in brightness with a consistent warm undertone
  bg:           '#15161E',   // base canvas — deep warm slate
  bgCard:       '#1C1D2B',   // card surface — gentle lift
  bgElevated:   '#22243A',   // sheets, modals — clearly raised
  bgInput:      '#1C1D2B',   // input fields — same as card

  // Borders — soft, not sharp. Define shape without creating visual noise.
  border:       '#282B40',
  borderLight:  '#323554',

  // Primary accent — soft periwinkle blue
  // Periwinkle sits between blue (trust) and purple (calm, premium)
  // It's warm without being aggressive, premium without being cold
  primary:      '#738AF4',
  primaryDim:   '#738AF414',
  primaryGlow:  '#738AF424',
  primaryLight: '#94A8FF',

  // Semantic colors — all intentionally muted and warm
  // Muted tones reduce anxiety. They communicate meaning without alarm.
  income:       '#4FC4BA',   // soft teal-cyan — calm, growth, positive
  spending:     '#DF7D70',   // warm coral — noted, not alarming (not blood red)
  bills:        '#DC80A4',   // muted rose — matches subscriptions, unified bills/subs identity
  goals:        '#72C28A',   // soft sage green — growth, hope, progress
  debt:         '#DF7D70',   // same warm coral as spending
  subs:         '#DC80A4',   // muted rose — distinct but not harsh

  // Text hierarchy — warm grays, not cold
  // Warm gray (slight violet undertone) reads softer than pure gray on dark bg
  textPrimary:   '#E5E6EE',  // nearly white, slight warmth — comfortable to read
  textSecondary: '#8A8CA6',  // mid tone — supporting info
  textHint:      '#54566E',  // subtle — dates, placeholders, low-priority
  textOnPrimary: '#FFFFFF',  // text on colored backgrounds

  // Safe-to-spend glass card — warm calm indigo
  // Less saturated and neon than before. More like a late-evening sky.
  // Communicates: calm, premium, in-control
  glassBase:      '#5460D4',  // muted warm indigo
  glassDark:      '#3C48B8',  // deeper shade for gradient
  glassHighlight: 'rgba(255,255,255,0.06)',  // very subtle highlight
  glassText:      'rgba(255,255,255,0.68)',  // readable, not harsh
  glassBright:    '#FFFFFF',

  // Utility
  white:  '#FFFFFF',
  black:  '#000000',
};

// ─────────────────────────────────────────────
// SPACING — generous, breathable, thumb-friendly
// More breathing room = less cognitive load
// All values based on an 8pt grid
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
// RADIUS — soft, rounded, friendly
// Sharp corners feel corporate and cold.
// Rounded corners feel safe, modern, approachable.
// ─────────────────────────────────────────────

export const Radius = {
  sm:   10,
  md:   16,
  lg:   22,
  xl:   30,
  full: 999,
};

// ─────────────────────────────────────────────
// ICON SIZES — the ONLY allowed icon glyph sizes.
// Never use raw numbers (15/16/18/22/27…) for icons; pick one of these so the
// same concept has the same visual weight on every screen.
// ─────────────────────────────────────────────

export const IconSize = {
  sm: 20, // list rows, category chips, pickers — the default
  md: 24, // secondary emphasis
  lg: 28, // detail sheets / focused single icon
  xl: 36, // hero / onboarding
};

// Standard container for a category/concept icon (one shape everywhere):
// a soft rounded square, tinted with the concept color.
export const IconBadgeSize = 36;


// ─────────────────────────────────────────────
// TYPOGRAPHY — readable, calm hierarchy
// Line heights are intentionally generous for dyslexia-friendly reading.
// Font weights use contrast for hierarchy rather than size overload.
// ─────────────────────────────────────────────

export const Typography = {
  // Display — hero number (safe to spend, totals)
  hero:      { fontSize: 46, fontWeight: '700' as const, letterSpacing: -1.5 },

  // Headings
  h1:        { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5, lineHeight: 36 },
  h2:        { fontSize: 22, fontWeight: '700' as const, lineHeight: 30 },
  h3:        { fontSize: 18, fontWeight: '700' as const, lineHeight: 26 },

  // Body — the workhorse. Extra line height for readability.
  body:      { fontSize: 16, fontWeight: '400' as const, lineHeight: 28 },
  bodyBold:  { fontSize: 16, fontWeight: '600' as const, lineHeight: 26 },

  // Small — supporting text. Generous line height for calm reading.
  small:     { fontSize: 14, fontWeight: '400' as const, lineHeight: 24 },
  smallBold: { fontSize: 14, fontWeight: '600' as const, lineHeight: 22 },

  // Caption — dates, hints, labels
  caption:   { fontSize: 12, fontWeight: '400' as const, lineHeight: 19 },

  // Label — uppercase section titles, tab labels
  label:     { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.6 },
};

// ─────────────────────────────────────────────
// SHADOWS — soft depth, not dramatic
// Shadows should suggest layers, not create drama.
// Warm shadow color prevents the cold "floating box" look.
// ─────────────────────────────────────────────

export const Shadow = {
  // Subtle card lift — used on most cards
  card: {
    shadowColor: '#0A0B14',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },

  // Medium depth — modals, elevated sheets
  soft: {
    shadowColor: '#0A0B14',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 7,
  },

  // Accent glow — FAB, primary glass card
  // Restrained — guides the eye without shouting
  glow: {
    shadowColor: '#738AF4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 10,
  },
};

// ─────────────────────────────────────────────
// ANIMATION TIMING — soft, intentional, never flashy
// ─────────────────────────────────────────────

export const Motion = {
  quick:    150,  // micro interactions (tap feedback)
  standard: 220,  // most transitions
  enter:    280,  // modals sliding in
  exit:     200,  // modals closing (slightly faster feels snappy)
};
