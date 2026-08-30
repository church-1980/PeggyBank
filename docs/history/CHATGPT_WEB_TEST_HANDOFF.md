# PeggyBank — Web Build Test Handoff

You are being asked to **independently review the current, real state** of this
app's web build. Nothing here has been cleaned up or fixed in preparation for
your review. Assume defects exist and look for them.

**Do not treat this document as a claim that the app is correct.** It describes
what the app is *intended* to do. Where behaviour differs from these
descriptions, that difference is a finding — report it. If something looks
wrong but is listed below as intentional, say so and explain your reasoning
anyway; the list may itself be wrong.

---

## 1. Build identity

| | |
|---|---|
| Repository | github.com/church-1980/PeggyBank |
| Branch | feature/three-tab-camera-profile |
| Commit | 86ff2b049f960cd78234cd5a2b92adadda88d2e0 (86ff2b0) |
| Commit date | 2026-08-19 11:56 -0400 |
| Working tree | clean — 0 uncommitted changes |
| Expo SDK | 55.0.27 |
| React Native | 0.83.6 |
| React | 19.2.0 |
| react-native-web | ~0.21.0 |
| Build command | npx expo export --platform web |
| Output | dist/ (~12 MB) |

The app is **local-first**: no backend, no API, no accounts, no network calls.
All data lives on the device (SQLite). There is nothing to log into.

---

## 2. What is included

- dist/ — the built web application (index.html + bundles + assets)
- src/ — full application source, for code-level review
- assets/peggy-icons/ — the matte icon artwork (52 PNGs, 256x256)
- this file

---

## 3. IMPORTANT — what this package can and cannot demonstrate

dist/ is a **client-side single-page app**. Opening index.html directly from the
filesystem (file://) will **not** work; the bundle must be served over HTTP:

    cd dist && python -m http.server 8080      then open http://localhost:8080
    or:  npx serve dist

If you cannot execute a browser and interact with a running React application,
you **cannot** verify the interactive requirements below (data entry,
persistence across refresh, responsive rendering, pressed states). Say so
plainly rather than inferring results from the source. A static review of the
source is still valuable — it is simply a different thing, and should be
labelled as such.

---

## 4. Platform differences (web vs Android)

These are believed to be deliberate. **Verify them rather than assuming** — and
if something in this list is actually a bug, say so.

| Area | Android | Web | Why |
|---|---|---|---|
| Receipt OCR | Google ML Kit reads the photo and pre-fills fields | **No OCR.** Photo is kept; fields entered manually | ML Kit is a native module with no browser equivalent. src/lib/recognition/index.web.ts replaces it and returns ok:false, so the app shows its manual path instead of pretending to read the image |
| Camera | expo-camera native | Browser getUserMedia; needs HTTPS or localhost, plus permission | Browser security |
| Notifications | Scheduled local reminders, incl. daily "Every day" mode | Not expected to fire | expo-notifications scheduling is mobile-oriented. Settings UI still renders |
| Haptics | Buttons vibrate on press | Silent | expo-haptics is a no-op in browsers. The **visual** press animation should still work |
| Database | expo-sqlite native file | expo-sqlite via **wa-sqlite (WASM)** | Required metro.config.js to resolve .wasm |
| Export / share | expo-file-system + expo-sharing | Limited; browser download semantics differ | Platform capability |
| Image picker | Native picker | Browser file input | Platform capability |

**Not** intentional, and should be reported if seen: broken layout, missing
icons, unreadable text, crashes, non-functional navigation, data loss on
refresh.

---

## 5. Persistence — please test this specifically

SQLite runs in the browser via WASM, backed by browser storage (OPFS/IndexedDB
depending on browser). Expected: **data survives navigation and a full refresh.**

1. Create records (expense, income, bill, subscription, goal, debt)
2. Navigate to other screens and back — still listed?
3. **Hard refresh** (Ctrl/Cmd+Shift+R) — does it survive?
4. Close the tab, reopen the URL — does it survive?
5. Try a private/incognito window — behaviour may legitimately differ; note it

Report exactly which step (if any) loses data. Also note any console errors
mentioning sqlite, wasm, OPFS, SharedArrayBuffer, or cross-origin isolation —
WASM SQLite can require specific COOP/COEP headers, and whether those are set
correctly here is **untested and unknown**.

---

## 6. Screens (22 registered routes)

Reached from a **3-tab bottom bar**: Home · Camera · More.

| Screen | Route | How to reach |
|---|---|---|
| Dashboard | Dashboard | Home tab |
| More (hub) | MoreScreen | More tab |
| Quick Capture (camera) | QuickCapture | Camera tab (opens immediately) |
| Spending | Spending | More to Spending |
| Income | Incomes | More to Income |
| Bills & Subscriptions | Bills | More to Bills & Subscriptions |
| Debt Tracker | Debt | More to Debt Tracker |
| Savings Goals | Goals | More to Savings Goals; Home to Add to Goal / See all |
| Weekly Check-In | WeeklyCheckIn | More to Weekly Check-In |
| Monthly Breakdown | MonthlyBreakdown | More to Monthly Breakdown; Home to View full breakdown |
| Calendar | Calendar | More to Calendar |
| Currency Calculator | Currency | More to Currency Calculator |
| Profile | Profile | More to Profile; Home to tap the logo |
| Settings | Settings | More to Settings |
| Add Expense | AddExpense | Home to Add Expense |
| Add Income | AddIncome | Home to Add Income |
| Payday Planner | Payday | **Income screen, card at the top** (deliberately no longer a More tile) |
| Appearance | Appearance | Settings to Appearance |
| Export & Backup | Export | Settings to Export & Backup |
| Share | Share | Settings to Share with a Friend |
| Onboarding | Onboarding | First launch only |
| **Component Showcase** | ComponentShowcase | **Dev-only.** No user-facing entry. Not part of the product — ignore unless reachable by accident |

The More hub should show **11 tiles**. Payday was intentionally merged into
Income; a Payday tile on More would be a regression.

---

## 7. Icon expectations

**Concept/category icons** (anything representing a *subject* — a goal type, an
expense category, a More tile, a list row) should be the **matte 3D artwork**:
soft purple #7B61FF + mint/teal #25C2A0, transparent background, consistent
lighting and perspective.

Report as defects:
- flat line icons where a concept icon belongs
- grey/empty **placeholder** boxes
- clipped or cropped artwork
- a visible white/grey box behind an icon that should be transparent
- two different concepts sharing the same artwork

**Intentionally NOT matte** — interface affordances that should remain simple
line icons. Do **not** report these as failures: chevrons, plus/add, close/X,
trash, pencil/edit, checkmark ticks, ellipsis/overflow, search, info, alert,
refresh, back arrows, the camera-flip control, the Add-Income submit glyph, and
the Currency swap-action button.

**Sizing rule:** concept icons render at exactly **two sizes** — 64px in tiles,
grids, list rows and cards; 40px inline beside a line of text (chips, tabs,
toggles, header bell, small stat markers). A third size, or one context using
two different sizes, is a defect.

---

## 8. Goal picker — check for duplicates

Add Goal (Goals, then +) shows a **20-tile goal-type grid, 3 across**. Every one
is expected to have its **own distinct artwork**:

Vacation, Cruise, Flight, Wedding, Car, Home, Down Payment, Emergency,
Education, Baby, Renovation, Medical, Retirement, Investing, Business,
Pay Off Debt, Gifts, Pet, Technology, Other

Several previously shared artwork (Vacation/Cruise/Flight all used one suitcase;
Income/Payday shared money-bags). **Verify all 20 are unique and suit their
labels**, and check no label truncates with an ellipsis.

Expense categories (Add Expense) expect 12 unique icons: groceries, gas,
restaurant, shopping, health, kids, fun, gifts, pets, home, travel, other.

---

## 9. Visual system to check against

- **Typography scale** — body 17, small 15, caption 14, labels 13, section
  headers 19. Anything visibly smaller (10-12px) is a defect; several such cases
  were recently fixed and regressions are plausible.
- **No truncation with an ellipsis** anywhere. Labels should wrap or the
  container should widen. Report every one you find, including long merchant
  names and the profile name in the Dashboard header.
- **Cards** — consistent corner radius, border, padding across screens.
- **Headers** — each screen should present its title consistently.
- **Bottom navigation** — 3 tabs, consistent everywhere it appears.
- **Avatar/logo** — the Dashboard logo is the mascot with **no circle or white
  bubble** behind it. A white disc behind it is a defect.
- **Dark mode** — Settings, Appearance, Dark. Only recently implemented;
  unstyled/invisible text or white-on-white areas are plausible. Hunt for them.
- **Empty states** — every list screen should have a designed empty state.

---

## 10. Functional areas to exercise (fake data only)

Use invented data — merchant "Test Diner", amount 12.34, name "Test User". No
real personal or financial information is required or wanted.

- **Dashboard** — Safe to Spend, Quick Add (Add Expense / Add Income / Add Bill
  / Add to Goal), Your Goals, rotating greeting containing the profile name
- **Add Expense** — amount, category grid, note, recurring toggle, save
- **Add Income** — Fixed vs Variable Range, source chips (Paycheck, Freelance,
  Cash, Gift, Side Job, Other), custom label
- **Bills & Subscriptions** — add a bill (monthly and weekly), add a
  subscription, popular-subscription quick-picks, mark paid, edit, delete
- **Savings Goals** — create with each goal type, deposit, pin, delete
- **Debt** — add a debt, record a payment, payoff projection
- **Calendar / Monthly Breakdown / Weekly Check-In** — do the figures agree with
  the records you created?
- **Payday Planner** (via Income) — enter a paycheck, check the split; **save
  twice** and confirm it does not create two paycheck entries
- **Currency Calculator** — offline conversion, custom rates
- **Profile / Settings / Appearance / Export & Backup / Share**
- **Merchant memory** — save a document for a merchant, then start another for
  the same merchant; the app is expected to recall it. On web there is no OCR,
  so exercise this by typing the same merchant name
- **Confirmation before save** — on Android the capture flow asks "Put $X in
  your <category> expenses?" with Yes/No push buttons. On web, OCR is disabled,
  so this prompt may not appear at all — note what actually happens

---

## 11. Responsive widths

Primary target is **phone-shaped**. Inspect at approximately:

- **375 px** (standard phone) — primary target
- **430 px** (large phone) — primary target
- **768 px** (tablet)
- **1280 px and up** (desktop browser)

**Unknown/untested:** whether the layout is intended to stay phone-width and
centre on large screens, or expand. It was built phone-first and has **not** been
designed for desktop. Describe what actually happens (full-width stretch,
enormous cards, awkward whitespace, unreadable line lengths) and treat poor
desktop presentation as a **finding**, not as accepted design.

---

## 12. Accessibility and interaction

- Text legibility and contrast, in **both** light and dark themes
- Tap targets — 44-48 px minimum
- Text clipping or overlap, especially long merchant names and large amounts
  (try 1234567.89)
- Form behaviour: keyboard/focus, tab order, validation messages, what happens
  on invalid or empty input
- Pressed / selected / disabled states — do buttons visibly respond?
- Scrolling, and modal open/close/dismiss behaviour
- Browser console: report **all** errors and warnings, including React key
  warnings, act() warnings, and any red errors on load

---

## 13. Known-unknowns (honest gaps)

Genuinely untested — do not assume these work:
- Whether SQLite-in-browser persists reliably across refresh in every browser
- Whether the camera works on web at all in this build
- Whether dark mode is complete across every screen
- Whether any screen throws on web due to a native-only API not yet shimmed
- Desktop layout behaviour

---

## 14. How to report

For each finding: **screen, what you did, what you expected, what happened**,
with browser, viewport width, and any console output. Rank by severity
(broken/data-loss, then visual inconsistency, then polish).

Be critical. A report that finds nothing is more likely to mean the app was not
genuinely exercised than that it is defect-free.
