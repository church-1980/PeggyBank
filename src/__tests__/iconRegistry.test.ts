import { ICON_REGISTRY, IconKey, iconLabel } from '../data/iconRegistry';

/**
 * Registry integrity (Charter: icon pipeline). Guards the invariants the whole
 * app relies on: every concept resolves, statuses are valid, and every pending
 * concept renders the ONE shared placeholder asset (so a swap is a one-liner and
 * never changes layout).
 */
describe('icon registry integrity', () => {
  const keys = Object.keys(ICON_REGISTRY) as IconKey[];

  it('has entries and every one is well-formed', () => {
    expect(keys.length).toBeGreaterThanOrEqual(30);
    for (const k of keys) {
      const e = ICON_REGISTRY[k];
      expect(['ready', 'pending']).toContain(e.status);
      expect(e.image).toBeTruthy();          // always an asset, never undefined
      expect(e.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(typeof e.ionicon).toBe('string');
      expect(iconLabel(k).length).toBeGreaterThan(0);
    }
  });

  it('all pending concepts share exactly one placeholder asset', () => {
    const pending = keys.filter((k) => ICON_REGISTRY[k].status === 'pending');
    expect(pending.length).toBeGreaterThan(0);
    const distinctImages = new Set(pending.map((k) => ICON_REGISTRY[k].image));
    expect(distinctImages.size).toBe(1);
  });

  it('ready concepts do not use the placeholder asset', () => {
    const pendingImage = ICON_REGISTRY.settings.image; // a known pending entry
    const ready = keys.filter((k) => ICON_REGISTRY[k].status === 'ready');
    for (const k of ready) {
      expect(ICON_REGISTRY[k].image).not.toBe(pendingImage);
    }
  });
});
