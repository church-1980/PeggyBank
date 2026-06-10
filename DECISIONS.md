# PeggyBank — Approved Design Decisions
**Last updated:** 2026-06-05

> This file records every approved design decision and things we are NOT changing.
> Before suggesting any change, check here first.

---

## Architecture Decisions

**Decision: expo-sqlite, offline-first, no backend**
All data stored locally on device. No server, no account, no sync. User owns their data.
Do NOT add a backend, login system, or cloud sync unless user explicitly approves.

**Decision: Single Stack navigator, all non-tab screens are modals**
Every screen except the 3 bottom tabs and Onboarding uses `presentation: 'modal'`.
This means dismiss buttons are ALWAYS `chevron-down`, never `chevron-back`.
Do NOT change this navigation pattern.

**Decision: getDatabase() singleton with promise-lock**
Never call `SQLite.openDatabaseAsync()` directly. Always use `getDatabase()` from `src/database/database.ts`.
Do NOT bypass this pattern.

**Decision: Migrations array, never alter CREATE TABLE**
New columns go in the migrations array in `database.ts`. Each migration is wrapped in try/catch so reruns are safe.
Do NOT change the CREATE TABLE statements.

---

## Theme Decisions

**Decision: useColors() + makeStyles(C) + useMemo on every screen**
Every screen uses `const C = useColors()` and `const styles = useMemo(() => makeStyles(C), [C])`.
Do NOT use static `StyleSheet.create()` with inline colors.
Do NOT hardcode any color value anywhere in any screen.

**Decision: DarkColors is default, LightColors is the light variant**
Both palettes are complete and identical in structure. They share the same glassBase (warm indigo) because it reads well on both modes.
Do NOT change the glass card color separately per mode.

**Decision: Spacing, Radius, Typography tokens are fixed**
- Spacing: xs=4, sm=8, md=16, lg=24, xl=36
- Radius: sm=10, md=16, lg=22, xl=30, full=999
- Cards always use Radius.lg
- Modal overlays always rgba(0,0,0,0.6)
Do NOT introduce new spacing or radius values without approval.

---

## UI Decisions

**Decision: All outline icons except active/selected state**
`pencil-outline`, `trash-outline`, `add-outline`, `calendar-outline` etc.
Filled variants (`checkmark-circle`, `home`, `grid`) only used for active/selected state indicators.
Do NOT use filled icons for regular actions.

**Decision: Empty states are 64×64 icon containers with bgElevated background**
Do NOT use 72×72 or bgCard for empty state icon containers.

**Decision: Section labels are Typography.label, C.textHint, uppercase, letterSpacing 0.6**
Do NOT use Typography.caption or C.textSecondary for section labels.

**Decision: Dashboard section order is fixed**
Order: Safe to Spend → Suggestion → Coming Up (Bills) → Featured Goal
Bills are more urgent than goals. This order does NOT change.

**Decision: Featured Goal on Dashboard is the compact GoalProgressWidget**
The full GoalProgressCard (with stats block) is only on the Goals screen.
The Dashboard widget shows ONLY: name, tiny SVG strip, %, remaining.
Do NOT put the full card back on the Dashboard.

**Decision: Only 1 pinned goal on the Dashboard at a time**
Query: `WHERE pinned = 1 LIMIT 1`
Do NOT show multiple pinned goals on the Dashboard.

---

## Features We Are NOT Building (Yet)

**Shared Household / multi-user mode** — Save for after beta. Not approved.
**Birthday & Gifts reminders** — Save for after beta. Not approved.
**Cloud backup / sync** — Not approved. App is offline-first by design.
**Login / accounts** — Not approved.
**Additional goal journey strip illustrations** (Cruise, Wedding, Car, etc.) — Not yet approved. Currently all use airplane→island.

---

## Testing Decisions

**Decision: Jest v29 with jest-expo preset**
Do NOT upgrade to Jest v30 — it is incompatible with jest-expo@56.
Use `--legacy-peer-deps` when installing any new test dependencies.

**Decision: Maestro for E2E, not Detox**
Maestro is easier for mobile flow testing and was chosen over Detox.
Maestro flows live in `maestro/` folder.
