# PeggyBank — Visual Icon Review
**Date:** 2026-07-07
**Reviewer stance:** Senior product designer, pre-release gate.
**Build reviewed:** registry-driven icons, no premium PNGs yet (Ionicons outline set).
**Scope:** Visual appearance only. No code was changed. This is a punch list to resolve before/with the premium icon library.

> Method: every render site of a concept icon (goal type / expense category) was traced in source. Sizes, containers, and the icon *source* were compared across screens.

---

## FINAL ANSWER

**"If I showed this app to 100 strangers, would they believe every icon was intentionally designed as part of one professional icon system?"**

# NO

Not yet. Two reasons, in order of severity:

1. **The icons are stock Ionicons — a free, open-source set shipped in thousands of apps.** They are internally tidy, but they carry zero PeggyBank identity. A designer (and many ordinary users) would recognize them as the default Ionic/Expo icons. Per Rule #4 ("does it feel like PeggyBank, or borrowed from another app?"), today the honest answer is *borrowed*. This is expected — the premium library isn't installed yet — but it means the app cannot pass the 100-strangers test in its current state.
2. **The same concept icon renders at five different sizes and in three different container treatments across screens.** Even a perfect icon set looks unintentional when "Home" is 16px in one place and 28px in another. This is the fixable part, and it will matter just as much *after* the PNGs land.

The good news: **the mapping is now genuinely unified** (Rule #1 and #2 largely pass). The failures below are about *size/weight/container* and *identity*, not about "two different Home icons."

---

## PASS

- **Single source of truth (Rule #2) — for goal & category concepts.** `src/data/iconRegistry.ts` is now the only place these icons are chosen. `goalTypes.ts` and `categories.ts` both derive from it. Verified: no screen hardcodes a goal/category glyph anymore.
- **Same concept = same icon (Rule #1).** Home, Health/Medical, Gifts, Travel/Vacation, Pets each resolve to exactly one Ionicon everywhere they represent that concept. Structurally enforced.
- **Emoji purged.** The goal-type picker previously showed emoji (🌴) while expense categories showed icons — that split is gone; both now use the registry.
- **Recognition at a glance (Rule #5).** The chosen Ionicons (airplane, home, medkit, gift, paw, restaurant, car, gift, people) read clearly without labels.
- **Color per concept is consistent** and unchanged.

---

## FAIL / PUNCH LIST

### F1 — Identity: icons are generic Ionicons, not a PeggyBank library (Rule #4) — HIGH
The whole set is the Expo/Ionicons outline family. Cohesive, but not owned. Resolves only when the 15 premium PNGs are installed. **This is the single biggest blocker to a "YES".**

### F2 — Same icon renders at 5 different sizes (Rule #6, #7) — HIGH
The identical concept icon appears at wildly different sizes, so its visual weight changes screen to screen:
| Screen | Site | Size |
|--------|------|------|
| Add Expense (category chip) | `AddExpenseScreen.tsx:194` | **16** |
| Weekly Check-In (compare) | `WeeklyCheckInScreen.tsx:211` | **15** |
| Monthly Breakdown | `MonthlyBreakdownScreen.tsx:171` | **18** |
| Expenses (list row) | `ExpensesScreen.tsx:79` | **20** |
| Goals (card) | `GoalsScreen.tsx:197` | **20** |
| Goal-type picker | `GoalsScreen.tsx:310` | **22** |
| Expenses (detail sheet) | `ExpensesScreen.tsx:160` | **28** |

Home at 16px in Add Expense vs 28px in the Expense detail is an almost 2× difference. Reads as unintentional.

### F3 — Inconsistent container treatment (Rule #7) — MEDIUM
The same icon sits in different "chrome" depending on screen:
- **Pastel circle that turns transparent when active** — Add Expense (`catIconWrap`).
- **Accent-tinted rounded square** — Goals card (`iconWrap`, `accent + '18'`).
- **No container at all** — goal-type picker, Monthly Breakdown, Weekly Check-In.
Padding and background differ, so visual weight differs even where the pixel size matches.

### F4 — A second icon source still exists (Rule #2) — MEDIUM
`SubscriptionsScreen.tsx:33-52` defines its **own** hardcoded icon map (`QuickSub`: `tv-outline`, `logo-youtube`, `musical-notes-outline`, `film-outline`, …). These are brand/subscription glyphs, not the shared concept buckets — arguably justified — but they are a separate mapping the registry doesn't govern. Flagging per the "no screen owns its own version / no exceptions" rule so it's a conscious decision, not an oversight.

### F5 — Mixed metaphor risk once premium art lands (Rule #1) — LOW (watch item)
Because of the lean 15-bucket consolidation, several distinct goals share one icon:
- Cruise / Flight / Vacation → all **airplane**
- Business / Retirement / Investing → all **trending-up**
- Wedding / Baby / Kids → all **people**
- Technology → **game controller** (fun bucket)
Not a bug — it's the agreed design — but at 48–64px a "Retirement" goal showing a stock-chart arrow, or a "Wedding" goal showing a generic people icon, may not be self-evident without the label (borderline on Rule #5). Worth confirming these specific metaphors when the premium art is designed.

### Non-issues (checked, no action)
- Interface icons (chevrons, checkmarks, +, settings rows, More menu, onboarding) are functional UI, not concept icons — correctly out of scope.
- No blurriness or off-center rendering observed in vector icons (Rule #6/#7 pass for crispness; SVG scales cleanly).

---

## What this means for the premium library
When the 15 PNGs are installed, two things must be true to flip this to **YES**:
1. **F1** dissolves automatically (premium art replaces Ionicons via the registry).
2. **F2 + F3 must still be addressed** — the PNGs need a single agreed render size and container per context, or the size/weight inconsistency will persist with prettier art. Recommend deciding on standard sizes (e.g. one size for pickers, one for list rows, one for detail) as part of the install.
3. **F4** — decide whether Subscriptions folds into the registry or is a sanctioned exception.

**Bottom line:** consistency of *mapping* is done. Consistency of *size/weight* and *identity* is not. The app is not yet at "one professional icon system," but the remaining gap is now specific and small.
