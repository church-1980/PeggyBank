# PeggyBank — Uniformity Audit (Phase 1)

**Date:** 2026-08-04
**Author:** Lead engineer pass, pre-migration
**Rule this audit serves:** _If two elements serve the same purpose, they must use the same shared component. Screens provide content; the design system provides appearance._

> This document is **read-only analysis**. No screens were changed to produce it. It is the map we agree on before any migration begins.

---

## 0. Backup (verified remote)

| Item | Value |
|---|---|
| Source branch | `feature/three-tab-camera-profile` |
| HEAD commit | `b973bf6` |
| Backup tag | `pre-uniformity-2026-08-04` **and** `pre-uniformity-template-backup-20260804` |
| Backup branch | `backup/pre-uniformity-2026-08-04` **and** `backup/pre-uniformity-template-20260804` |
| Remote | Pushed to `origin` (github.com/church-1980/PeggyBank), both tags + branches confirmed via `git ls-remote` |

Restore point is safe. Nothing below is destructive.

---

## 1. THE HEADLINE FINDING

**Only 1 of 23 screens uses the shared PeggyBank component library.**

- Screens that import from `src/components/peggy/…`: **`DashboardScreen` only.**
- The other **22 screens** are hand-built from raw React Native primitives.
- **187** direct `Ionicons` usages across all 23 screens.
- **22** separate `StyleSheet.create` blocks — nearly one design system re-invented per screen.
- **21** screens manage their own `SafeAreaView` / page shell.

**Visible consequence:** every screen was styled in isolation, so no two pages share a header, a card, a row, an icon treatment, or spacing rhythm. This — not any single icon — is why the app "looks like scotch tape." The shared system was built, then only ever wired into one screen.

---

## 2. Active screens (23) → proposed archetype

| # | Screen | Proposed archetype | Uses shared lib? |
|---|---|---|---|
| 1 | DashboardScreen | Dashboard | ✅ (partial) |
| 2 | MoreScreen | List (grid) | ❌ raw |
| 3 | ProfileScreen | Profile | ❌ raw |
| 4 | QuickCaptureScreen | Capture | ❌ raw |
| 5 | AddExpenseScreen | Form | ❌ raw |
| 6 | AddIncomeScreen | Form | ❌ raw |
| 7 | BillsScreen | List | ❌ raw |
| 8 | GoalsScreen | List | ❌ raw |
| 9 | ExpensesScreen | List | ❌ raw |
| 10 | IncomesScreen | List | ❌ raw |
| 11 | SubscriptionsScreen | List | ❌ raw |
| 12 | DebtScreen | List / Detail | ❌ raw |
| 13 | MonthlyBreakdownScreen | Analytics | ❌ raw |
| 14 | CalendarScreen | Analytics | ❌ raw |
| 15 | WeeklyCheckInScreen | Form | ❌ raw |
| 16 | PaydayScreen | Detail | ❌ raw |
| 17 | CurrencyScreen | Form/Tool | ❌ raw |
| 18 | ExportScreen | Settings | ❌ raw |
| 19 | ShareScreen | Detail | ❌ raw |
| 20 | SettingsScreen | Settings | ❌ raw |
| 21 | AppearanceScreen | Settings | ❌ raw |
| 22 | NavCustomizeScreen | Settings | ❌ raw |
| 23 | OnboardingScreen | (special, standalone) | ❌ raw |

---

## 3. Shared components that ALREADY exist

Good news — most of the library is already written. It is simply unused and, in places, duplicated.

`src/components/peggy/`: PeggyScreen, PeggyHeroCard, PeggyCard, PeggySectionHeader, PeggyProgressBar, PeggyIllustration, PeggyIconBadge, PeggyDivider, **PeggyAvatar**, PeggyChip, PeggyInput, PeggyListRow, PeggyStatCard, PeggyEmptyState, PeggyQuickActionCard, PeggyButton, PeggyGoalCard.

---

## 4. Duplicate / conflicting components (must consolidate)

| Purpose | Competing implementations | Keep |
|---|---|---|
| **Concept icon** | `PeggyIconBadge`, `IconBadge` (old), `PeggyIcon` | One: `PeggyIcon` + `PeggyIconFrame` |
| **Goal card** | `PeggyGoalCard`, `GoalProgressCard`, `GoalProgressWidget` | One: `PeggyGoalCard` |
| **Progress bar** | `PeggyProgressBar`, `GoalBar` | One: `PeggyProgressBar` |
| **Illustration slot** | `PeggyIllustration` (gray placeholder) | Fold into `PeggyIconFrame` placeholder |
| **Avatar** | `PeggyAvatar` (exists) **vs** hand-rolled `<Image>`-in-a-circle on Dashboard hero | One: `PeggyAvatar` |

**Visible consequence:** the same "goal with a progress bar" can render three different ways depending on which screen you're on.

---

## 5. Direct PNG imports (bypassing the registry/frame)

Only **2**, both the mascot:
- `OnboardingScreen.tsx:89` — `require('assets/peggy-mascot.png')`
- `DashboardScreen.tsx:165` — `require('assets/peggy-mascot.png')` inside a hand-made `rgba(255,255,255,0.92)` circle.

Concept icons (categories/goals) already route through the registry — good. The leak is the mascot.

---

## 6. THE AVATAR / MASCOT PROBLEM — it is an architecture problem, not an art problem

**What you see on the Dashboard hero:** the squirrel sits inside a **checkerboard square inside a white circle** — a double-container with a see-through grid.

**Why:**
1. The **asset** `peggy-mascot.png` has a **circular/checkerboard background baked into the pixels** (it was exported with the transparency-preview grid as real image data).
2. The **screen** then draws **another** circle around it (`DashboardScreen.tsx:165`), and `PeggyAvatar` (which also draws a circle) is not used here.

So there are **two circles and a baked-in background** fighting each other. This is the exact proof the app lacks one enforced avatar/frame system:
- **Asset rule:** mascot/profile art must be **transparent, borderless, no baked-in circle.**
- **Frame rule:** the circle is supplied **once**, by the component (`PeggyAvatar` for the user photo; a brand-mascot frame for the hero illustration).

**Note:** "profile avatar" (user photo, top-left, `cover` crop) and "brand mascot" (Peggy on the hero, `contain`, never cropped) are **two concepts**. They should share framing tokens but are not the same slot. Current `PeggyAvatar` uses `cover` — correct for a photo, wrong for the mascot. The migration splits these cleanly.

**Requires new artwork:** a clean, transparent, borderless `peggy-mascot.png` (no checkerboard, no baked circle).

---

## 7. Ionicons still in product UI

**187 occurrences, all 23 screens.** These fall into two groups:

- **Legitimately fine as line-icons (for now):** chevrons, back arrows, close, small affordances (checkmark, info). These are UI affordances, not concept art. Acceptable as a controlled icon set **if** standardized through one component and one size scale.
- **Concept icons that clash with premium art:** Profile, Spending, Income, Settings, Bills, Payday, Add Expense, Scan, etc. — flat outline icons sitting next to your matte 3D category icons. **This is the clash.** These need premium art (see §12) or, until then, one consistent neutral fallback frame — never bare outline glyphs mixed beside 3D icons.

---

## 8. Emoji in product UI

| Location | Emoji |
|---|---|
| `DashboardScreen.tsx:137` | greeting `👋` |
| `DashboardScreen.tsx:140` | `You're doing amazing today! 💜` |
| `PeggyGoalCard.tsx:52` | `Goal complete — amazing work! 🎉` |
| `GoalBar.tsx:57` | `Goal reached! 🎉` |

**Decision needed:** keep as warmth (on-brand, friendly) or remove for a cleaner "premium" register. My recommendation: keep 👋/💜 greeting warmth, drop 🎉 in favor of the gold "complete" state already in the system.

---

## 9. Arbitrary icon sizes (no size scale)

Sizes are passed as raw numbers screen-by-screen (`size={40}`, `size={30}`, `size={52}`, `iconSize + 10`, `size * 0.42`, `width: 68`). There is **no semantic size scale**, so "the same context" renders at different sizes on different screens — and several are simply **too small to read**, which is your "not visual" complaint.

**Fix:** one enum — `compact | standard | card | feature | hero` — screens request a name, never a number.

---

## 10. Proposed canonical architecture

### 10a. Tokens (`src/theme/`) — extend what exists
Color · Typography · Spacing (4/8/12/16/20/24/32/40) · Radii (sm/input/tile/card/hero/pill/circle) · Shadow (icon/card/raised/hero/modal/nav) · **IconSize (compact/standard/card/feature/hero)** · RowHeight · HeaderHeight. No raw values in screens.

### 10b. The page shell — `PeggyPage`
Wraps/renames `PeggyScreen`. Owns safe-area, background, page margins, header (title + optional back + avatar/action), scroll, keyboard avoidance, section spacing, bottom-nav clearance, and the loading/empty/error states. **Config-driven sections** so order/visibility/preview-count are props, not new layout code.

### 10c. Icon pipeline (one path)
`screen → concept ID → registry → PeggyIcon → PeggyIconFrame`. `PeggyIconFrame` owns shape/size/padding/tint/shadow/selected/pressed/disabled and image scaling. Screens never import a PNG or draw a circle.

### 10d. Avatar
`PeggyAvatar` (photo, `cover`, initial fallback) + a mascot framing variant (`contain`, never cropped). Both from tokens.

### 10e. Consolidated component set (canonical)
PeggyPage, PeggyHeader, PeggyBackButton, PeggyAvatar, PeggyCard, PeggyHeroCard, PeggySection, PeggySectionHeader, PeggyIcon, PeggyIconFrame, PeggyQuickAction, PeggyGoalCard, PeggyListRow, PeggyStatCard, PeggyButton, PeggyIconButton, PeggyInput, PeggyCurrencyInput, PeggyPickerTile, PeggyProgressBar, PeggyChip, PeggyBadge, PeggyEmptyState, PeggyLoadingState, PeggyErrorState, PeggyBottomNav, PeggyModal, PeggyConfirmationModal, PeggyDivider.

---

## 11. Migration order (each screen visually reviewed before the next)

Foundation → Dashboard → More → Camera → Profile → Spending → Bills → Goals → Income → Reports/Breakdown → Calendar → Weekly Check-In → Currency → Payday → Export/Backup → Settings → Appearance → NavCustomize → remaining.

---

## 12. What can be fixed WITHOUT new artwork vs. what NEEDS art

**Without new art (structure & consistency — the bulk of "looks like one app"):**
- Consolidate duplicate components.
- Route every screen through `PeggyPage`.
- One icon-size scale (fixes "too small / not visual").
- One `PeggyIconFrame` and one `PeggyAvatar`; kill hand-rolled circles and gray placeholders.
- Remove the mascot double-circle by using the frame + a neutral system placeholder until clean art arrives.
- Standardize cards/rows/headers/buttons/inputs/spacing/typography.

**Requires new art (in your locked matte style, generated one at a time):**
- Clean, transparent, borderless **mascot** (no checkerboard, no baked circle).
- Premium concept icons for **tool/nav/action** concepts not in the current 15: Profile, Spending, Income, Bills, Add Expense, Add Income, Add Bill, Add Goal, Scan/Camera, Weekly Check-In, Monthly Breakdown, Calendar, Payday, Currency, Export/Backup, Share, Settings. (Manifest with per-icon prompts to follow.)

---

## 13. Risks

- **Scope:** 23 screens. Migration is real work; done screen-by-screen with a review gate to stay safe.
- **Behavior regressions:** each screen keeps its data/logic; only presentation is swapped. Tests (124) run after each screen.
- **Art gap:** nav/tool icons stay on a neutral fallback frame until premium art exists — consistent, but not yet "3D everywhere." Structure lands first; art fills in.
- **Dark mode:** deferred; template will be token-based so a dark palette can drop in later without screen edits.

---

## 14. Estimated impact

- **Screens touched:** 23.
- **Components:** ~28 canonical (most exist; ~6 new: PeggyPage/Header/BackButton/IconFrame/IconButton/PickerTile + consolidations).
- **Removed:** 3 icon renderers → 1; 3 goal cards → 1; 2 progress bars → 1; hand-rolled avatar circles → PeggyAvatar.

---

## 15. Acceptance standard

A screen is done only when it uses `PeggyPage`, its header/cards/rows/icons/spacing/type all come from the system, its empty/loading/error states match, and it visually continues from the screen before it — with no remnants of the old per-screen styling.
