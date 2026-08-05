# PeggyBank — Design Bible v2.0 (LOCKED)

**Locked at tag:** `design-system-foundation-lock-20260804`
**Status:** Foundation complete. Screen migration pending (Phase 7).
**Governing rule (CLAUDE.md §5):** *No visual component may be created inside a
screen. New visual patterns are added to the design system first, documented
here, and only then used across the app.*

This document is the permanent reference. If it isn't written here, it isn't in
the system. Code is the implementation; this is the contract.

---

## 0. Source-of-truth files
| Concern | File |
|---|---|
| Color / type / spacing / radii / shadow / icon scale | `src/theme/index.ts`, `src/theme/colors.ts` |
| Concept icon registry | `src/data/iconRegistry.ts` |
| Canonical components | `src/components/peggy/` (barrel: `index.ts`) |
| Live gallery (dev screen) | `src/screens/ComponentShowcaseScreen.tsx` (More ▸ Design System) |
| Icon art style | `docs/PEGGYBANK_ICON_STYLE.md` |
| Icons still needed | `docs/PEGGYBANK_ICON_MANIFEST.md` |
| Automated lock | `src/__tests__/designSystemLock.test.ts` |

---

## 1. Color (from the approved Light Design Bible)
Screens read colors via `useColors()` — never hard-coded hex.

| Token | Value | Use |
|---|---|---|
| `bg` | `#F7F6F2` | warm app background (never pure white) |
| `bgCard` / `bgElevated` | `#FFFFFF` | card & sheet surface |
| `bgInput` / `surfaceMuted` | `#F3F1FB` | inputs, progress tracks |
| `border` | `#EFEDE7` | faint hairlines |
| `primary` | `#7B61FF` | brand purple — primary actions only |
| `heroFrom → heroTo` | `#8A6BF0 → #A55EE6` | hero gradient |
| `success` | `#34C77B` | positive / income |
| `warning` | `#FF9F5A` | attention |
| `danger` | `#FF6B6B` | destructive / overspend |
| `gold` | `#F4B740` | goal-complete milestone |
| pastels | green/blue/peach/purple `*Bg` + tint | quick-action tiles |
| `textPrimary` | `#2B2A3A` | body (never `#000`) |
| `textSecondary` | `#8E8CA3` | supporting |
| `textHint` | `#B4B2C4` | placeholders, dates |

**Concept colors** live in the icon registry (`ICON_REGISTRY[key].color`) so a
concept's color is the same wherever it appears.

Palette discipline: 60% neutral warm surfaces · 30% supporting tones · 10% accent.

## 2. Typography (`Typography` in `theme/index.ts`)
`heroAmount` 40/800 · `h1` 28/700 · `greeting` 21/700 · `h2` 22/700 · `h3` 18/700 ·
`sectionHeader` 17/700 · `cardTitle` 16/700 · `body` 16/400 · `helper` 13/500 ·
`caption` 12/400 · `label` 11/600 (uppercase) · `navLabel` 11/600.
Money is always the boldest thing in its container. Never introduce a new size.

## 3. Spacing (`Spacing`) — 8pt grid
`xs 4 · sm 8 · md 16 · lg 24 · xl 36 · xxl 52`. No raw margins outside this scale.

## 4. Radii (`Radius`)
`sm 12` (icon tile) · `md 16` (buttons/inputs) · `tile 18` (quick action) ·
`lg 20` (card) · `hero 26` · `xl 30` · `full 999` (pills/circles).

## 5. Shadows (`Shadow`) — soft, purple-tinted, never black
`card` (standard lift) · `hero` (deeper) · `soft` (modals) · `glow` (accent).
No screen defines its own shadow.

## 6. Icon rules — ONE language, ONE pipeline
**Pipeline (no exceptions):** `screen → concept ID → ICON_REGISTRY → PeggyIconFrame`.
A screen never imports an icon PNG and never draws its own circle/tile.

**Artwork spec** (see `docs/PEGGYBANK_ICON_STYLE.md`): matte soft-3D, one subject,
transparent + borderless, one soft grounding shadow, identical camera angle /
perspective / lighting / material across every icon. No baked-in circle/tile, no
checkerboard, no sparkles, no pedestal. Readable down to 28px.

**Semantic sizes (`IconFrameSize`) — request a NAME, never a number:**
`compact 36 · standard 44 · card 52 · feature 64 · hero 84`.

**Containers (`PeggyIconFrame`):** `circle` (list rows, goals, avatars) or `tile`
(quick actions, grids). Owns tint, padding, shadow, and the `selected` / `disabled`
states. `PeggyIconBadge` is a deprecated shim over it.

**Fallback:** a concept with `status: 'pending'` renders its Ionicon inside the
same frame until premium art lands. Ionicons are otherwise allowed ONLY as small
UI affordances (chevron, back, close, info, bell) — never as concept art.

## 7. Avatar rules (`PeggyAvatar`) — one circle, always
The component draws the one and only circle; the asset is transparent + borderless.
Modes in priority order: **photo** (`cover`) → **brand** (Peggy logo, `contain`,
never cropped) → **initial**. Optional notification `badgeCount` and `dotColor`
status dot. Never nest an image that already contains a circle. There is exactly
one avatar implementation.

## 8. Page & navigation
- **`PeggyPage`** owns safe-area, background, page margins, scroll, and footer
  (bottom nav / sticky action) clearance. Screens never set their own SafeAreaView,
  background, or page padding.
- **`PeggyHeader`** — variants `standard` (back + title + action), `large` (big
  title + subtitle), `dashboard` (avatar + greeting + action). Titles left-aligned.
- **`PeggyBottomNav`** — Home · Camera · More; Camera is the elevated center.
- **`PeggyBackButton`** — the one back affordance (wraps `PeggyIconButton`).

## 9. Cards, rows, lists
- **`PeggyCard`** (radius 20, `Shadow.card`) / **`PeggyHeroCard`** (gradient, radius 26).
- **`PeggySection`** + **`PeggySectionHeader`** — the one section rhythm & "See all".
- **`PeggyListRow`** — icon frame + title + subtitle + amount/right. One row height family (`RowHeight`: compact 56 / standard 68 / comfortable 80).
- **`PeggyGoalCard`** — icon frame + name + % + milestone-banded progress + required encouragement line.
- **`PeggyStatCard`**, **`PeggyPickerTile`**, **`PeggyQuickActionCard`** — as in the gallery.
- **`PeggyDivider`** between rows.

## 10. Controls
`PeggyButton` (primary/pill/fab — one primary per screen), `PeggyIconButton`
(plain/soft/solid), `PeggyInput`, `PeggyCurrencyInput`, `PeggyChip`, `PeggyBadge`,
`PeggyProgressBar` (milestone bands: 0–24 coral · 25–49 orange · 50–74 purple ·
75–99 green · 100 gold).

## 11. States
`PeggyEmptyState` (encouraging, one action) · `PeggyLoadingState` (spinner + calm
line) · `PeggyErrorState` (plain language + single retry). Every list/async surface
uses these — no bespoke empty/loading/error markup.

## 12. Overlays
`PeggyModal` (one bottom-sheet: dim backdrop, grab handle, safe-area bottom) ·
`PeggyConfirmationModal` (built on it; normal + destructive). No other modal style.

## 13. Motion (`Motion`) — to be finalized in Phase 5
Durations: `quick 150` (tap), `standard 220` (transitions), `enter 280` (modals in),
`exit 200` (modals out). Easing/spring specifics are standardized in Phase 5; until
then, use these durations and native-driver fades/springs only. No ad-hoc timings.

## 14. Accessibility
Body ≥16pt, generous line height (dyslexia-friendly). Touch targets ≥44px.
Icon frames and avatars carry accessibility labels via the registry. High contrast
text tokens only. `Read Step Aloud` (TTS) planned per the app charter.

## 15. Component index (the ONLY approved visual building blocks)
`PeggyPage, PeggyScreen, PeggyHeader, PeggyBackButton, PeggyBottomNav, PeggyCard,
PeggyHeroCard, PeggySection, PeggySectionHeader, PeggyDivider, PeggyIconFrame,
PeggyAvatar, PeggyGoalCard, PeggyQuickActionCard, PeggyListRow, PeggyStatCard,
PeggyPickerTile, PeggyButton, PeggyIconButton, PeggyInput, PeggyCurrencyInput,
PeggyChip, PeggyBadge, PeggyProgressBar, PeggyEmptyState, PeggyLoadingState,
PeggyErrorState, PeggyModal, PeggyConfirmationModal` (+ deprecated `PeggyIconBadge`
shim, `PeggyIllustration` legacy slot).

---

## 16. Screen migration (Phase 7) — order & gate
Each screen is rebuilt from the components above; **no screen moves on until it
visually matches this Bible and is approved.**

`Dashboard → More → Camera → Profile → Goals → Bills → Spending → Income →
Reports/Monthly Breakdown → Calendar → Weekly Check-In → Currency → Payday →
Export/Backup → Settings → Appearance → NavCustomize → remaining`.

## 17. Acceptance standard
A screen is done only when it uses `PeggyPage`; its header, cards, rows, icons,
spacing, and type all come from the system; its empty/loading/error states match;
it has **no** direct PNG imports, hand-rolled circles, arbitrary icon sizes, raw
color/spacing values, or concept Ionicons; and it visually continues from the
screen before it.

The app is complete when: every page feels made by one team; every icon belongs to
one language; every interaction follows one motion system; and **adding a feature
never requires inventing a new visual style.**
