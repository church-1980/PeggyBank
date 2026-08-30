# PeggyBank

The budgeting app you don't have to be good at budgeting to use.

Local-first: everything lives in SQLite on the phone. No account, no server,
no bank connection.

---

## Where everything is

Start here when you are looking for something. This map is the point of this
file — the project once had fifteen report files at the root and the brand
artwork loose in `assets/`, and finding anything meant guessing.

### The app

| Path | What is in it |
|------|---------------|
| `src/core/` | **The money brain.** Pure TypeScript — no React, no database, no platform. Runs anywhere, including plain Node, which is why the tests need no phone. |
| `src/lib/` | Talks to the database and the device: queries, storage, notifications, OCR. |
| `src/screens/` | One file per screen. Screens load data and compose components; they do not invent UI. |
| `src/components/peggy/` | **The design system.** Every visual element comes from here. |
| `src/i18n/` | Translations — English, Quebec French, Spanish, Portuguese, Chinese. |
| `src/database/` | Schema and migrations. |
| `src/__tests__/` | 810 tests. Most run real SQL against a real database. |

### The money, specifically

There is **one** financial engine. If a number is wrong, it is wrong here:

- `src/core/finance.ts` — Safe to Spend, money in, money out, what is owed
- `src/lib/financeSummary.ts` — reads the rows and hands them to the engine
- `src/core/paymentState.ts` — manual pay vs auto-pay, and what a bill row says
- `src/core/spendingChart.ts` — the Monthly Breakdown donut
- `src/lib/activity.ts` — What Happened, and Search

A test (`safeToSpendConsistency`) fails if any screen works a money figure out
for itself.

### Art and branding

| Path | What is in it |
|------|---------------|
| `assets/brand/` | **The logo.** `peggy-mascot.png` is the squirrel-and-P; the Design Bible and Icon System boards live beside it. |
| `assets/images/` | The generated app icon set — launcher, adaptive layers, favicon, splash. **Do not edit these by hand**; run `npm run icon`. |
| `assets/peggy-icons/` | The 53 concept icons, resolved through `src/data/iconRegistry.ts`. |

### Documentation

| Path | What is in it |
|------|---------------|
| `CLAUDE.md` | **The rules.** Design system lock, build steps, and the traps this project has already fallen into. Read before changing anything visual. |
| `docs/` | Current guidance: the Charter, the Design Bible, the icon system. |
| `docs/history/` | Past reports and handoffs. Kept as a record — **not** current instructions. |

### Scripts

| Path | What is in it |
|------|---------------|
| `scripts/ship.sh` | Typecheck, tests, APK, identity gate, copy to OneDrive. |
| `scripts/audit/` | The thirteen-section audit. |
| `scripts/webtest/` | Browser checks driven by real Chrome. |
| `scripts/setup/` | One-off phone and emulator setup for this machine. |
| `scripts/make-app-icon.js` | Regenerates every icon size from `assets/brand/peggy-mascot.png`. |

---

## Doing things

```bash
npm test                  # 810 tests, no device needed
npm run web               # run it in a browser
bash scripts/ship.sh      # typecheck -> tests -> APK -> OneDrive
bash scripts/ship.sh --verify   # checks only, builds nothing
npm run audit:all         # the full audit
npm run icon              # regenerate the app icon from the logo
```

### Runtime checks, in real Chrome

```bash
npm run audit:web              # money survives a reload
npm run audit:donut            # the Monthly Breakdown chart
npm run audit:search           # finding a transaction
npm run audit:bills            # auto-pay and the payment method
npm run audit:drilldown        # tapping a total to see what it was
npm run audit:language-screens # switching language actually changes screens
```

### Changing the app icon

The launcher icon is **not** read from `assets/images/` at build time. Android
reads it from `android/app/src/main/res/`, which only a prebuild rewrites — so
changing the artwork and building gives you the old icon.

```bash
npm run icon
APP_VARIANT=dev npx expo prebuild --platform android --no-install
bash scripts/ship.sh
```

---

## Things that will bite you

Every one of these has already cost someone hours. `CLAUDE.md` has the full
list; these are the ones that recur.

- **Escaped regex through a shell.** Writing `\b` through a shell or a Node
  string can land a literal backspace in the source. Edit via a script file,
  then grep the result for control characters.
- **The icon needs a prebuild.** See above.
- **`assets/brand/peggy-mascot.png` is drawn for a light background.** Its
  white face and the counter of the P are transparent with light pixels
  underneath. On a dark ground the face turns black. Composite on white.
- **Line endings.** Git checks out CRLF, so `\n`-based string matching in
  patch scripts silently stops matching.
- **Android runtime is unverified** unless a device was actually connected.
  A green web run does not prove native behaviour.

---

## What is not done

- **Localization reaches 3 screens of 23.** The dictionaries, formatters and
  picker are finished; most screens still render English.
- **No tutorial.** Onboarding is a single welcome screen.
- **No data-access layer.** SQL is written inline in about thirteen screens.
  The money logic is cleanly separated; the plumbing is not.
