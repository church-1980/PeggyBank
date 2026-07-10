// PeggyBank Color Palettes
//
// LIGHT = the approved PeggyBank Design Bible (design/PeggyBank-Design-Bible.png).
//         Every value here is extracted from that image. Do not "improve" them.
//
// DARK  = TEMPORARILY MAPPED TO LIGHT (see below).
//         Dark mode is intentionally NOT designed yet. The architecture stays
//         theme-aware so a future Dark Mode Design Bible can be dropped in
//         without touching a single component. Do not invent a dark palette.

export interface ColorPalette {
  // Surfaces
  bg:           string;  // warm off-white app background — never pure white
  bgCard:       string;  // white elevated surface
  bgElevated:   string;
  bgInput:      string;
  surfaceMuted: string;  // progress track / input well
  border:       string;
  borderLight:  string;

  // Brand
  primary:      string;
  primaryDim:   string;
  primaryGlow:  string;
  primaryLight: string;
  heroFrom:     string;  // hero gradient start (top-left)
  heroTo:       string;  // hero gradient end (bottom-right)

  // Semantic
  success:      string;
  warning:      string;
  danger:       string;
  amount:       string;  // bill amounts (purple-blue)

  // Pastel accents (Quick Action tiles: soft bg + stronger icon tint)
  pastelGreenBg:  string; pastelGreen:  string;
  pastelBlueBg:   string; pastelBlue:   string;
  pastelPeachBg:  string; pastelPeach:  string;
  pastelPurpleBg: string; pastelPurple: string;

  // Legacy semantic (kept so existing screens keep working)
  income:       string;
  spending:     string;
  bills:        string;
  goals:        string;
  debt:         string;
  subs:         string;

  // Text
  textPrimary:  string;  // soft near-black — never #000
  textSecondary:string;
  textHint:     string;
  textOnPrimary:string;

  // Glass / hero legacy
  glassBase:    string;
  glassDark:    string;
  glassHighlight:string;
  glassText:    string;
  glassBright:  string;

  // Shadow (soft, purple-tinted, never black)
  shadow:       string;

  white:        string;
  black:        string;
}

export const LightColors: ColorPalette = {
  // ── Surfaces ──────────────────────────────────────────────
  bg:           '#F7F6F2',  // warm off-white (Rule 1: never pure white)
  bgCard:       '#FFFFFF',
  bgElevated:   '#FFFFFF',
  bgInput:      '#F3F1FB',
  surfaceMuted: '#F3F1FB',
  border:       '#EFEDE7',  // Rule 9: borders are avoided; kept faint
  borderLight:  '#F3F1EC',

  // ── Brand ─────────────────────────────────────────────────
  primary:      '#7B61FF',
  primaryDim:   '#7B61FF14',
  primaryGlow:  '#7B61FF24',
  primaryLight: '#8B5CF6',
  heroFrom:     '#8A6BF0',
  heroTo:       '#A55EE6',

  // ── Semantic ──────────────────────────────────────────────
  success:      '#34C77B',
  warning:      '#FF9F5A',
  danger:       '#FF6B6B',
  amount:       '#6C63FF',

  // ── Pastels ───────────────────────────────────────────────
  pastelGreenBg:  '#E7F5EC', pastelGreen:  '#3FBF7F',
  pastelBlueBg:   '#E7F0FE', pastelBlue:   '#4B9BFF',
  pastelPeachBg:  '#FDEEE1', pastelPeach:  '#FF9F5A',
  pastelPurpleBg: '#EFE9FE', pastelPurple: '#8B5CF6',

  // ── Legacy semantic ───────────────────────────────────────
  income:       '#34C77B',
  spending:     '#FF6B6B',
  bills:        '#FF9F5A',
  goals:        '#34C77B',
  debt:         '#FF6B6B',
  subs:         '#8B5CF6',

  // ── Text ──────────────────────────────────────────────────
  textPrimary:  '#2B2A3A',  // soft near-black (Rule 11: #000 forbidden)
  textSecondary:'#8E8CA3',
  textHint:     '#B4B2C4',
  textOnPrimary:'#FFFFFF',

  // ── Hero / glass ──────────────────────────────────────────
  glassBase:    '#8A6BF0',
  glassDark:    '#A55EE6',
  glassHighlight:'rgba(255,255,255,0.18)',
  glassText:    'rgba(255,255,255,0.80)',
  glassBright:  '#FFFFFF',

  // Rule 8: shadows are purple-tinted, never black
  shadow:       'rgba(60,50,120,0.08)',

  white:        '#FFFFFF',
  black:        '#000000',
};

// TEMPORARY (approved decision): dark mode maps to the light Design Bible.
// The dark theme is a separate project with its own Design Bible, to be done
// only after the entire app matches the light Bible. Do not design it here.
export const DarkColors: ColorPalette = { ...LightColors };
