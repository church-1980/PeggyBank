# PeggyBank — Independent Stress-Test Handoff

You are being asked to **stress-test and criticise** a real, in-development app.

**Be harsh and skeptical.** Nothing was fixed, cleaned, or hidden before this
package was made. Defects are expected to be present. A report that finds
nothing will be read as a failure to test, not as evidence of quality.

This document describes what the app is *intended* to do. **It is not a claim
that the app does it.** Where behaviour differs, that is a finding. Where this
document itself looks wrong, say so.

---

## 1. Build identity

| | |
|---|---|
| Repository | github.com/church-1980/PeggyBank |
| Branch | feature/three-tab-camera-profile |
| Commit | 86ff2b049f960cd78234cd5a2b92adadda88d2e0 (86ff2b0) |
| Commit date | 2026-08-19 11:56 -0400 |
| Working tree at packaging | clean, 0 tracked changes |
| Expo SDK | 55.0.27 |
| React Native | 0.83.6 |
| React | 19.2.0 |
| react-native-web | ~0.21.0 |
| Node | v24.15.0 |
| npm | 11.12.1 |
| Android package (dev) | com.spall.peggybank.dev |
| Android package (production) | com.spall.peggybank |
| Web build command | npx expo export --platform web |
| APK build command | bash scripts/ship.sh (wraps gradlew assembleRelease, arm64) |

Node 24 is **newer than Expo SDK 55's tested LTS line**. It has already caused
one hard crash in the JS bundling step (fixed by raising the heap). Treat
toolchain-related oddities as plausible.

The app is **local-first**: no backend, no API, no accounts, no network calls in
normal operation. Nothing to log into.

---

## 2. Screens (22 registered routes)

Navigation is a **3-tab bottom bar**: Home, Camera, More.

| Screen | Route | Reached by | Purpose | Status |
|---|---|---|---|---|
| Dashboard | Dashboard | Home tab | Safe to Spend, Quick Add, featured goal | user-facing |
| More hub | MoreScreen | More tab | Grid of 11 tools | user-facing |
| Quick Capture | QuickCapture | Camera tab | Photograph a receipt/bill, recognise, route | user-facing |
| Spending | Spending | More to Spending | Expense history | user-facing |
| Income | Incomes | More to Income | Income list + Payday Planner entry | user-facing |
| Bills & Subscriptions | Bills | More to Bills | Recurring bills and subscriptions | user-facing |
| Debt Tracker | Debt | More to Debt Tracker | Balances, payments, payoff projection | user-facing |
| Savings Goals | Goals | More to Savings Goals | Goals, deposits, progress | user-facing |
| Weekly Check-In | WeeklyCheckIn | More to Weekly Check-In | Weekly review | user-facing |
| Monthly Breakdown | MonthlyBreakdown | More; Home "View full breakdown" | Month totals by category | user-facing |
| Calendar | Calendar | More to Calendar | Month view of due items | user-facing |
| Currency Calculator | Currency | More to Currency Calculator | Offline conversion | user-facing |
| Profile | Profile | More to Profile; Home logo tap | Name, photo, data & privacy | user-facing |
| Settings | Settings | More to Settings | Appearance, reminders, export, share | user-facing |
| Add Expense | AddExpense | Home Quick Add | Create/edit an expense | user-facing |
| Add Income | AddIncome | Home Quick Add | Create income (fixed or range) | user-facing |
| Payday Planner | Payday | **Income screen, card at top** | Split a paycheque across bills/goals | user-facing |
| Appearance | Appearance | Settings | Light / dark / system | user-facing |
| Export & Backup | Export | Settings | Export and restore data | user-facing |
| Share | Share | Settings | Share the app, QR code | user-facing |
| Onboarding | Onboarding | First launch only | Initial setup | user-facing |
| Component Showcase | ComponentShowcase | **no user entry point** | Internal component gallery | **DEV-ONLY** |

More should show **exactly 11 tiles**. Payday was deliberately merged into
Income — a Payday tile on More would be a regression.

---

## 3. Feature inventory

**Navigation** — 3 tabs. Camera tab does not render a screen; it immediately
opens QuickCapture as a modal.

**Dashboard** — Safe to Spend hero, Quick Add (Add Expense, Add Income, Add
Bill, Add to Goal), featured/pinned goal, greeting that shows the profile name
plus one of ten rotating messages chosen per mount.

**Spending / Add Expense** — 12 categories, amount, note, receipt photo,
recurring flag, custom logo per merchant name.

**Income / Add Income** — fixed amount or a low/high **range** (saves the
average). Six source chips: Paycheck, Freelance, Cash, Gift, Side Job, Other.

**Payday Planner** — paycheque amount, frequency, pay day; produces a split
across bills and goals. Saving **updates that day's paycheque rather than adding
another** (it previously stacked duplicates; a one-time cleanup removes old
duplicates on first launch, guarded by a settings flag).

**Bills & Subscriptions** — monthly or weekly bills, subscriptions with a
billing day, mark paid, popular-subscription quick-picks (name prefill only).

**Savings Goals** — 20 goal types, target/current amounts, deposits, pinning,
completion.

**Debt** — balances, minimum vs actual payment, APR, payoff projection.

**Calendar / Monthly Breakdown / Weekly Check-In** — derived views.

**Currency Calculator** — offline, editable rates.

**Smart Capture (Android)** — photo, ML Kit OCR, parse amount/date/due
date/merchant, classify bill vs expense, categorise by keyword, then a
confirmation question with Yes/No push buttons before anything is filed. Nothing
auto-saves.

**Merchant memory** — on save, the merchant is recorded (normalised name, doc
type, category, recurring, last amount, running average, due day, times seen).
Later captures consult it before the built-in keyword lists.

**Category recognition** — regex keyword lists only. Recognises common Canadian
chains. **It does not reason** — an unlisted word (e.g. "boat muffler") yields
no category.

**Reminders** — bill/subscription notifications at 09:00 in four modes:
minimal (due day), standard (1 day + due day), detailed (3 + 1 + due day, with
amounts), aggressive/"Every day" (7 days through due day). Queue is sorted
soonest-first and capped at 60 because iOS silently drops past 64 pending.

**Custom logos** — user-attached image keyed on item NAME, shown everywhere that
name appears. A brand-logo auto-fetch system was researched and **deliberately
not built** (docs/BRAND_LOGO_SYSTEM_RESEARCH.md).

**Export / Backup / Restore** — JSON export and restore in src/lib/backup.ts.

**AI seam** — src/lib/recognition/enhance.ts is an extension point for a future
classifier. Currently a pass-through; no AI is present.

---

## 4. Expected behaviour (verify — do not assume)

**Verification status is stated honestly. Most of this is UNVERIFIED on web.**

| Workflow | Expected | Verified? |
|---|---|---|
| Create expense | Appears in Spending; month totals update; survives refresh | Android: manually spot-checked. **Web: NOT verified** |
| Create income | Appears in Income; totals update | Same |
| Create bill | Appears in Bills; due label correct; reminders rescheduled | Android partly; **web unverified** |
| Mark bill paid | Moves state, removes its pending reminders | Unverified end-to-end |
| Payday save twice | Exactly ONE paycheque row for that date | Logic changed for this; **not verified on device** |
| Create goal | Correct unique icon; progress updates on deposit; completion state | Icon uniqueness verified in code (20/20 unique keys); UI **unverified** |
| Delete anything | Disappears from every dependent view | **Unverified** |
| Refresh browser | Data persists via WASM SQLite | **UNVERIFIED — a primary thing to test** |
| Category recognition | Restaurant/groceries/pharmacy/Netflix/hydro recognised | Verified by unit test on parsed text only, NOT through the UI |

Automated coverage: **136 Jest tests pass**, and `tsc` reports 0 errors. That is
a low bar — the tests are mostly unit-level, not end-to-end. Do not treat a
green suite as evidence a workflow works.

---

## 5. Known limitations and suspected weak points

Stated plainly. **These are not excuses — if any is actually a defect, call it.**

- **No OCR on web.** ML Kit is native-only; src/lib/recognition/index.web.ts
  returns ok:false so the app shows the manual path.
- **Browser persistence unverified.** WASM SQLite may need COOP/COEP headers not
  set here. Data loss on refresh is plausible.
- **Notifications almost certainly do not fire on web.**
- **Haptics silent in browsers** (visual press animation should still work).
- **Category recognition is keyword-only** and will miss anything unlisted.
- **No vehicle/car-repair expense category exists** — car work currently lands
  in "shopping". This is a gap, not a design decision.
- **Dark mode is new** and has never been reviewed screen by screen.
- **Desktop layout was never designed.** Phone-first only.
- **Component Showcase is dev-only** and should be unreachable.
- **Brand-logo auto-fetch does not exist** (researched, not built).
- **The AI enhancer is a stub.**
- **Node 24 exceeds Expo 55's tested range.**
- Restore in backup.ts had type errors until recently; **restore is not
  well-tested.**

---

## 6. Test personas

Evaluate every major workflow against all five. The app's stated goal is that a
person with no financial background can use it, so B, D and E matter most.

**A — Expert.** Financially literate, tech-savvy. Success: totals reconcile
exactly; no redundant taps; information architecture is defensible; edge cases
(negative, zero, huge, duplicate) handled; nothing recalculates inconsistently
between screens. Failure: sloppy rounding, disagreeing totals, unclear
Safe-to-Spend derivation, features that duplicate each other.

**B — Low tech / low financial literacy.** Does not know "APR", "recurring",
"variable range", "subscription vs bill". Success: plain language, obvious next
action, no jargon, mistakes are recoverable. Failure: unexplained terms,
destructive actions without confirmation, silent failures.

**C — Average user.** Comfortable with banking apps. Success: everything behaves
as such apps do; no surprises. Failure: unusual gestures, hidden actions,
inconsistent placement.

**D — Low literacy / low confidence.** Needs plain words, large obvious targets,
forgiving navigation, low cognitive load. Success: can add an expense without
reading a paragraph; icons plus text, never icon alone for a critical action.
Failure: small text, dense screens, ambiguous icons, no way back.

**E — First-time / internet-inexperienced.** May not know app conventions —
hamburger menus, chevrons, tab bars, modals, long-press. Success: labels not
just icons; visible instructions; nothing depends on knowing a convention.
Failure: icon-only controls, gesture-only actions, unexplained symbols.

For each workflow, state whether each persona would succeed, struggle, or fail,
**and why**.

---

## 7. Stress-test scenarios

Evaluate by execution where possible, otherwise by reading the code — and say
which you did.

**Volume:** empty app / 1 expense / 100 expenses / many bills / many goals / no
goals / no bills. Look for list performance, pagination absence, layout breakage.

**Input:** long merchant names; very large amounts (1234567.89); zero; decimals;
negative; non-numeric; empty required fields; leading zeros; extremely long
notes; emoji; right-to-left text.

**Duplicates:** two bills same name; two subscriptions same name; same vendor
repeatedly (merchant memory); unknown vendor.

**Capture (Android logic, code-review on web):** OCR failure; blurry, rotated,
partial receipt; wrong category guess; wrong amount guess; user correction path;
does the confirmation actually prevent a bad auto-save?

**Lifecycle:** recurring bill; recurring expense; bill marked paid; delete
expense/bill/goal; completed goal; 20 goal types; **goal icon uniqueness**.

**Platform:** offline; simulated network failure; web refresh; browser reload;
resize; small and large Android screens; tablet; keyboard open; large system
font; dark and light themes.

**Data:** backup; restore; corrupt or missing receipt image; custom logo added
and removed; permission denied; camera unavailable; storage failure;
**delete-all-data flow**; and whether destructive taps are guarded.

---

## 8. Visual stress test

Every page should feel like the same app. Look for:

- inconsistent header treatment between screens
- inconsistent card radius/border/padding/shadow
- broken spacing rhythm
- typography drift (body 17, small 15, caption 14, label 13, section header 19 —
  anything at 10-12px is a defect)
- **arbitrary icon sizes.** Concept icons must render at exactly two sizes:
  **64px** (tiles, grids, rows, cards) and **40px** (inline beside text)
- flat line icons mixed in where matte concept art belongs
- placeholder artwork
- grey circles, or a **second baked-in circle** inside an icon frame
- white/grey backgrounds baked into supposedly transparent PNGs
- clipped or stretched artwork
- inconsistent row heights or button styles
- inconsistent avatar treatment — the Dashboard logo must have **no circle
  behind it**
- leftover developer UI

**Intentionally line icons — do NOT report these:** chevrons, plus, close,
trash, pencil, checkmark ticks, ellipsis, search, info, alert, refresh, back
arrows, camera-flip, Add-Income submit glyph, Currency swap action.

---

## 9. Functional consistency

Check the same concept behaves identically everywhere:
- an icon means the same thing on every screen
- Bills entry points always reach Bills
- goal type maps to the same artwork in the picker, the list and the Dashboard
- a custom logo for a name appears everywhere that name appears
- totals agree across Dashboard, Spending, Monthly Breakdown, Weekly Check-In
- a bill amount agrees between Bills and any "coming up" surface
- deleting removes the item from **every** dependent view
- editing updates **every** dependent view

---

## 10. Data integrity — source of truth

Read from DashboardScreen.tsx (verified in source at this commit):

    totalIncome    = SUM(income.amount)   WHERE date BETWEEN month start AND end
    totalSpending  = SUM(expenses.amount) WHERE date BETWEEN month start AND end
    moneyLeft      = totalIncome - totalSpending
    safeToSpend    = MAX(0, moneyLeft - unpaidBillsTotal - goalsSavingsNeeded)

Things worth attacking:
- Safe to Spend is **floored at zero** — overspending is not shown as negative
  here. Is that clear to the user, or misleading?
- Monthly Breakdown computes its own totals with its own queries. **Do they
  agree with the Dashboard for the same month?**
- Bills are stored with a due_day/due_weekday, not dated rows — check how
  "unpaid total" is derived and whether it double-counts.
- Goal progress = current_amount / target_amount. Check division by zero,
  over-100% deposits, and completion state.
- Debt payoff uses an amortisation formula in DebtScreen.tsx (calcPayoff) with a
  999-month "never at this rate" sentinel — check boundaries and 0% APR.
- Income "variable range" saves the **average** of low and high. Does any total
  imply it stored the real figure?

Reconcile: create known data, then compare Dashboard vs Spending vs Monthly
Breakdown vs Weekly Check-In. Any disagreement is a high-severity finding.

---

## 11. Accessibility

- contrast in **both** themes
- tap targets (44-48px min)
- icon-only controls without labels
- accessibilityLabel presence in code
- long text and large system font scaling
- error message clarity
- form labels and focus order
- destructive actions: confirmation, undo
- screen-reader implications visible in source

---

## 12. Security and privacy

- **All data is local** — SQLite on device. No backend, no accounts.
- **Nothing should leave the device** in normal use. Verify by inspecting the
  bundle/network for outbound calls; report anything you find.
- **OCR is on-device** (ML Kit). Raw OCR text is parsed and, per the code
  comments, not persisted — verify that claim.
- **Receipt images** are stored in app storage (src/lib/receiptStorage.ts).
- **Custom logos** are user-supplied files; no remote fetch. Brand auto-fetch was
  researched and not built — confirm no lookup exists.
- **Backup** writes a JSON file the user shares deliberately.
- **Secrets:** there should be none. No .env, no API keys. Verify.
- **Permissions:** camera, and notifications on Android 13+. Check nothing else
  is requested.
- **Delete-all-data** wipes all tables including merchant_memory. Verify it is
  complete and guarded.

---

## 13. Performance

Likely sensitive areas: icon loading (52 PNGs at 256x256, ~1.8 MB total — they
were 59 MB until recently, so check for any remaining oversized asset); long
lists (no virtualisation on some screens — check); repeated database queries on
focus (several screens reload on every focus, and Bills reschedules all
notifications on every load); OCR time; WASM SQLite startup; web bundle size
(~12 MB); startup time; rendering 100+ transactions.

---

## 14. Browser-specific notes

| Area | Android | Web |
|---|---|---|
| Database | native SQLite file | wa-sqlite WASM; metro.config.js resolves .wasm |
| OCR | ML Kit | none — index.web.ts returns ok:false |
| Notifications | scheduled locally | not expected to fire |
| Camera | expo-camera | getUserMedia; needs HTTPS/localhost + permission |
| File system | expo-file-system | limited |
| Haptics | vibration | silent |
| Persistence | file-backed | OPFS/IndexedDB — **unverified** |

dist/ must be **served over HTTP**; file:// will not work:

    cd dist && npx serve .        or    python -m http.server 8080

---

## 15. Source-of-truth files to read first

| Concern | File |
|---|---|
| Navigation | src/navigation/AppNavigator.tsx |
| Design tokens / typography / icon sizes | src/theme/index.ts, src/theme/colors.ts |
| Icon registry (single source) | src/data/iconRegistry.ts |
| Icon components | src/components/peggy/PeggyIconFrame.tsx, src/components/IconBadge.tsx |
| Dashboard + totals | src/screens/DashboardScreen.tsx |
| Bills | src/screens/BillsScreen.tsx |
| Expenses | src/screens/AddExpenseScreen.tsx, src/screens/ExpensesScreen.tsx |
| Goals | src/screens/GoalsScreen.tsx, src/data/goalTypes.ts |
| OCR + parsing | src/lib/recognition/parse.ts, index.ts, index.web.ts, types.ts |
| AI extension point | src/lib/recognition/enhance.ts |
| Merchant memory | src/lib/merchantMemory.ts |
| Database schema + migrations | src/database/database.ts |
| Backup / restore | src/lib/backup.ts |
| Notifications | src/lib/notifications.ts |
| Custom logos | src/context/CustomLogoContext.tsx, src/lib/customLogos.ts |
| Design rules | docs/PEGGYBANK_DESIGN_SYSTEM.md, docs/PEGGYBANK_OS_CHARTER.md, docs/PEGGYBANK_ICON_STYLE.md |
| Known issues (may be stale) | KNOWN_ISSUES.md, UI_AUDIT.md, AUDIT_REPORT.md |

---

## 16. Test data recipe (fake only)

Income: Paycheque 2400.00 (recurring monthly, 15th) · Side job 300.00 (one-off)

Expenses: Boston Pizza 58.00 restaurant · No Frills 48.22 groceries ·
Jean Coutu 32.15 health · Canadian Tire 289.44 shopping ·
Test Diner 12.34 restaurant

Bills: Bell 95.42 monthly day 5 · Hydro Quebec 84.20 monthly day 15 ·
Netflix 16.49 subscription day 22

Goals: Vacation target 2000 · New Car target 8000 · Emergency Fund target 3000

Debt: CIBC Visa 2500 balance, min 50, APR 19.99

Expected (same month, all dates inside it):
- total income 2700.00
- total spending 440.15
- money left 2259.85
- Safe to Spend = 2259.85 minus unpaid bills minus goal savings need, floored at 0

**Check the app's arithmetic against these numbers**, and check the same figures
on Dashboard, Spending, Monthly Breakdown and Weekly Check-In.

Edge data to add: merchant name of 60+ characters; amount 1234567.89; amount
0.00; amount -5; a goal with target 0; a bill on day 31; two bills both named
"Bell".

---

## 17. What to return

- executive verdict
- severity-ranked bug list with reproduction steps
- visual consistency score, with specific violations
- usability score per persona (A-E) with reasoning
- accessibility concerns
- data-integrity concerns (any totals that disagree)
- privacy/security concerns
- web-specific failures
- Android-specific concerns inferred from source
- likely edge-case failures
- file/line references for static findings
- **must fix before release / should fix / nice to have / works well**
- any contradiction between this document and the implementation

State clearly for each finding whether you **executed** it or **inferred it from
source**. Do not present static reasoning as a runtime result.

Be skeptical. Assume the author is too close to the work to see its faults.
