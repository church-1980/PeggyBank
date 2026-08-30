# PeggyBank — Full Functionality Audit
**Date:** 2026-06-05
**Audited by:** Claude (code review — no device run)
**Method:** Source code review of all relevant screens + PROJECT_STATUS.md

> **⚠ STALE NOTICE (2026-06-23):** This report is from 2026-06-05 and is partly out of date.
> Corrections from the 2026-06-23 work session:
> - **Delete Expense — "✗ BROKEN" (Alert not imported) is RESOLVED.** `Alert` is now in the import (ExpensesScreen.tsx:3). Treat as ✓ COMPLETE.
> - **New HIGH-severity bug found & fixed:** CSV export / backup crashed on Expo SDK 55 because `expo-file-system`'s `documentDirectory`/`EncodingType` moved to `expo-file-system/legacy`. Fixed this session (BUG-002 in KNOWN_ISSUES.md).
> See WORK_SESSION_REPORT.md for the full current picture.

> STATUS KEY
> ✓ COMPLETE — code is correct and complete, logic verified in source
> ⚠ NEEDS TESTING — code exists and looks correct but has NOT been run on a device
> ✗ BROKEN — confirmed bug found in source code
> ? UNKNOWN — feature exists but cannot be verified without a device or missing info

---

## SPENDING

---

**Feature:** Add Expense
**Status:** ⚠ NEEDS TESTING
**Reason:** Full form exists in AddExpenseScreen.tsx. Amount input, category grid, note field, recurring toggle, camera button, Save/Update button all present. Insert SQL is correct. Returns to caller screen after save. Code looks complete but has never been run through a device test.
**How to test:** Open app → QuickAdd arc → Expense. Enter $25.00, pick Groceries, add note "Test", tap Save. Verify expense appears in Spending history.
**Recommended action:** Manual device test before shipping.

---

**Feature:** Edit Expense
**Status:** ⚠ NEEDS TESTING
**Reason:** Edit path exists — tapping an expense opens a bottom sheet with "Edit Expense" button. This navigates to AddExpenseScreen with prefill params (id, category, amount, note). `UPDATE expenses SET...` SQL runs when `editingId` is set. Logic is correct in code.
**How to test:** Add an expense, tap it, tap Edit, change amount to $99.99, tap Update. Confirm the changed amount shows in history.
**Recommended action:** Manual device test.

---

**Feature:** Delete Expense
**Status:** ✗ BROKEN
**Reason:** `deleteExpense()` in ExpensesScreen.tsx calls `Alert.alert('Could not delete', ...)` on line 52 but `Alert` is never imported. The file imports only `View, Text, FlatList, StyleSheet, TouchableOpacity, Modal` from react-native — `Alert` is missing. This means on delete failure the app will crash with "Alert is not defined" instead of showing the error message. The happy path (successful delete) works, but any DB error during delete will throw a runtime crash.
**How to test:** Force a delete error (e.g. corrupt DB entry) and observe crash vs error alert.
**Recommended action:** Add `Alert` to the import in ExpensesScreen.tsx. One-line fix.

---

**Feature:** Categories
**Status:** ✓ COMPLETE
**Reason:** `CATEGORIES` object drives both the grid in AddExpenseScreen and the icons/colours in the expense list. Category selection persists via `last_expense_category` in the settings table so the next add pre-selects your last used category. All standard categories present.
**How to test:** Add expenses in several categories, re-open Add Expense, confirm last used category is pre-selected.
**Recommended action:** None.

---

**Feature:** Notes
**Status:** ✓ COMPLETE
**Reason:** Note TextInput exists in AddExpenseScreen. Note is saved to the `note` column in expenses table. Note is displayed in the expense list row and in the bottom sheet summary. Undo restore also preserves the note.
**How to test:** Add expense with note "Coffee before meeting". Confirm note appears in list.
**Recommended action:** None.

---

**Feature:** Receipt button
**Status:** ⚠ NEEDS TESTING
**Reason:** Camera button exists in AddExpenseScreen. It requests `ImagePicker.requestCameraPermissionsAsync()` and `requestMediaLibraryPermissionsAsync()`. Both Take Photo and Choose from Gallery paths are coded. Photo URI is stored in `photo_uri` column. The button does NOT crash on press (permission request is handled gracefully). However camera functionality requires a physical device — cannot be confirmed in a simulator without a camera.
**How to test:** On a real device, add expense, tap camera icon, take a photo. Confirm photo saves without crash.
**Recommended action:** Manual device test. Note: photo is saved to DB as a URI string but there is no photo preview in the expense list or detail view — the stored URI is currently write-only. Consider whether display is needed.

---

**Feature:** Spending history
**Status:** ⚠ NEEDS TESTING
**Reason:** `loadExpenses()` queries current month only (`WHERE date >= ? AND date <= ?`). Results render in a FlatList sorted by date DESC. Total displayed in header. Empty state shown when list is empty. Logic looks correct.
**How to test:** Add 3 expenses, navigate away, come back. Confirm all 3 show in correct date order with correct total.
**Recommended action:** Manual device test. Also note: history only shows the current month — no way to browse previous months from this screen. This may be a missing feature depending on intent.

---

## BILLS

---

**Feature:** Add Bill
**Status:** ⚠ NEEDS TESTING
**Reason:** Add bill form present in BillsScreen. Name, amount, due day, frequency, category fields exist. `INSERT INTO bills` SQL is correct.
**How to test:** Tap Add → fill in "Netflix $15.99 due 15th" → Save. Confirm bill appears in list.
**Recommended action:** Manual device test.

---

**Feature:** Edit Bill
**Status:** ⚠ NEEDS TESTING
**Reason:** Edit path exists — tapping a bill opens options, edit navigates back to the add form with prefill. `UPDATE bills SET...` SQL is correct.
**How to test:** Edit Netflix bill, change amount to $17.99. Confirm updated.
**Recommended action:** Manual device test.

---

**Feature:** Delete Bill
**Status:** ⚠ NEEDS TESTING
**Reason:** Delete with undo toast exists in BillsScreen. `DELETE FROM bills WHERE id = ?` is correct. Undo re-inserts the row.
**How to test:** Delete a bill, tap Undo within 4 seconds. Confirm it returns. Delete again without undoing. Confirm gone.
**Recommended action:** Manual device test.

---

**Feature:** Recurring bills
**Status:** ⚠ NEEDS TESTING
**Reason:** `frequency` column exists (`monthly`, `weekly`, `biweekly`). Recurring toggle exists in the bill form. The `repeat-outline` icon shows on recurring bills in the list. However: there is no auto-reset logic that clears `is_paid` at the start of a new month or new billing cycle. Bills stay paid until manually unmarked. This may be intentional (manual control) or a missing feature.
**How to test:** Mark a recurring bill as paid. Wait until next month (or manually change your device date). Confirm whether it resets to unpaid automatically.
**Recommended action:** Confirm with user whether auto-reset is intended. If yes, this is a missing feature.

---

**Feature:** Coming Up dashboard section
**Status:** ✓ COMPLETE
**Reason:** DashboardScreen queries all unpaid bills, sorts by `getDaysUntil(due_day)`, takes the 2 most urgent, displays name + days until due + amount. Section is confirmed to appear above Goals section (fixed in commit d53fc32).
**How to test:** Add 3 unpaid bills with different due days. Go to Dashboard. Confirm the 2 closest bills appear.
**Recommended action:** None. Working as designed.

---

## GOALS

---

**Feature:** Create goal
**Status:** ⚠ NEEDS TESTING
**Reason:** Goal creation form in GoalsScreen. Name, target amount, goal type picker (20 types), optional deadline. `INSERT INTO savings_goals` SQL is correct. goal_type and pinned columns added via migration.
**How to test:** Create goal "Hawaii Trip" $5000 vacation type. Confirm it appears in the goals list with correct icon and colour.
**Recommended action:** Manual device test.

---

**Feature:** Edit goal
**Status:** ⚠ NEEDS TESTING
**Reason:** Edit path exists in GoalsScreen action sheet. Navigates back to creation form with prefill. `UPDATE savings_goals SET...` SQL is correct.
**How to test:** Edit "Hawaii Trip" to change target to $6000. Confirm update persists.
**Recommended action:** Manual device test.

---

**Feature:** Add money
**Status:** ⚠ NEEDS TESTING
**Reason:** "Add Money" button exists in GoalsScreen action sheet (icon changed from `add-circle-outline` to `add-outline` in commit d53fc32). Opens a deposit modal. `UPDATE savings_goals SET current_amount = current_amount + ?` SQL is correct.
**How to test:** Open a goal, tap Add Money, enter $500. Confirm current_amount increases and progress bar updates.
**Recommended action:** Manual device test.

---

**Feature:** Pin goal
**Status:** ⚠ NEEDS TESTING
**Reason:** `togglePin()` function in GoalsScreen updates `pinned = 1`. Action sheet shows "Pin to Dashboard" when goal is not pinned. Dashboard query limits to `pinned = 1 LIMIT 1`.
**How to test:** Open Goals, long-press a goal, tap "Pin to Dashboard". Go to Dashboard. Confirm GoalProgressWidget appears.
**Recommended action:** Manual device test.

---

**Feature:** Unpin goal
**Status:** ⚠ NEEDS TESTING
**Reason:** Unpin is available from both the Goals action sheet and the X button on the Dashboard widget. The ghost bug was fixed in commit d53fc32 — `setPinnedGoals([])` is called immediately before the DB update so no blank space remains. Logic confirmed correct in code.
**How to test:** Pin a goal. Go to Dashboard. Tap the X on the widget. Confirm it disappears immediately and "No featured goal" empty state appears.
**Recommended action:** Manual device test to confirm the ghost fix holds on a real device.

---

**Feature:** Dashboard integration
**Status:** ✓ COMPLETE
**Reason:** GoalProgressWidget renders on Dashboard when a goal is pinned. Section order correct (Bills above Goals, confirmed commit d53fc32). Empty state renders correctly when nothing pinned (flag icon + "No featured goal" + Browse button). DashboardOrder.test.tsx confirms all of this with 13 passing tests.
**How to test:** Jest tests already cover this. Manual visual check recommended.
**Recommended action:** None. Consider running on device to visually confirm widget sizing at ~10% screen height.

---

**Feature:** Goal persistence
**Status:** ⚠ NEEDS TESTING
**Reason:** Goals are stored in expo-sqlite which persists to disk. The singleton `getDatabase()` with health-check reconnect handles app background/foreground. However persistence across a full app kill + restart has not been manually confirmed.
**How to test:** Add a goal, force-close the app fully, reopen. Confirm goal still exists.
**Recommended action:** Manual device test — critical for a savings app.

---

## INCOME

---

**Feature:** Add income
**Status:** ⚠ NEEDS TESTING
**Reason:** AddIncomeScreen exists with fixed and variable modes. Fixed inserts exact amount. Variable inserts the midpoint `(low + high) / 2` and appends the range to the label. `INSERT INTO income` SQL is correct.
**How to test:** Add income "Paycheck $3000". Confirm it appears in Incomes list and increases Safe to Spend on Dashboard.
**Recommended action:** Manual device test.

---

**Feature:** Edit income
**Status:** ⚠ NEEDS TESTING
**Reason:** Edit modal exists inside IncomesScreen (inline modal, not a separate screen). `UPDATE income SET amount=?, label=? WHERE id=?` SQL is correct. Note: the edit modal only edits amount and label — it does not offer the fixed/variable mode toggle. If a variable income entry was added, editing it changes only the stored midpoint amount, not the range label format.
**How to test:** Add income, tap it, edit the amount, save. Confirm the new amount shows.
**Recommended action:** Manual device test. Also consider whether variable income editing needs the range fields.

---

**Feature:** Fixed income
**Status:** ⚠ NEEDS TESTING
**Reason:** Fixed mode stores the exact entered amount with the label. Straightforward — code is correct.
**How to test:** Add income in Fixed mode, $3000. Verify $3,000.00 shows in list and in Dashboard total.
**Recommended action:** Manual device test.

---

**Feature:** Variable income
**Status:** ⚠ NEEDS TESTING
**Reason:** Variable mode stores the midpoint of the entered low/high range. Label is appended with `($low–$high)`. Validation requires both values and that high >= low. Code logic is correct. The midpoint approximation is reasonable but users may not expect this behaviour without explanation in the UI.
**How to test:** Add income variable mode, low $2000 / high $3000. Confirm it saves as $2500 with label "Income ($2000–$3000)".
**Recommended action:** Manual device test. Consider adding a small note in the UI explaining "We'll use the midpoint for calculations".

---

**Feature:** Payday countdown
**Status:** ⚠ NEEDS TESTING
**Reason:** Dashboard reads `payday` from the settings table, calls `getDaysUntil(pd)` and shows "Today is payday / Payday is tomorrow / Payday in X days". `getDaysUntil` correctly wraps to next month when the payday date has passed. Logic confirmed correct in code. `getDaysUntil` is also unit tested (16/16 helpers tests passing).
**How to test:** Go to Settings, set payday to today's date. Dashboard should show "Today is payday". Set to tomorrow's date number. Should show "Payday is tomorrow".
**Recommended action:** Manual device test. Edge case: test on the last day of a month where payday falls on day 31 and the next month only has 28 days.

---

## DASHBOARD

---

**Feature:** Safe To Spend
**Status:** ⚠ NEEDS TESTING
**Reason:** Calculation: `income − spending − unpaid bills total − (1/12 of all goals gap)`. Mini-row shows Income / Spent / Available. Suggestion card appears when safeToSpend > $50. Math confirmed correct in code. Not tested on device with real data.
**How to test:** Add $3000 income, add $500 expenses, add $200 unpaid bill. Safe to Spend should be approximately $2300 minus 1/12 of any goal gaps. Verify the number feels right.
**Recommended action:** Manual device test. Also test the $0 income + $0 expense edge case — should show $0.00 not a negative number (clamped with `Math.max(0, ...)`).

---

**Feature:** Coming Up
**Status:** ✓ COMPLETE
**Reason:** Shows 2 most urgent unpaid bills sorted by due day. Renders above Goals section. Disappears entirely when no unpaid bills exist (conditional render with `upcomingBills.length > 0`). Confirmed working in code and DashboardOrder tests.
**How to test:** Add 3 unpaid bills. Dashboard should show only the 2 closest. Mark one as paid. Dashboard should update on next focus.
**Recommended action:** None.

---

**Feature:** Featured Goal (compact widget)
**Status:** ⚠ NEEDS TESTING
**Reason:** GoalProgressWidget renders when a goal is pinned. Shows name, tiny SVG strip (airplane→island), percentage, and "X to go". All 10 GoalProgressWidget Jest tests pass. Visual rendering on a real device screen size not confirmed.
**How to test:** Pin a goal. Dashboard shows compact widget at roughly 10% screen height. Confirm it doesn't take up half the screen. Confirm the % and "to go" amount are correct.
**Recommended action:** Manual visual check on device. Especially check on small phones (5.4").

---

**Feature:** Empty states
**Status:** ✓ COMPLETE
**Reason:** All three empty states confirmed in code and tests: (1) no pinned goal → flag icon + "No featured goal" + Browse button; (2) no upcoming bills → Coming Up section hidden entirely; (3) no expenses → receipt icon + "Nothing recorded yet" message in Spending screen.
**How to test:** Fresh install with no data. Confirm Dashboard shows empty goal state but no Coming Up section.
**Recommended action:** None.

---

## SETTINGS

---

**Feature:** Appearance (light/dark/system)
**Status:** ⚠ NEEDS TESTING
**Reason:** AppearanceScreen exists, theme switching wired through ThemeContext. All 27 theme token tests pass. No hardcoded colors remain in any screen. Visual rendering of all 22 screens in dark/light mode has not been manually confirmed.
**How to test:** Switch to Light mode — all screens should be warm off-white. Switch to Dark — all screens should be warm slate. Switch to System — should follow device setting.
**Recommended action:** Manual device test across all screens. Priority: check screens modified in Steps 1–5 for any missed colour that only shows in light mode.

---

**Feature:** Export
**Status:** ⚠ NEEDS TESTING
**Reason:** ExportScreen exists. CSV export logic present using expo-file-system and expo-sharing. Code structure looks correct. Has never been run on a device — file generation and share sheet untested.
**How to test:** Tap Export → choose a format → confirm a file is generated and the share sheet appears.
**Recommended action:** Manual device test.

---

**Feature:** Currency
**Status:** ⚠ NEEDS TESTING
**Reason:** CurrencyScreen exists with rate fetching, conversion, and history. Offline mode untested — it's unknown whether it fails gracefully or crashes when no internet is available.
**How to test:** (1) Online: open Currency, verify rates load. (2) Offline: enable airplane mode, open Currency, confirm it doesn't crash and shows a graceful "no connection" state or cached rates.
**Recommended action:** Manual device test, especially offline mode.

---

**Feature:** Navigation customization
**Status:** ⚠ NEEDS TESTING
**Reason:** NavCustomizeScreen lets user pick 3 of 5 middle tabs. Persisted via AsyncStorage. Preview bar updates live. Save button writes to NavContext. Logic confirmed in code.
**How to test:** Change middle tabs, tap Save, close and reopen app. Confirm tabs persisted. Try all 5 available features as tab options.
**Recommended action:** Manual device test. Confirm persistence after full app restart.

---

## THEME

---

**Feature:** Light mode
**Status:** ⚠ NEEDS TESTING
**Reason:** LightColors palette is complete (all 27 keys, all strings, tested). All screens use `useColors()` — no hardcoded colors remain. Visual rendering not confirmed on device.
**How to test:** Switch to Light mode in Appearance. Walk through all 22 screens. Look for any black text on dark backgrounds or white text invisible on white backgrounds.
**Recommended action:** Manual visual pass. Focus on screens with glass cards (Dashboard Safe to Spend) — glassBase is the same indigo in both modes which should be fine.

---

**Feature:** Dark mode
**Status:** ⚠ NEEDS TESTING
**Reason:** DarkColors palette complete and tested. Same as above — visual rendering not confirmed on device after the Steps 1–5 cleanup.
**How to test:** Switch to Dark mode. Walk all 22 screens. Look for any bright white backgrounds breaking through.
**Recommended action:** Manual visual pass.

---

**Feature:** System mode
**Status:** ⚠ NEEDS TESTING
**Reason:** ThemeContext reads the device `colorScheme` when set to system mode. Code wiring is correct. Untested — particularly the live switch (when you change system setting while app is open).
**How to test:** Set app to System mode. Change phone from Light to Dark system setting. App should switch immediately without restart.
**Recommended action:** Manual device test.

---

## DATA

---

**Feature:** SQLite persistence
**Status:** ⚠ NEEDS TESTING
**Reason:** expo-sqlite stores data in the app's local documents directory on the device. The `getDatabase()` singleton includes a health check (`SELECT 1`) with automatic reconnect. Migration array runs on every launch (safe — try/catch skips already-applied changes). Code is correct. Not tested on a real device.
**How to test:** Add data in every category (expense, income, goal, bill). Background the app for 10 minutes. Return. Confirm all data still shows.
**Recommended action:** Manual device test.

---

**Feature:** App restart persistence
**Status:** ⚠ NEEDS TESTING
**Reason:** SQLite data persists on disk across restarts. However this has not been manually confirmed — it is the single most important thing to verify before shipping. A budgeting app where data disappears on restart is broken.
**How to test:** Add expense $50, income $3000, one bill, one goal. Force-close the app completely (swipe away from recents). Reopen. Confirm all data is still there.
**Recommended action:** **High priority manual test.** This must pass before any public release.

---

**Feature:** Backup/export
**Status:** ⚠ NEEDS TESTING
**Reason:** ExportScreen handles CSV export via expo-file-system + expo-sharing. No iCloud/Google Drive backup — this is an offline-first app with manual export only. There is no import/restore feature. If a user deletes the app, all data is gone.
**How to test:** Export data as CSV. Confirm file opens correctly in Excel or Numbers. Confirm all expenses, income, bills, and goals are included.
**Recommended action:** Manual device test. Consider adding a user-visible warning: "Deleting the app will erase all data. Export regularly to keep a backup."

---

## SUMMARY

| Category | ✓ Complete | ⚠ Needs Testing | ✗ Broken | ? Unknown |
|----------|-----------|----------------|---------|---------|
| Spending | 2 | 4 | 1 | 0 |
| Bills | 1 | 4 | 0 | 0 |
| Goals | 1 | 5 | 0 | 0 |
| Income | 0 | 4 | 0 | 0 |
| Dashboard | 3 | 2 | 0 | 0 |
| Settings | 0 | 4 | 0 | 0 |
| Theme | 0 | 3 | 0 | 0 |
| Data | 0 | 3 | 0 | 0 |
| **TOTAL** | **7** | **29** | **1** | **0** |

---

## CONFIRMED BUG — FIX REQUIRED

**Screen:** ExpensesScreen.tsx line 52
**Bug:** `Alert` is not imported. The error handler in `deleteExpense()` calls `Alert.alert(...)` but `Alert` is missing from the React Native import list.
**Impact:** If a delete fails (DB error), the app crashes instead of showing the error dialog. The happy-path delete works fine.
**Fix:** Add `Alert` to the import on line 3. One word change.
**Waiting for approval before touching code.**

---

## PRIORITY ORDER FOR MANUAL TESTING

If you have a device available, test these first — they are highest risk:

1. **App restart persistence** — data must survive a full kill/reopen
2. **Add expense + history** — core daily-use flow
3. **Pin/unpin goal + dashboard widget** — recently changed, ghost fix needs real-device confirmation
4. **Safe to Spend calculation** — core value proposition of the app
5. **Light mode visual pass** — most likely to have invisible text issues
6. **Export CSV** — only backup mechanism available to users
