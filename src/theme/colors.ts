// PeggyBank Color Palettes
// Both modes share the same emotional goal: calm, warm, readable, safe.
//
// DARK  — "Evening Journal": warm slate, muted navy, restrained glow
// LIGHT — "Morning Pages":  warm off-white, soft cream surfaces, gentle contrast

export interface ColorPalette {
  bg:           string;
  bgCard:       string;
  bgElevated:   string;
  bgInput:      string;
  border:       string;
  borderLight:  string;
  primary:      string;
  primaryDim:   string;
  primaryGlow:  string;
  primaryLight: string;
  income:       string;
  spending:     string;
  bills:        string;
  goals:        string;
  debt:         string;
  subs:         string;
  textPrimary:  string;
  textSecondary:string;
  textHint:     string;
  textOnPrimary:string;
  glassBase:    string;
  glassDark:    string;
  glassHighlight:string;
  glassText:    string;
  glassBright:  string;
  white:        string;
  black:        string;
}

export const DarkColors: ColorPalette = {
  bg:           '#15161E',
  bgCard:       '#1C1D2B',
  bgElevated:   '#22243A',
  bgInput:      '#1C1D2B',
  border:       '#282B40',
  borderLight:  '#323554',
  primary:      '#738AF4',
  primaryDim:   '#738AF414',
  primaryGlow:  '#738AF424',
  primaryLight: '#94A8FF',
  income:       '#4FC4BA',
  spending:     '#DF7D70',
  bills:        '#DC80A4',
  goals:        '#72C28A',
  debt:         '#DF7D70',
  subs:         '#DC80A4',
  textPrimary:  '#E5E6EE',
  textSecondary:'#8A8CA6',
  textHint:     '#54566E',
  textOnPrimary:'#FFFFFF',
  glassBase:    '#5460D4',
  glassDark:    '#3C48B8',
  glassHighlight:'rgba(255,255,255,0.06)',
  glassText:    'rgba(255,255,255,0.68)',
  glassBright:  '#FFFFFF',
  white:        '#FFFFFF',
  black:        '#000000',
};

export const LightColors: ColorPalette = {
  // Warm off-white base — like cream paper, not sterile white
  bg:           '#F6F4F0',
  bgCard:       '#FFFFFF',
  bgElevated:   '#FDFCFA',
  bgInput:      '#FFFFFF',
  border:       '#E6E1D8',
  borderLight:  '#EDE9E2',

  // Primary slightly deeper for light bg contrast (WCAG AA)
  primary:      '#5B6ED8',
  primaryDim:   '#5B6ED814',
  primaryGlow:  '#5B6ED824',
  primaryLight: '#7080E8',

  // Semantic — same hue family, slightly deeper for light bg readability
  income:       '#3AA89F',
  spending:     '#C96059',
  bills:        '#B55C84',
  goals:        '#4E9E65',
  debt:         '#C96059',
  subs:         '#B55C84',

  // Warm dark text on light bg
  textPrimary:  '#1C1D2B',
  textSecondary:'#6B6C82',
  textHint:     '#A8AABF',
  textOnPrimary:'#FFFFFF',

  // Glass card — keep same warm indigo, it reads well on both modes
  glassBase:    '#5460D4',
  glassDark:    '#3C48B8',
  glassHighlight:'rgba(255,255,255,0.12)',
  glassText:    'rgba(255,255,255,0.78)',
  glassBright:  '#FFFFFF',

  white:        '#FFFFFF',
  black:        '#000000',
};
