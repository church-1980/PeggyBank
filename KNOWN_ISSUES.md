# PeggyBank — Known Issues
**Last updated:** 2026-06-05

> All confirmed bugs, testing findings, and future improvements live here.
> Update this file when bugs are found or fixed.
> Do NOT fix anything without user approval.

---

## 🔴 CONFIRMED BUGS (fix required, awaiting approval)

~~### BUG-001 — Alert not imported in ExpensesScreen~~
**Status:** ✅ Fixed 2026-06-05 (commit — added `Alert` to import in ExpensesScreen.tsx line 3)
**Note (2026-06-23):** Verified still fixed — `Alert` is present in the import (ExpensesScreen.tsx:3). AUDIT_REPORT.md still lists this as ✗ BROKEN and is stale on this point.

~~### BUG-002 — CSV export & backup crash on Expo SDK 55 (file-system API moved)~~
**Status:** ✅ Fixed 2026-06-23 (autonomous session)
**Risk:** HIGH — CSV export is the app's only backup mechanism
**Cause:** `src/lib/csvExport.ts` and `src/lib/backup.ts` imported `expo-file-system` and used `FileSystem.documentDirectory` / `FileSystem.EncodingType`. In expo-file-system 55 those moved to the `expo-file-system/legacy` entry; on the new default API they are `undefined`, so any export/backup would throw at runtime.
**Fix:** Changed both imports to `import * as FileSystem from 'expo-file-system/legacy'`. Confirmed by `tsc` (the `documentDirectory`/`EncodingType` errors cleared) and the full Jest suite (100/100). Still needs a device run to confirm a real file is written and the share sheet opens (was TEST-005).

---

## 🟡 NEEDS TESTING (not confirmed broken, not confirmed working)

### TEST-001 — App restart persistence
**Risk:** HIGH — a budgeting app that loses data on restart is broken
**Test:** Add expense + income + bill + goal. Force-close app fully. Reopen. All data should still be there.
**Status:** Not yet tested on device

### TEST-002 — Safe to Spend calculation with real data
**Risk:** MEDIUM — math looks correct in code but real-world numbers not verified
**Test:** Add $3000 income, $500 expenses, $200 unpaid bill. Safe to Spend should be ~$2300 minus goal savings allocation. Verify it feels correct.
**Status:** Not yet tested on device

### TEST-003 — Unpin ghost fix on real device
**Risk:** MEDIUM — fix was applied in code (commit d53fc32) but not visually confirmed on device
**Test:** Pin a goal → go to Dashboard → tap X on widget → confirm it disappears INSTANTLY with no blank ghost area
**Status:** Not yet tested on device

### TEST-004 — Light mode visual pass (all 22 screens)
**Risk:** MEDIUM — theme tokens are correct but visual rendering not confirmed
**Test:** Switch to Light mode, walk all 22 screens, look for invisible text or wrong backgrounds
**Status:** Not yet tested on device

### TEST-005 — Export CSV
**Risk:** MEDIUM — only backup mechanism in the app
**Test:** Export CSV, open in Excel/Numbers, confirm all data present
**Status:** Not yet tested on device

### TEST-006 — Currency screen offline mode
**Risk:** LOW-MEDIUM — app is offline-first but Currency depends on a live API
**Test:** Enable airplane mode, open Currency screen, confirm it doesn't crash
**Status:** Not yet tested on device

### TEST-007 — Recurring bill auto-reset
**Risk:** LOW — unclear if auto-reset is intended behaviour or not
**Question:** Should recurring bills auto-reset to unpaid at the start of each new billing cycle?
**Status:** Needs product decision from user

### TEST-008 — Receipt photo display
**Risk:** LOW — photo saves to DB as URI but no display in list or detail view
**Note:** Photo is write-only currently. Consider whether a photo preview is needed.
**Status:** Awaiting product decision

### TEST-009 — Variable income midpoint UX
**Risk:** LOW — variable income stores midpoint of range, user may not expect this
**Note:** Consider adding "We use the midpoint for calculations" note in the UI
**Status:** Awaiting product decision

### TEST-010 — Maestro E2E flows (all 6)
**Status:** Written and committed, awaiting physical device + Maestro CLI install
**Flows:** add_expense, add_bill, add_goal, pin_unpin_goal, theme_switch, navigation

---

## 🟠 FUTURE IMPROVEMENTS (not bugs, tracked for later)

### IMPROVEMENT-001 — Spending history only shows current month
**Screen:** ExpensesScreen
**Note:** No way to browse previous months from the Spending screen. Monthly Breakdown screen shows history by month, but Spending screen is current-month-only.
**Priority:** Low

### IMPROVEMENT-002 — Edit income doesn't offer fixed/variable mode toggle
**Screen:** IncomesScreen edit modal
**Note:** Edit only allows changing amount and label. If a variable income was added, editing it doesn't show the range fields.
**Priority:** Low

### IMPROVEMENT-003 — No data loss warning on app delete
**Note:** Deleting the app permanently erases all SQLite data. No warning shown anywhere in the app.
**Suggested fix:** Add a note in Export screen: "Deleting the app will erase all data. Export regularly."
**Priority:** Medium

### IMPROVEMENT-004 — GoalProgressCard may clip on 5.4" phones
**Screen:** GoalsScreen — GoalProgressCard component
**Note:** STRIP_H=80, HORIZON_Y=52, not tested on small screens. May need responsive sizing.
**Priority:** Low

### IMPROVEMENT-005 — Goal journey strip illustrations (all types use airplane→island)
**Note:** 20 goal types exist but all use the same airplane→island SVG. Cruise, Wedding, Car, Home etc. should each have their own illustration.
**Priority:** Low — cosmetic, approved for future build

### IMPROVEMENT-006 — Payday edge case (day 31 in short months)
**Note:** If payday is set to 31 and the current month has 28/29/30 days, getDaysUntil() may behave unexpectedly.
**Priority:** Low
