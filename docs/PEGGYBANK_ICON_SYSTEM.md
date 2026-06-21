# PeggyBank Icon System v1.0 — LOCKED VISUAL STANDARD

**Status:** Permanent visual source of truth. Do not alter without explicit owner approval.
**Reference image:** [`/design/PeggyBank-Icon-System-v1.png`](../design/PeggyBank-Icon-System-v1.png)
**Registry:** `src/data/peggyIcons.ts`
**Component:** `src/components/PeggyIcon.tsx`
**Asset folder:** `/assets/peggy-icons/`

---

## 1. The Standard

The image saved at `/design/PeggyBank-Icon-System-v1.png` is the **official, locked PeggyBank Icon System v1.0**. It is not inspiration, not a suggestion, not a rough example. Every icon used in PeggyBank must either be one of these exact assets or match this exact visual style.

### Where this standard applies
- Goals
- Spending categories
- Bills
- Dashboard cards
- Empty states
- Quick actions / QuickAdd arc
- Reports
- Notifications
- Future features (e.g. QuickSpeak)

### Style requirements (every icon must match)
- Premium app quality
- Soft 3D depth
- Subtle gradients
- Rounded geometry
- Polished highlights
- Consistent perspective and top-left lighting
- Consistent soft shadow under the icon
- Clean, readable silhouette
- Adult, professional, trustworthy finance-app feel
- No childish sticker / cartoon look, no flat generic look

### Non-negotiable — never replace these with:
emojis · Ionicons category icons · plain line icons · cheap outline icons · random SVGs · stock clipart · flat placeholder icons · cartoon icons · generic app icons.

### Color palette (from reference)
Vibrant but slightly desaturated. Navy, blue, teal, green, purple, amber accents — consistent with the reference image.

---

## 2. Asset Inventory (25 icons)

PNGs live in `/assets/peggy-icons/`. Filenames map 1:1 to `PeggyIconKey` in `src/data/peggyIcons.ts`.

| Key | File | Visual meaning |
|-----|------|----------------|
| vacation | vacation.png | Airplane |
| cruise | cruise.png | Cruise ship |
| flight | flight.png | Front-facing airplane |
| wedding | wedding.png | Wedding rings |
| new-car | new-car.png | Modern car |
| new-home | new-home.png | House |
| down-payment | down-payment.png | Golden key |
| emergency-fund | emergency-fund.png | Shield with check |
| education | education.png | Graduation cap |
| baby | baby.png | Baby stroller |
| renovation | renovation.png | Paint roller |
| medical | medical.png | Medical cross |
| retirement | retirement.png | Beach chair with umbrella |
| investing | investing.png | Money plant |
| business | business.png | Briefcase |
| pay-off-debt | pay-off-debt.png | Broken chain |
| gifts | gifts.png | Gift box |
| pet | pet.png | Paw print |
| technology | technology.png | Smartphone |
| christmas | christmas.png | Christmas tree |
| disney-trip | disney-trip.png | Fantasy castle |
| motorcycle | motorcycle.png | Motorcycle |
| gaming | gaming.png | Game controller |
| memories | memories.png | Camera |
| other | other.png | Plus sign in dotted circle |

> **Build note:** The registry `require()`s all 25 PNGs. Until every PNG exists, do **not** import `peggyIcons.ts` / `PeggyIcon` from any rendered screen — Metro will fail to resolve missing assets. Nothing imports them yet, so the current app and test suite are unaffected.

---

## 3. Icon Generation Prompt (use verbatim per icon)

```
Create one premium 3D app icon for PeggyBank.

Icon name: [ICON_NAME]

Style:
- premium finance app icon
- soft 3D depth
- subtle gradients
- polished highlights
- rounded geometry
- clean readable silhouette
- consistent top-left lighting
- soft shadow under icon
- modern trustworthy appearance
- adult professional design
- not cartoonish
- not childish
- not emoji
- not flat outline
- not clipart
- not realistic photo
- transparent background
- centered object
- square 1024x1024 canvas
- no text inside the icon
- no logo
- no border tile
- icon only

Color direction:
- vibrant but slightly desaturated
- navy, blue, teal, green, purple, amber accents
- consistent with PeggyBank reference image

Output:
PNG
1024x1024
transparent background
```

---

## 4. Usage

```tsx
import { PeggyIcon } from '../components/PeggyIcon';

<PeggyIcon name="vacation" size={44} />
```

Once PNG assets exist, use `PeggyIcon` everywhere icons appear (Goals, Dashboard, Add Expense categories, Bills, empty states, quick actions, reports, future QuickSpeak). Do not mix with emojis or other icon packs.

---

## 5. Audit — Current Icon Usage vs. Standard

Every location below currently uses emojis or Ionicons and does **not** match the v1.0 standard.

### A. Goals — `src/data/goalTypes.ts`
- Uses both `emoji` (🌴 🚢 ✈️ 💒 …) **and** Ionicons `icon` for all 20 goal types. **Mismatch.**
- Key mapping needed (goalTypes → PeggyIconKey):
  `car`→`new-car`, `home`→`new-home`, `down_payment`→`down-payment`, `emergency`→`emergency-fund`, `debt`→`pay-off-debt`. Others map by same name.
  Goal types **missing from the registry**: none — but the registry has extra keys not in goalTypes (`christmas`, `disney-trip`, `motorcycle`, `gaming`, `memories`). Adding these as goal types is a future option.

### B. Spending categories — `src/data/categories.ts`
- 12 categories use Ionicons outline icons (`basket-outline`, `car-outline`, …). **Mismatch.**
- No clean 1:1 to the 25 goal-style icons (categories like *groceries*, *gas*, *restaurant* have no peggy-icon yet). Needs either a category icon set in the same style or a documented sub-mapping.

### C. Goal artwork — `src/components/GoalProgressCard.tsx` & `GoalProgressWidget.tsx`
- Developer-drawn SVG journey strip (airplane→island). **Flagged for eventual replacement** per standard.

### D. Screens rendering goal/category emoji or Ionicons
- `DashboardScreen.tsx` — featured goal widget, category references
- `GoalsScreen.tsx` — goal cards
- `AddExpenseScreen.tsx` — category picker
- `ExpensesScreen.tsx` — category icons in history rows
- `BillsScreen.tsx`, `SubscriptionsScreen.tsx`, `DebtScreen.tsx`, `IncomesScreen.tsx` — category/Ionicons
- `QuickAddScreen.tsx` — arc menu icons (Ionicons)
- `MonthlyBreakdownScreen.tsx`, `WeeklyCheckInScreen.tsx`, `CalendarScreen.tsx` — category/Ionicons
- Empty states across all of the above — Ionicons placeholder icons

> **Note on UI chrome:** Navigation chevrons, tab bar, settings rows, and action icons (`pencil-outline`, `trash-outline`, `chevron-back`, `chevron-down`) are UI controls, **not** content icons. These are out of scope for the icon system and remain Ionicons unless explicitly decided otherwise.

---

## 6. Migration Plan (DO NOT START until owner approves)

**Phase 0 — Foundation (DONE)**
- ✅ Save reference image to `/design/`
- ✅ Create `/assets/peggy-icons/` folder
- ✅ Create `src/data/peggyIcons.ts` registry
- ✅ Create `src/components/PeggyIcon.tsx`
- ✅ Create this document

**Phase 1 — Generate & drop in 25 PNG assets**
- Generate each icon at 1024×1024 transparent PNG using the prompt in §3 and meanings in §2.
- Save into `/assets/peggy-icons/` with exact filenames.
- Verify `npm test` and `npx expo start` bundle cleanly with the registry now importable.

**Phase 2 — Wire Goals to PeggyIcon**
- Add `peggyIcon: PeggyIconKey` to `GoalTypeInfo` in `goalTypes.ts` (keep `emoji`/`icon` as fallback during transition — do not delete yet).
- Replace emoji/Ionicons rendering in `GoalsScreen` + Dashboard featured goal with `<PeggyIcon>`.
- Visual review → approval.

**Phase 3 — Spending categories**
- Decide category icon strategy (extend the style to a category set, or map to nearest existing keys).
- Update `categories.ts` + `AddExpenseScreen`, `ExpensesScreen`, and breakdown screens.
- Visual review → approval.

**Phase 4 — Bills, Subscriptions, Debt, Income, QuickAdd, Reports, Empty states**
- Replace content icons screen-by-screen, each with its own visual review.

**Phase 5 — Goal artwork (GoalProgressCard/Widget)**
- Replace developer SVG journey strip with standard-compliant artwork.

**Phase 6 — Cleanup**
- Once every surface uses `PeggyIcon`, remove dead `emoji` fields and unused Ionicons imports.
- Update `PROJECT_STATUS.md`.

Each phase ships behind its own approval and visual review per the project safety workflow.
