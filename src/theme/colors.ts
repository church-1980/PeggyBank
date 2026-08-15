// PeggyBank Color Palettes
//
// LIGHT = the approved PeggyBank Design Bible (design/PeggyBank-Design-Bible.png).
//         Every value here is extracted from that image. Do not "improve" them.
//
// DARK  = the same brand on deep surfaces (added on request). Key-for-key with
//         LightColors, so every themed component switches automatically.
//         Same rules apply: no pure black grounds, no pure-white body text,
//         purple-tinted shadows.

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
  gold:         string;  // goal-complete milestone (Design System §5)
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
  gold:         '#F4B740',
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

// DARK PALETTE — the same PeggyBank brand (purple + mint) on deep, warm-neutral
// surfaces. Mirrors the light Bible's rules: never pure black, never pure white
// text, soft purple-tinted shadows, brand hues brightened just enough to stay
// legible on dark ground. Structure matches LightColors key-for-key so every
// component themes automatically.
export const DarkColors: ColorPalette = {
  // ── Surfaces (deep, slightly purple-tinted — never #000) ──
  bg:           '#14131C',
  bgCard:       '#1E1C28',
  bgElevated:   '#262433',
  bgInput:      '#262433',
  surfaceMuted: '#2B2839',
  border:       '#2F2C3D',
  borderLight:  '#262433',

  // ── Brand (lifted slightly for contrast on dark) ──
  primary:      '#9B85FF',
  primaryDim:   '#9B85FF1F',
  primaryGlow:  '#9B85FF33',
  primaryLight: '#A78BFA',
  heroFrom:     '#7A5CE0',
  heroTo:       '#9350D6',

  // ── Semantic ──
  success:      '#3FD98D',
  warning:      '#FFAE6B',
  danger:       '#FF8080',
  gold:         '#F7C558',
  amount:       '#8B82FF',

  // ── Pastels (dark tinted wells + brighter tints) ──
  pastelGreenBg:  '#17301F', pastelGreen:  '#3FD98D',
  pastelBlueBg:   '#16233A', pastelBlue:   '#6BAEFF',
  pastelPeachBg:  '#33241A', pastelPeach:  '#FFAE6B',
  pastelPurpleBg: '#241F3D', pastelPurple: '#A78BFA',

  // ── Legacy semantic ──
  income:       '#3FD98D',
  spending:     '#FF8080',
  bills:        '#FFAE6B',
  goals:        '#3FD98D',
  debt:         '#FF8080',
  subs:         '#A78BFA',

  // ── Text (soft off-white — never pure #FFF for body) ──
  textPrimary:  '#F1F0F7',
  textSecondary:'#A6A3BC',
  textHint:     '#6E6B82',
  textOnPrimary:'#FFFFFF',

  // ── Hero / glass ──
  glassBase:    '#7A5CE0',
  glassDark:    '#9350D6',
  glassHighlight:'rgba(255,255,255,0.14)',
  glassText:    'rgba(255,255,255,0.80)',
  glassBright:  '#FFFFFF',

  // Purple-tinted shadow, deeper for dark ground
  shadow:       'rgba(8,4,24,0.55)',

  white:        '#FFFFFF',
  black:        '#000000',
};
