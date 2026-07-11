# Navigation Simplification — Architecture Report (pre-implementation)
**Status:** Report only. **No code changed.** Awaiting approval before implementing.
**Target:** bottom bar = **Home · Camera · More** (3 items). Profile via the Dashboard avatar. Camera opens a capture→create flow. Action Hub removed, its actions relocated.

---

## 1. Does a Profile screen currently exist?
**No.** There is no `ProfileScreen`/`AccountScreen` in `src/screens/`. It must be **created**. (Reported before implementing account-management functions, as instructed.)

## 2. Does PeggyBank have real user accounts?
**No.** No auth/login/session/OAuth/backend anywhere. The one "auth"-ish grep hit was a legal-disclaimer sentence in Settings. **PeggyBank is fully local / offline** — all data lives in on-device SQLite.
→ Consequence: **"Sign out" does not apply.** "Delete Account" must be named accurately as **"Delete all PeggyBank data from this device."**

## 3. Are subscriptions implemented?
**Not as app monetization.** There is **no billing/IAP/paywall** (no RevenueCat/Stripe/expo-in-app-purchases; "premium" appears only in icon-prompt comments). The existing `SubscriptionsScreen` is a **tracker of the user's *own* external subscriptions** (Netflix/Spotify, `subscriptions` table with `billing_day`) — not a PeggyBank subscription.
→ Consequence: a Profile "Subscription management" section has **nothing real to manage.** I'll **omit it** (or show an accurate "PeggyBank is free / no account" note) rather than invent billing. Please confirm.

## 4. Does account deletion exist?
**No user-facing deletion.** The only `DELETE FROM <all tables>` lives inside `restoreBackup()` (it clears tables before importing a backup) — not a standalone wipe. There is **no "delete all my data" feature.** It must be **created** as a local-data wipe with the required multi-step confirmation.

## 5. Where every removed bottom-nav destination stays reachable
Current bar: Home · Spending · + · Bills · More → becomes Home · Camera · More.

| Removed from bar | Stays reachable via |
|---|---|
| **Spending** | **Add to More** (new entry) — the Spending screen keeps its own "Add Expense" button (`ExpensesScreen.tsx:105`) |
| **Bills** | Already in More ("Bills & Subscriptions") ✓ |
| **Center + (Action Hub)** | Removed; its actions relocate ↓ |
| **Add Expense** (hub) | Spending screen's add button + Spending-in-More |
| **Add Income** (hub) | **Add Income screen** + **add Income to More** (the Income *list* is currently orphaned — no `navigate('Incomes')` exists anywhere, so this also *fixes* a dead-end) |
| **Add Bill** (hub) | Bills screen add flow (Bills in More) ✓ |
| **Add Goal** (hub) | Goals screen add flow (Goals in More) ✓ |
| **Weekly Check-In** (hub) | Already in More ✓ |
| **Scan Receipt** (hub) | **Camera** tab |

Everything else already lives in More (Goals, Calendar, Debt, Monthly Breakdown, Payday, Currency, Export/Backup, Share, Settings). **Net: I must add Spending and Income to More; nothing becomes unreachable.**

## 6. Files I expect to modify / create
**Modify**
- `src/navigation/AppNavigator.tsx` — bar → 3 tabs (Home, Camera, More); remove Spending/Bills/QuickAddTab and the center FAB; add Camera tab; keep all Stack routes.
- `src/screens/MoreScreen.tsx` — add **Spending**, **Income**, and **Profile** entries; (Weekly Check-In already there).
- `src/screens/DashboardScreen.tsx` — make the top-left **avatar tappable → Profile** (this is the only Dashboard change; no redesign). Bonus: greeting can read the Profile display name (resolves the earlier "greeting name" question).
- `src/database/database.ts` — add a `wipeAllLocalData()` helper (delete all rows across tables) for the Profile delete flow.

**Create**
- `src/screens/ProfileScreen.tsx` — photo, display name, personal info, preferences link; **no** accounts/billing sections (don't exist); **"Delete all PeggyBank data from this device"** with the safe multi-step flow.
- `src/screens/QuickCaptureScreen.tsx` — Camera flow: permission → capture → Retake/Use/Cancel → "What would you like to create? **Expense · Bill · Cancel**" → pass the image into the existing Add Expense (photo attaches today) / Add Bill flow. **No OCR** (none exists — won't fake it).

**Remove / retire**
- `src/screens/QuickAddScreen.tsx` (+ its `QuickAdd` route) — the Action Hub is no longer reachable once the + is gone. Its actions are relocated above. I'll remove the route and screen (or leave the file dormant) — your call.

**Built from existing Peggy components**, Design-Bible styling, existing colors, safe-area preserved, 3 evenly-spaced items, Camera slightly emphasized but still in-bar (no floating +).

---

## Things I need you to confirm before I code
1. **Camera creates Expense or Bill only** (per your flow) — Bills currently has no photo field; attaching the image to a bill would be **stored only if I add a `photo_uri` to bills**, otherwise the image routes to the bill form without being saved on the bill. OK to add a `photo_uri` column to bills (migration), or should Camera→Bill just open the bill form without keeping the photo?
2. **Profile scope:** since there are no accounts/subscriptions, Profile = photo + display name + preferences + "Delete all data from this device." Confirm that's the intended scope (I won't invent account/billing).
3. **QuickAddScreen:** delete it, or keep the file dormant?
4. **Camera tab emphasis:** slightly larger/filled center icon *within* the bar (no floating button) — confirm.

No code until you approve this. Then I implement, run TS + tests + Metro, build, and report.
