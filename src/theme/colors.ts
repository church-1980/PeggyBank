// The Plastic Surgeon — Color System
// "Workshop Night" (dark) and "Workshop Day" (light)
//
// Visual goal: clinical enough to feel trustworthy, warm enough to feel
// approachable. The orange primary mirrors Jester's Workshop brand energy.
//
// Palette rules:
//   60% — neutral dark/light surface (bg, cards)
//   30% — supporting tones (borders, secondary text)
//   10% — accent + semantic (orange, teal, amber, red)
//
// Semantic colors map to printer health states:
//   healthy  — good condition, completed tasks
//   warning  — maintenance due, attention needed
//   critical — overdue, urgent, safety issue
//   info     — tips, guides, neutral information
//   premium  — locked/premium feature indicators

export interface ColorPalette {
  // Surfaces
  bg:           string;
  bgCard:       string;
  bgElevated:   string;
  bgInput:      string;

  // Borders
  border:       string;
  borderLight:  string;

  // Brand primary — Jester orange
  primary:      string;
  primaryDim:   string;
  primaryGlow:  string;
  primaryLight: string;

  // Printer health semantic colors
  healthy:      string;   // good, complete, pass
  warning:      string;   // due soon, attention
  critical:     string;   // overdue, urgent, fail
  info:         string;   // tips, guides, informational
  premium:      string;   // premium feature lock

  // Text hierarchy
  textPrimary:  string;
  textSecondary:string;
  textHint:     string;
  textOnPrimary:string;

  // Hero card (printer health score card)
  glassBase:     string;
  glassDark:     string;
  glassHighlight:string;
  glassText:     string;
  glassBright:   string;

  white:  string;
  black:  string;
}

// ─────────────────────────────────────────────
// DARK MODE — "Workshop Night"
// Deep charcoal — the inside of a workshop at night.
// Everything is muted so the orange accent pops with purpose.
// ─────────────────────────────────────────────
export const DarkColors: ColorPalette = {
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

  glassBase:     '#E85820',
  glassDark:     '#C04010',
  glassHighlight:'rgba(255,255,255,0.07)',
  glassText:     'rgba(255,255,255,0.72)',
  glassBright:   '#FFFFFF',

  white: '#FFFFFF',
  black: '#000000',
};

// ─────────────────────────────────────────────
// LIGHT MODE — "Workshop Day"
// Warm paper white — clean, clinical, readable.
// Same orange accent, deeper for contrast on light bg.
// ─────────────────────────────────────────────
export const LightColors: ColorPalette = {
  bg:           '#F4F3F0',
  bgCard:       '#FFFFFF',
  bgElevated:   '#FDFCFA',
  bgInput:      '#FFFFFF',

  border:       '#E4E0D8',
  borderLight:  '#EDE9E2',

  primary:      '#E85820',
  primaryDim:   '#E8582014',
  primaryGlow:  '#E8582022',
  primaryLight: '#FF7840',

  healthy:      '#1FA888',
  warning:      '#D4900F',
  critical:     '#C53040',
  info:         '#2F7FE0',
  premium:      '#8A55E0',

  textPrimary:  '#1A1D2E',
  textSecondary:'#6B6C82',
  textHint:     '#A8AABF',
  textOnPrimary:'#FFFFFF',

  glassBase:     '#E85820',
  glassDark:     '#C04010',
  glassHighlight:'rgba(255,255,255,0.15)',
  glassText:     'rgba(255,255,255,0.85)',
  glassBright:   '#FFFFFF',

  white: '#FFFFFF',
  black: '#000000',
};
