# PeggyBank Design System — reverse-engineered from the Design Bible
**Source of truth:** the approved dashboard screenshot (`design/` — see note). Every value below is extracted from that image. This document governs every screen.

> **Accuracy note:** values are read from a compressed phone screenshot, so exact hex codes and pixel sizes are **best estimates** and may need ±small tuning against the real design once implemented. Where I'm estimating, it's marked ~. Structure, hierarchy, and proportion are high-confidence; precise hex/px are the tune-later part.

---

## 1. Color palette

### Brand
| Token | Value (est.) | Use |
|-------|--------------|-----|
| `primary` | ~`#7B61FF` | brand purple — active nav, FAB, "See all", accents |
| `primaryDark` | ~`#6A4DF0` | pressed states |
| `heroGradient` | ~`#8A6BF0` → `#A55EE6` (top-left → bottom-right) | Safe-to-Spend hero card |
| `notificationBadge` | ~`#7B61FF` | bell badge |

### Backgrounds & surfaces
| Token | Value (est.) | Use |
|-------|--------------|-----|
| `background` | ~`#F7F6F2` | warm off-white app background (never pure white) |
| `surface` | `#FFFFFF` | cards (goals, bills, quick-add wrapper) |
| `surfaceMuted` | ~`#F3F1FB` | inner track / subtle fills |

### Text
| Token | Value (est.) | Use |
|-------|--------------|-----|
| `textPrimary` | ~`#2B2A3A` | titles, amounts, names (soft near-black, never `#000`) |
| `textSecondary` | ~`#8E8CA3` | subtitles, dates, "of $X" |
| `textOnHero` | `#FFFFFF` | text on the purple hero |
| `textOnHeroMuted` | ~`rgba(255,255,255,0.8)` | hero secondary text |

### Pastel accents (Quick Add tiles + icon tints)
| Concept | Tile bg (est.) | Icon tint (est.) |
|---------|----------------|------------------|
| Add Expense (green) | ~`#E7F5EC` | ~`#3FBF7F` |
| Add Income (blue) | ~`#E7F0FE` | ~`#4B9BFF` |
| Scan Receipt (peach) | ~`#FDEEE1` | ~`#FF9F5A` |
| Add to Goal (purple) | ~`#EFE9FE` | ~`#8B5CF6` |

### Semantic / progress
| Token | Value (est.) | Use |
|-------|--------------|-----|
| `success` | ~`#34C77B` | positive progress, "doing great" |
| `warning` | ~`#FF9F5A` | mid states |
| `danger` | ~`#FF6B6B` | low progress (New Car 28% bar), overspend |
| `billAmount` | ~`#6C63FF` | bill amounts (purple-blue), right-aligned |

> Progress bars are **per-goal colored** (teal/green, coral, teal) — the bar color reflects the goal, not a single global color. This is compatible with our existing `GoalBar` color logic (kept, restyled to these hues).

---

## 2. Typography scale
Estimated sizes; strong hierarchy, generous line-height, muted helper text.
| Style | Size / weight (est.) | Use |
|-------|----------------------|-----|
| `heroAmount` | ~40 / 800 | "$342.68" |
| `greeting` | ~21 / 700 | "Good morning, Peggy!" |
| `sectionHeader` | ~17 / 700 | "Quick Add", "Your Goals" |
| `cardTitle` | ~16 / 700 | goal name, bill name |
| `body` | ~14 / 500 | general |
| `amountRow` | ~15 / 700 | bill amount |
| `helper` | ~13 / 500 | "of $3,000", "Due tomorrow", subtitle |
| `seeAll` | ~13 / 600 (primary) | "See all" |
| `percent` | ~14 / 700 | "72%" |
| `navLabel` | ~11 / 600 | tab labels |

---

## 3. Radius
| Token | Value (est.) |
|-------|--------------|
| Hero card | ~26 |
| Standard card (goal, bills wrapper) | ~20 |
| Quick-add pastel tile | ~18 |
| Icon badge (square) | ~12–14 |
| Circular thumbnail / bill icon | full circle |
| Pill button ("View full breakdown") | full |
| Progress bar | full |

Current theme has `Radius.lg = 22`, `md = 16`, `sm = 10`, `full = 999` — close; will add a `hero` (~26) and `card` (~20) token.

---

## 4. Shadows
Soft, low-opacity, no harsh edges:
- Card shadow: `color rgba(60,50,120,~0.08)`, offset y ~6, blur/radius ~16, elevation ~3.
- Hero shadow: slightly deeper, purple-tinted, offset y ~10, blur ~24.
- No borders on cards (shadow does the separation; "no heavy borders").

---

## 5. Spacing system
| Token | Value (est.) |
|-------|--------------|
| Screen horizontal padding | ~20 |
| Between sections | ~24 |
| Section header → content | ~12 |
| Between cards in a list | ~12 |
| Card inner padding | ~16 |
| Icon ↔ text gap | ~12 |

Existing `Spacing` (4/8/16/24/36/52) covers this.

---

## 6. Icons & containers
- **Quick Add:** icon ~26 centered in a ~48 pastel rounded square (radius ~14).
- **Goal thumbnail:** ~52 **circular** image/illustration (photographic in the bible — see §12 risk).
- **Bill row icon:** ~20 glyph in a ~40 circular tinted badge.
- **Section "See all":** text link, primary color, no icon except a small chevron.
- All concept icons resolve from the **single icon registry** (already built) → premium PNG when available, Ionicon fallback until then.
- Extends our existing `PeggyIconBadge` (IconBadge) — needs a **circular** variant + a **pastel-tile** variant.

---

## 7. Buttons
- **FAB** (center nav): ~56 purple circle, white `+`, soft shadow.
- **Pill button** ("View full breakdown ⌄"): semi-transparent white on hero, full radius, ~13 text + chevron.
- **Primary button** (forms elsewhere): purple fill, white text, radius ~16, comfortable height (~52).

---

## 8. Progress bars (`PeggyProgressBar`)
- Full-radius track (light `surfaceMuted`), colored fill per goal.
- Animated fill on load ("feel alive").
- Percentage shown as bold text to the right of the row (not inside the bar).
- Hero has its own thin light-on-purple variant.
- **No airplane/island/journey SVG** — confirmed, already removed.

---

## 9. List rows (`PeggyListRow`) — Coming Up
- Left: circular tinted icon badge (~40).
- Middle: bold name + muted due date (two lines).
- Right: bold colored amount, right-aligned.
- Comfortable vertical padding (~14), thin/no divider, no heavy border.

---

## 10. Section headers (`PeggySectionHeader`)
- Left: bold section title (~17).
- Right: "See all" in primary purple (optional, ~13).
- Consistent margin above (~24) and below (~12).

---

## 11. Empty states (`PeggyEmptyState`)
Not shown in the bible, but must match the language: centered soft illustration/icon in a tinted circle, primary line (`textPrimary`), helper line (`textSecondary`), optional pill button. (Derived, flagged as an inference — will confirm on approval.)

---

## 12. Illustration style + ASSET DEPENDENCIES (the honest risk to 95% fidelity)
The bible relies on artwork that **does not exist in the repo yet**. These are the gap between "structure matches" and "95% pixel fidelity":

1. **Hero piggy-bank illustration** (pink 3D piggy + gold coin) — needs a PNG/SVG asset.
2. **Goal thumbnails are photographic circles** (tropical beach, red car, house). This conflicts with the earlier "no custom photos, icon-only" decision. To match the bible exactly we need either (a) a set of illustrated circular goal images, or (b) per-goal photos. **Needs a decision + assets.**
3. **Quick Add icons** (receipt, income, camera, target) — the 4 need premium artwork.
4. **The 15 premium concept PNGs** — still 0 generated.
5. **Nav bar icons** (home, spending, bills, more) — premium set.
6. **Gradient** — needs `expo-linear-gradient` (not installed; I'd add it) for the hero.

Without these, I can reproduce **layout, color, type, spacing, cards, shadows, radius, progress bars, and hierarchy** faithfully, but the **artwork slots will show placeholders/Ionicons** until the assets are generated. That's the one place I'll hit a wall on exact fidelity — and per your rule I'm reporting it rather than inventing.

---

## 13. Component hierarchy → shared components to build
| Component | Built from | Status |
|-----------|-----------|--------|
| `PeggyScreen` | background + safe padding + vertical rhythm | new |
| `PeggyCard` | white surface, radius ~20, soft shadow, no border | new |
| `PeggySectionHeader` | title + "See all" | new |
| `HeroBalanceCard` | purple gradient, big amount, thin bar, piggy slot, pill | new (needs gradient lib + piggy asset) |
| `QuickActionGrid` + `PeggyQuickActionCard` | pastel tile + icon + label | new (needs 4 icons) |
| `GoalProgressCard` | thumbnail + title + amount + `PeggyProgressBar` + % + encouragement | restyle existing |
| `UpcomingBillsCard` + `PeggyListRow` | circular icon + name/date + amount | new |
| `PeggyProgressBar` | animated colored fill | from existing `GoalBar` |
| `PeggyIconBadge` | circular + square + pastel-tile variants | from existing `IconBadge` |
| `PeggyButton` | primary / pill / FAB | new |
| `PeggyInput` | for form screens | new (style inferred; confirm on those screens) |
| `PeggyEmptyState` | tinted icon + text + button | new (inferred) |

---

## 14. Proposed build order (after you approve THIS doc)
1. Add design tokens to `src/theme` (colors, hero/card radius, shadows) — extend, don't break existing.
2. Build the shared components above.
3. Rebuild **Dashboard** from them → screenshots → your approval.
4. Then Add Expense → Goals → Bills → Spending → remaining screens, each gated on approval.
Visual only. Functionality untouched. Tests green at each step.

---

## Open decisions I need from you before building
1. **Goal thumbnails:** photographic circles (as in the bible) or illustrated icons from the registry? (Bible shows photos — confirm, since it reverses our earlier "no photos" call.)
2. **Assets:** generate the artwork (15 concept PNGs + piggy + 4 quick-add + nav) before or during the redesign? Structure can land first with placeholders, but exact fidelity needs them.
3. OK to add **`expo-linear-gradient`** for the hero gradient?
