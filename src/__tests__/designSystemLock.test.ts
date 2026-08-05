import fs from 'fs';
import path from 'path';

/**
 * DESIGN SYSTEM LOCK — automated ratchet (CLAUDE.md §5).
 *
 * Screens must render appearance through the canonical components, never by
 * importing premium art directly or by reaching into the retired peggyIcons
 * registry. This test FAILS if a *new* screen introduces such a violation.
 *
 * The allow-lists below capture the screens that predate the lock and are still
 * awaiting migration. They may only SHRINK. Never add a screen to make a new
 * violation pass — migrate the screen to PeggyIconFrame / PeggyAvatar instead.
 */

const SCREENS_DIR = path.join(__dirname, '..', 'screens');

// Direct premium-art import (must go through PeggyIconFrame / PeggyAvatar).
const DIRECT_ART = /require\([^)]*(peggy-icons|peggy-mascot)/;
// Reaching into the retired icon registry / old PeggyIcon (must use iconRegistry).
const RETIRED_REGISTRY = /from ['"][^'"]*(data\/peggyIcons|components\/PeggyIcon)['"]/;

// Screens that predate the lock. THIS LIST MAY ONLY SHRINK.
const ART_ALLOWLIST = new Set<string>(['DashboardScreen.tsx', 'OnboardingScreen.tsx']);
const REGISTRY_ALLOWLIST = new Set<string>([]);

function screensMatching(re: RegExp): string[] {
  return fs
    .readdirSync(SCREENS_DIR)
    .filter((f) => f.endsWith('.tsx'))
    .filter((f) => re.test(fs.readFileSync(path.join(SCREENS_DIR, f), 'utf8')));
}

describe('Design System Lock', () => {
  it('no NEW screen imports premium art directly (use PeggyIconFrame / PeggyAvatar)', () => {
    const offenders = screensMatching(DIRECT_ART).filter((f) => !ART_ALLOWLIST.has(f));
    expect(offenders).toEqual([]);
  });

  it('no NEW screen imports the retired peggyIcons registry (use src/data/iconRegistry)', () => {
    const offenders = screensMatching(RETIRED_REGISTRY).filter((f) => !REGISTRY_ALLOWLIST.has(f));
    expect(offenders).toEqual([]);
  });

  it('allow-listed screens still exist (keep the ratchet honest)', () => {
    for (const f of ART_ALLOWLIST) {
      expect(fs.existsSync(path.join(SCREENS_DIR, f))).toBe(true);
    }
  });
});
