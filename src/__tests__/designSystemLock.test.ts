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

// Emoji in product UI (forbidden once a screen is migrated/approved).
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/u;

// Screens that predate the lock. THIS LIST MAY ONLY SHRINK.
const ART_ALLOWLIST = new Set<string>(['OnboardingScreen.tsx']);
const REGISTRY_ALLOWLIST = new Set<string>([]);

// Screens that have been MIGRATED to PeggyBank OS and are held to the full
// standard (no emoji, no direct art, no retired registry). GROWS as screens
// migrate in Phase 7. Empty now — no product screen is migrated yet.
const MIGRATED_SCREENS = new Set<string>([]);

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

  it('MIGRATED screens contain no emoji and no direct art imports', () => {
    for (const f of MIGRATED_SCREENS) {
      const src = fs.readFileSync(path.join(SCREENS_DIR, f), 'utf8');
      expect({ screen: f, hasEmoji: EMOJI.test(src) }).toEqual({ screen: f, hasEmoji: false });
      expect({ screen: f, hasDirectArt: DIRECT_ART.test(src) }).toEqual({ screen: f, hasDirectArt: false });
    }
  });
});
