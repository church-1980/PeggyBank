import { DarkColors, LightColors, ColorPalette } from '../theme/colors';
import { Spacing, Radius, Typography } from '../theme';

const REQUIRED_KEYS: (keyof ColorPalette)[] = [
  'bg', 'bgCard', 'bgElevated', 'bgInput',
  'border', 'borderLight',
  'primary', 'primaryDim', 'primaryGlow', 'primaryLight',
  'income', 'spending', 'bills', 'goals', 'debt', 'subs',
  'textPrimary', 'textSecondary', 'textHint', 'textOnPrimary',
  'glassBase', 'glassDark', 'glassHighlight', 'glassText', 'glassBright',
  'white', 'black',
];

describe('DarkColors palette', () => {
  it('has all required keys', () => {
    for (const key of REQUIRED_KEYS) {
      expect(DarkColors[key]).toBeDefined();
    }
  });

  it('has no undefined values', () => {
    for (const key of REQUIRED_KEYS) {
      expect(DarkColors[key]).not.toBeUndefined();
    }
  });

  it('all values are strings', () => {
    for (const key of REQUIRED_KEYS) {
      expect(typeof DarkColors[key]).toBe('string');
    }
  });

  it('white is #FFFFFF', () => {
    expect(DarkColors.white).toBe('#FFFFFF');
  });

  it('black is #000000', () => {
    expect(DarkColors.black).toBe('#000000');
  });
});

describe('LightColors palette', () => {
  it('has all required keys', () => {
    for (const key of REQUIRED_KEYS) {
      expect(LightColors[key]).toBeDefined();
    }
  });

  it('has no undefined values', () => {
    for (const key of REQUIRED_KEYS) {
      expect(LightColors[key]).not.toBeUndefined();
    }
  });

  it('all values are strings', () => {
    for (const key of REQUIRED_KEYS) {
      expect(typeof LightColors[key]).toBe('string');
    }
  });

  it('light and dark have same set of keys', () => {
    const darkKeys  = Object.keys(DarkColors).sort();
    const lightKeys = Object.keys(LightColors).sort();
    expect(darkKeys).toEqual(lightKeys);
  });
});

describe('Spacing tokens', () => {
  it('xs is a number', () => expect(typeof Spacing.xs).toBe('number'));
  it('sm is a number', () => expect(typeof Spacing.sm).toBe('number'));
  it('md is a number', () => expect(typeof Spacing.md).toBe('number'));
  it('lg is a number', () => expect(typeof Spacing.lg).toBe('number'));
  it('xl is a number', () => expect(typeof Spacing.xl).toBe('number'));
  it('xs < sm < md < lg < xl', () => {
    expect(Spacing.xs).toBeLessThan(Spacing.sm);
    expect(Spacing.sm).toBeLessThan(Spacing.md);
    expect(Spacing.md).toBeLessThan(Spacing.lg);
    expect(Spacing.lg).toBeLessThan(Spacing.xl);
  });
});

describe('Radius tokens', () => {
  it('sm is a number', () => expect(typeof Radius.sm).toBe('number'));
  it('md is a number', () => expect(typeof Radius.md).toBe('number'));
  it('lg is a number', () => expect(typeof Radius.lg).toBe('number'));
  it('xl is a number', () => expect(typeof Radius.xl).toBe('number'));
  it('full is 999',    () => expect(Radius.full).toBe(999));
});

describe('Typography tokens', () => {
  const keys = ['hero', 'h1', 'h2', 'h3', 'body', 'bodyBold', 'small', 'smallBold', 'caption', 'label'];
  for (const key of keys) {
    it(`${key} has a fontSize`, () => {
      expect(typeof (Typography as any)[key]?.fontSize).toBe('number');
    });
  }
});
