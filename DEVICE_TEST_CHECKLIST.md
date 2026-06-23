# PeggyBank — Device Test Checklist
**Created:** 2026-06-23
**Purpose:** Real-device verification (Priority 1). Run every item on a physical phone via Expo Go (`npx expo start`) before any release or new feature work.

> How to use: run each test on a real device, mark **Pass** or **Fail** with an `x`, and record what you saw in **Notes** (numbers, screenshots, error text). Leave both boxes empty until tested.

---

## 1. App restart persistence  *(highest priority — a budgeting app that loses data is broken)*
**Steps:** Add an expense, an income, a bill, and a goal. Force-close the app fully (swipe away from recents). Reopen.
**Expect:** All four entries still present with correct values.

- [ ] Pass
- [ ] Fail
- **Notes:**

---

## 2. Add expense
**Steps:** QuickAdd → Expense. Enter $25.00, pick Groceries, note "Test", Save.
**Expect:** Expense appears in Spending history with correct amount, category icon, and note.

- [ ] Pass
- [ ] Fail
- **Notes:**

---

## 3. Edit expense
**Steps:** Tap the expense → Edit → change amount to $99.99 → Update.
**Expect:** History shows $99.99; note/category preserved.

- [ ] Pass
- [ ] Fail
- **Notes:**

---

## 4. Delete expense
**Steps:** Tap an expense → Delete. (Then test Undo if a toast appears.)
**Expect:** Expense removed; total updates; no crash. Undo restores it if used. *(Regression check for the old Alert-not-imported bug — a delete error must show a dialog, not crash.)*

- [ ] Pass
- [ ] Fail
- **Notes:**

---

## 5. Add bill
**Steps:** Bills → Add. "Netflix $15.99 due 15th", Save.
**Expect:** Bill appears in list with due day and amount.

- [ ] Pass
- [ ] Fail
- **Notes:**

---

## 6. Mark bill paid
**Steps:** Tap a bill → mark Paid. Then mark Unpaid.
**Expect:** Paid state toggles; Dashboard "Coming Up" updates (paid bills drop off the urgent list).

- [ ] Pass
- [ ] Fail
- **Notes:**

---

## 7. Add goal
**Steps:** Goals → Add. "Hawaii Trip" $5000, vacation type, optional deadline. Save.
**Expect:** Goal appears with correct icon/color and progress card.

- [ ] Pass
- [ ] Fail
- **Notes:**

---

## 8. Pin goal
**Steps:** Goals → long-press / action sheet → Pin to Dashboard. Go to Dashboard.
**Expect:** Compact GoalProgressWidget appears in the "Your Goals" area at roughly 10% screen height.

- [ ] Pass
- [ ] Fail
- **Notes:**

---

## 9. Unpin goal  *(ghost-fix regression check)*
**Steps:** On Dashboard, tap the X on the goal widget.
**Expect:** Widget disappears **instantly** with no blank ghost gap; "No featured goal" empty state shows.

- [ ] Pass
- [ ] Fail
- **Notes:**

---

## 10. Export CSV  *(verifies the SDK 55 / expo-file-system/legacy fix — BUG-002)*
**Steps:** Settings → Export → choose CSV.
**Expect:** A file is generated and the share sheet opens (no crash). Open the CSV — all expenses, income, bills, goals present.

- [ ] Pass
- [ ] Fail
- **Notes:**

---

## 11. Backup  *(verifies the SDK 55 / expo-file-system/legacy fix — BUG-002)*
**Steps:** Trigger backup (export full backup JSON).
**Expect:** Backup file is written and shareable; no crash; contains all tables.

- [ ] Pass
- [ ] Fail
- **Notes:**

---

## 12. Restore
**Steps:** From a saved backup file, run restore.
**Expect:** Data is re-imported correctly (expenses, income, bills, goals, debts, subscriptions, settings); no duplicate/crash; confirmation message shows the backup date.

- [ ] Pass
- [ ] Fail
- **Notes:**

---

## 13. Theme switch
**Steps:** Settings → Appearance → switch Light → Dark → System. Set System, then change the phone's system theme while the app is open.
**Expect:** App theme changes immediately, including the live system-mode switch without a restart.

- [ ] Pass
- [ ] Fail
- **Notes:**

---

## 14. Dark mode review (all 22 screens)
**Steps:** In Dark mode, walk every screen.
**Expect:** No bright-white backgrounds breaking through; no invisible text; cards/borders/labels readable. Note any screen that looks off.

- [ ] Pass
- [ ] Fail
- **Notes:**

---

## 15. Light mode review (all 22 screens)
**Steps:** In Light mode, walk every screen.
**Expect:** Warm off-white backgrounds; no black-on-dark or white-on-white text. Note any screen that looks off.

- [ ] Pass
- [ ] Fail
- **Notes:**

---

## 16. Keyboard overlap review
**Steps:** On every form (Add Expense, Add Income, Add Bill, Add Goal, deposit modals), focus the bottom-most input.
**Expect:** Keyboard does not cover the active field or the Save button; screen scrolls/avoids correctly.

- [ ] Pass
- [ ] Fail
- **Notes:**

---

## 17. Safe-to-Spend review
**Steps:** Add $3000 income, $500 expenses, $200 unpaid bill, one goal with a gap. Read the Dashboard Safe-to-Spend.
**Expect:** ~$2300 minus the monthly goal contribution (gap ÷ 12). Also verify the $0-income / $0-expense case shows $0.00, never a negative number.

- [ ] Pass
- [ ] Fail
- **Notes:**

---

## Device & environment

- **Device / OS:**
- **Expo Go version:**
- **App build / commit:**
- **Tester:**
- **Date run:**

---

### Summary
| # | Test | Result |
|---|------|--------|
| 1 | App restart persistence | |
| 2 | Add expense | |
| 3 | Edit expense | |
| 4 | Delete expense | |
| 5 | Add bill | |
| 6 | Mark bill paid | |
| 7 | Add goal | |
| 8 | Pin goal | |
| 9 | Unpin goal | |
| 10 | Export CSV | |
| 11 | Backup | |
| 12 | Restore | |
| 13 | Theme switch | |
| 14 | Dark mode review | |
| 15 | Light mode review | |
| 16 | Keyboard overlap review | |
| 17 | Safe-to-Spend review | |
