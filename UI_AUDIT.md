# PeggyBank — UI Audit
**Last updated:** 2026-06-05

> One entry per screen. Update this file after every visual review.
> No screen is approved until a real device test confirms it.
>
> STATUS KEY
> ✅ Approved — visually confirmed on device, no known issues
> 🔍 Needs Review — changed recently, needs device confirmation
> ⚠ Known Issues — specific problems noted below
> ❌ Needs Redesign — significant problems, do not ship as-is

---

## Dashboard
**File:** `src/screens/DashboardScreen.tsx`
**Last changed:** 2026-06-05 (commit d53fc32 — section order, unpin ghost, compact widget)
**Status:** 🔍 Needs Review
**Last device review:** Never
**Visual issues:**
- Compact GoalProgressWidget sizing not confirmed on device (~10% screen height target)
- Unpin ghost fix not visually confirmed on real device
- Light mode rendering not confirmed
**Known bugs:** None confirmed
**Approval status:** ❌ Not approved — needs device test

---

## Spending (Expenses)
**File:** `src/screens/ExpensesScreen.tsx`
**Last changed:** Initial build
**Status:** 🔍 Needs Review
**Last device review:** Never
**Visual issues:** None identified in code review
**Known bugs:** BUG-001 — Alert not imported (crash on delete failure)
**Approval status:** ❌ Not approved — BUG-001 must be fixed first

---

## Add Expense
**File:** `src/screens/AddExpenseScreen.tsx`
**Last changed:** Initial build
**Status:** 🔍 Needs Review
**Last device review:** Never
**Visual issues:** None identified in code review
**Known bugs:** None confirmed
**Approval status:** ❌ Not approved — needs device test

---

## Bills
**File:** `src/screens/BillsScreen.tsx`
**Last changed:** 2026-06-05 (commit d53fc32 — chevron-back → chevron-down)
**Status:** 🔍 Needs Review
**Last device review:** Never
**Visual issues:** None identified
**Known bugs:** None confirmed
**Approval status:** ❌ Not approved — needs device test

---

## Goals
**File:** `src/screens/GoalsScreen.tsx`
**Last changed:** 2026-06-05 (commit d53fc32 — add-circle-outline → add-outline)
**Last changed:** acd745d — pin/unpin added
**Status:** 🔍 Needs Review
**Last device review:** Never
**Visual issues:**
- GoalProgressCard SVG strip may clip on 5.4" screens (STRIP_H=80 not tested)
- All 20 goal types use airplane→island illustration (by design for now)
**Known bugs:** None confirmed
**Approval status:** ❌ Not approved — needs device test

---

## GoalProgressCard (component)
**File:** `src/components/GoalProgressCard.tsx`
**Last changed:** Initial build
**Status:** ⚠ Known Issues
**Last device review:** Never
**Visual issues:**
- May clip on small phones (5.4" / 375px wide)
- All goal types use same airplane→island SVG (improvement needed later)
**Known bugs:** None confirmed
**Approval status:** ❌ Not approved — needs device test

---

## GoalProgressWidget (component)
**File:** `src/components/GoalProgressWidget.tsx`
**Last changed:** 2026-06-05 (new file — created as compact dashboard version)
**Status:** 🔍 Needs Review
**Last device review:** Never
**Visual issues:**
- Target height ~10% of screen — not confirmed on device
- Strip is 36px tall with HORIZON_Y=24 — may be too small to see clearly on some screens
**Known bugs:** None confirmed
**Approval status:** ❌ Not approved — needs device test

---

## Incomes
**File:** `src/screens/IncomesScreen.tsx`
**Last changed:** 2026-06-05 (Step 4 — modal overlay, Step 1 — chevron-down)
**Status:** 🔍 Needs Review
**Last device review:** Never
**Visual issues:** None identified
**Known bugs:** None confirmed
**Approval status:** ❌ Not approved — needs device test

---

## Add Income
**File:** `src/screens/AddIncomeScreen.tsx`
**Last changed:** Initial build
**Status:** 🔍 Needs Review
**Last device review:** Never
**Visual issues:** None identified
**Known bugs:** None confirmed
**Approval status:** ❌ Not approved — needs device test

---

## Debt
**File:** `src/screens/DebtScreen.tsx`
**Last changed:** 2026-06-05 (Step 3 + Step 4 — empty state icon, overlay)
**Status:** 🔍 Needs Review
**Last device review:** Never
**Visual issues:** None identified
**Known bugs:** None confirmed
**Approval status:** ❌ Not approved — needs device test

---

## Subscriptions
**File:** `src/screens/SubscriptionsScreen.tsx`
**Last changed:** 2026-06-05 (Step 3 + Step 4 — card radius, overlay)
**Status:** 🔍 Needs Review
**Last device review:** Never
**Visual issues:** None identified
**Known bugs:** None confirmed
**Approval status:** ❌ Not approved — needs device test

---

## Monthly Breakdown
**File:** `src/screens/MonthlyBreakdownScreen.tsx`
**Last changed:** 2026-06-05 (Step 1 + Step 3 — chevron-down, card label, empty state)
**Status:** 🔍 Needs Review
**Last device review:** Never
**Visual issues:** None identified
**Known bugs:** None confirmed
**Approval status:** ❌ Not approved — needs device test

---

## Calendar
**File:** `src/screens/CalendarScreen.tsx`
**Last changed:** 2026-06-05 (Step 3 + Step 4 — section label, overlay)
**Status:** 🔍 Needs Review
**Last device review:** Never
**Visual issues:** None identified
**Known bugs:** None confirmed
**Approval status:** ❌ Not approved — needs device test

---

## Payday
**File:** `src/screens/PaydayScreen.tsx`
**Last changed:** 2026-06-05 (Step 1 — chevron-down)
**Status:** 🔍 Needs Review
**Last device review:** Never
**Visual issues:** None identified
**Known bugs:** None confirmed
**Approval status:** ❌ Not approved — needs device test

---

## Weekly Check-In
**File:** `src/screens/WeeklyCheckInScreen.tsx`
**Last changed:** 2026-06-05 (Step 1 + Step 3 — chevron-down, card radius, section label)
**Status:** 🔍 Needs Review
**Last device review:** Never
**Visual issues:** None identified
**Known bugs:** None confirmed
**Approval status:** ❌ Not approved — needs device test

---

## Currency
**File:** `src/screens/CurrencyScreen.tsx`
**Last changed:** 2026-06-05 (Step 1 + Step 3 + Step 4 — chevron-down, row padding, overlay)
**Status:** ⚠ Known Issues
**Last device review:** Never
**Visual issues:** None identified in code
**Known bugs:** TEST-006 — offline behaviour unknown (may crash with no internet)
**Approval status:** ❌ Not approved — needs device test including offline mode

---

## Settings
**File:** `src/screens/SettingsScreen.tsx`
**Last changed:** 2026-06-05 (Step 1 + Step 3 — chevron-down, section label)
**Status:** 🔍 Needs Review
**Last device review:** Never
**Visual issues:** None identified
**Known bugs:** None confirmed
**Approval status:** ❌ Not approved — needs device test

---

## Appearance
**File:** `src/screens/AppearanceScreen.tsx`
**Last changed:** 2026-06-05 (Step 1 — makeStyles + chevron-down)
**Status:** 🔍 Needs Review
**Last device review:** Never
**Visual issues:** None identified
**Known bugs:** None confirmed
**Approval status:** ❌ Not approved — needs device test

---

## Nav Customize
**File:** `src/screens/NavCustomizeScreen.tsx`
**Last changed:** 2026-06-05 (Step 1 + Step 3 + Step 4 — multiple fixes; commit d53fc32 pencil-outline)
**Status:** 🔍 Needs Review
**Last device review:** Never
**Visual issues:** None identified
**Known bugs:** None confirmed
**Approval status:** ❌ Not approved — needs device test

---

## Export
**File:** `src/screens/ExportScreen.tsx`
**Last changed:** 2026-06-05 (Step 1 — chevron-down, rgba tokens)
**Status:** 🔍 Needs Review
**Last device review:** Never
**Visual issues:** None identified
**Known bugs:** TEST-005 — CSV export not tested
**Approval status:** ❌ Not approved — needs device test

---

## Share
**File:** `src/screens/ShareScreen.tsx`
**Last changed:** 2026-06-05 (Step 1 — chevron-down)
**Status:** 🔍 Needs Review
**Last device review:** Never
**Visual issues:** None identified
**Known bugs:** None confirmed
**Approval status:** ❌ Not approved — needs device test

---

## More
**File:** `src/screens/MoreScreen.tsx`
**Last changed:** No changes (already correct at audit time)
**Status:** 🔍 Needs Review
**Last device review:** Never
**Visual issues:** None identified
**Known bugs:** None confirmed
**Approval status:** ❌ Not approved — needs device test

---

## Quick Add (arc menu)
**File:** `src/screens/QuickAddScreen.tsx`
**Last changed:** 2026-06-05 (Step 1 + Step 4 + commit d53fc32 pencil-outline)
**Status:** 🔍 Needs Review
**Last device review:** Never
**Visual issues:** None identified
**Known bugs:** None confirmed
**Approval status:** ❌ Not approved — needs device test

---

## Onboarding
**File:** `src/screens/OnboardingScreen.tsx`
**Last changed:** Initial build (no changes made)
**Status:** 🔍 Needs Review
**Last device review:** Never
**Visual issues:** None identified
**Known bugs:** None confirmed
**Approval status:** ❌ Not approved — needs device test

---

## Summary

| Status | Count |
|--------|-------|
| ✅ Approved | 0 |
| 🔍 Needs Review | 20 |
| ⚠ Known Issues | 3 |
| ❌ Not Approved | 23 |

**No screen has been approved yet.** All screens require a device test before being signed off.
