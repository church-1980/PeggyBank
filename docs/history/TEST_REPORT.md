# PeggyBank Test Report
Generated: June 7, 2026 at 10:06 a.m.

---

## ✅ PASS (72)

- unknown › getDatabase singleton › returns a database object
- unknown › getDatabase singleton › returns the same instance on second call (singleton)
- unknown › getDatabase singleton › db has getFirstAsync method
- unknown › getDatabase singleton › db has getAllAsync method
- unknown › getDatabase singleton › db has runAsync method
- unknown › getDatabase singleton › db has execAsync method
- unknown › DarkColors palette › has all required keys
- unknown › DarkColors palette › has no undefined values
- unknown › DarkColors palette › all values are strings
- unknown › DarkColors palette › white is #FFFFFF
- unknown › DarkColors palette › black is #000000
- unknown › LightColors palette › has all required keys
- unknown › LightColors palette › has no undefined values
- unknown › LightColors palette › all values are strings
- unknown › LightColors palette › light and dark have same set of keys
- unknown › Spacing tokens › xs is a number
- unknown › Spacing tokens › sm is a number
- unknown › Spacing tokens › md is a number
- unknown › Spacing tokens › lg is a number
- unknown › Spacing tokens › xl is a number
- unknown › Spacing tokens › xs < sm < md < lg < xl
- unknown › Radius tokens › sm is a number
- unknown › Radius tokens › md is a number
- unknown › Radius tokens › lg is a number
- unknown › Radius tokens › xl is a number
- unknown › Radius tokens › full is 999
- unknown › Typography tokens › hero has a fontSize
- unknown › Typography tokens › h1 has a fontSize
- unknown › Typography tokens › h2 has a fontSize
- unknown › Typography tokens › h3 has a fontSize
- unknown › Typography tokens › body has a fontSize
- unknown › Typography tokens › bodyBold has a fontSize
- unknown › Typography tokens › small has a fontSize
- unknown › Typography tokens › smallBold has a fontSize
- unknown › Typography tokens › caption has a fontSize
- unknown › Typography tokens › label has a fontSize
- unknown › formatCurrency › formats zero
- unknown › formatCurrency › formats a whole number
- unknown › formatCurrency › formats decimals
- unknown › formatCurrency › formats thousands with comma
- unknown › formatCurrency › formats large amounts
- unknown › formatCurrency › formats negative amounts
- unknown › getMonthRange › returns start and end keys
- unknown › getMonthRange › start is first day of current month
- unknown › getMonthRange › end is last day of current month
- unknown › getMonthRange › start and end are in the same month
- unknown › getDaysUntil › returns a non-negative number
- unknown › getDaysUntil › returns a number up to 31
- unknown › getDaysUntil › handles day 1
- unknown › getDaysUntil › handles day 31
- unknown › getDaysUntilWeekday › returns 1-7 for any weekday
- unknown › formatDate › formats a known date string
- unknown › formatDate › does not throw on valid date strings
- unknown › getTodayString › returns a YYYY-MM-DD string
- unknown › getTodayString › matches the current date
- unknown › GoalProgressWidget › renders the goal name
- unknown › GoalProgressWidget › renders the correct percentage
- unknown › GoalProgressWidget › renders 0% for a goal with no progress
- unknown › GoalProgressWidget › renders "X to go" for an incomplete goal
- unknown › GoalProgressWidget › renders "Goal reached!" when complete
- unknown › GoalProgressWidget › does not render unpin button when onUnpin is not provided
- unknown › GoalProgressWidget › renders unpin button when onUnpin is provided
- unknown › GoalProgressWidget › calls onUnpin when unpin button is pressed
- unknown › GoalProgressWidget › calls onPress when the widget is tapped
- unknown › GoalProgressWidget › caps percentage at 100% even if current > target
- unknown › DashboardScreen section order › renders Safe to spend text
- unknown › DashboardScreen section order › renders Coming Up section
- unknown › DashboardScreen section order › renders Your Goals section
- unknown › DashboardScreen section order › renders the pinned goal widget
- unknown › DashboardScreen empty goal state › shows empty state text when no pinned goals
- unknown › DashboardScreen empty goal state › shows "Pin a goal" sub-text
- unknown › DashboardScreen empty goal state › shows Browse button

---

## ❌ FAIL (0)

- (none — all tests passed)

---

## 🔍 NEEDS MANUAL TESTING

- Receipt camera — requires physical device with camera
- Push notifications — requires device + Expo Go or production build
- APK install on fresh Android device (no prior data)
- Currency rate API — requires active internet connection
- Dark/light mode visual check — theme tokens tested in Jest, visual rendering needs eyes
- Pull-to-refresh on slow connection
- Safe to Spend card with $0 income and $0 expenses (edge case)
- Payday countdown wraps correctly at end of month
- Recurring bill auto-reset at start of new month
- Goal deadline shows correctly in different time zones
- Keyboard avoidance on Add Expense / Add Income forms
- Large text accessibility (system font size set to XL)
- Data persistence across full app restart (not just background)

---

## How to run tests

| Command | What it does |
|---------|-------------|
| `npm test` | Run Jest tests once |
| `npm run test:watch` | Run Jest in watch mode (re-runs on save) |
| `npm run test:coverage` | Run tests + generate coverage report |
| `npm run test:ci` | Run tests and save JSON output to test-results.json |
| `npm run test:report` | Generate this report from test-results.json |
| `npm run test:all` | Run tests + generate report in one command |

## How to run Maestro E2E flows

Maestro requires a running emulator or physical device connected via USB.

1. Install Maestro: `curl -Ls "https://get.maestro.mobile.dev" | bash`
2. Start your app: `npx expo start --android` (or --ios)
3. Run a single flow: `maestro test maestro/01_add_expense.yaml`
4. Run all flows: `maestro test maestro/`

Scripts (after Maestro is installed):
- `npm run maestro:expense` — test add expense flow
- `npm run maestro:bill`    — test add bill flow
- `npm run maestro:goal`    — test add goal flow
- `npm run maestro:all`     — run all 6 flows
