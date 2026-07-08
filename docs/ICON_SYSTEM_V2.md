# PeggyBank Icon System v2.0 — Polish Pass (files changed)

Visual consistency pass. No navigation, layout, typography, color, or spacing
redesign — only icon sizing, one standard container, and PNG-readiness.

## What changed

### 1. Standardized icon sizes (STEP 2)
`src/theme/index.ts` — added the ONLY allowed icon sizes:
- `IconSize.sm = 20` (default: list rows, chips, pickers)
- `IconSize.md = 24`
- `IconSize.lg = 28` (detail sheets / focused single icon)
- `IconSize.xl = 36` (hero / onboarding)
- `IconBadgeSize = 36` (standard container size)

Raw values (15/16/18/22/28…) for concept icons were removed in favor of these.

### 2. One standard container (STEP 3)
`src/components/IconBadge.tsx` — NEW. The single container for every category/
goal concept icon: a soft rounded square (`Radius.sm`) tinted with the concept
color, glyph centered. Screens no longer build ad-hoc icon wrappers.

### 3. PNG-ready registry (STEP 6)
`src/data/iconRegistry.ts` — `IconEntry` now has an optional `image?`. When the
15 premium PNGs land, add one `image: require(...)` line per bucket **here only**
and every screen upgrades automatically (IconBadge prefers `image`, falls back to
the Ionicon). Added `goalTypeIconKey` / `categoryIconKey` resolvers.

`src/data/goalTypes.ts`, `src/data/categories.ts` — each entry now carries an
`iconKey` (its registry bucket), derived centrally. Labels/emoji/colors unchanged.

### 4. Screens routed through IconBadge
Same concept now renders at the same size in the same container on:
- `src/screens/ExpensesScreen.tsx` — history rows + detail sheet
- `src/screens/AddExpenseScreen.tsx` — category picker
- `src/screens/GoalsScreen.tsx` — goal cards (done-state checkmark preserved) + type picker
- `src/screens/MonthlyBreakdownScreen.tsx` — category rows

## Files changed
| File | Change |
|------|--------|
| `src/theme/index.ts` | Added `IconSize` + `IconBadgeSize` |
| `src/components/IconBadge.tsx` | NEW standard container, registry-resolving |
| `src/data/iconRegistry.ts` | `image?` field + iconKey resolvers |
| `src/data/goalTypes.ts` | Added derived `iconKey` |
| `src/data/categories.ts` | Added derived `iconKey` |
| `src/screens/ExpensesScreen.tsx` | Rows + detail sheet → IconBadge |
| `src/screens/AddExpenseScreen.tsx` | Category picker → IconBadge |
| `src/screens/GoalsScreen.tsx` | Goal cards + type picker → IconBadge |
| `src/screens/MonthlyBreakdownScreen.tsx` | Category rows → IconBadge |

## Deliberately NOT done (needs its own approval)
- **STEP 7 — Subscriptions:** `SubscriptionsScreen.tsx` still has its own brand
  icon map (Netflix/Spotify/…). These are brand glyphs, not concept buckets;
  folding them into the registry/design language is a separate task.
- **STEP 8 — Goal widget redesign:** gated on "after the icon library is
  complete." The current color-climbing bar stays for now.
- **Weekly Check-In insight icons:** mixed concept + generic glyphs; left as-is
  to avoid touching non-category iconography this pass.
- Dead styles (`iconCircle`, `catIconWrap`, `catIcon`, `sheetIconWrap`) are now
  unused but left in place to avoid noise; can be cleaned in a later pass.

## Tests
100/100 passing. Typecheck clean on changed files.

## The PNG flip (when assets arrive)
1. Drop the 15 PNGs into `assets/peggy-icons/`.
2. Add `image: require('../../assets/peggy-icons/<key>.png')` per bucket in
   `iconRegistry.ts`.
3. Done — every screen shows the premium art at one standard size in one
   standard container. No screen edits.
