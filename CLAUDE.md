# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding
Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First
Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes
Touch only what you must. Clean up only your own mess.

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution
Define success criteria. Loop until verified.

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

## 5. DESIGN SYSTEM LOCK (v2.0 — non-negotiable)

> **GOVERNING CHARTER:** `docs/PEGGYBANK_OS_CHARTER.md` is the supreme directive for
> this project. Read it before any visual work. You are a Product/UX/Design-Systems/
> Frontend Architect building **PeggyBank OS**, not a feature developer. Screens
> assemble the OS; they never invent UI. Finish the OS before migrating screens.
> Deliver **visual evidence at every phase gate** (APK + HTML mirror), and do not
> proceed until it is approved. Everything below implements that charter.

**As of the `design-system-foundation-lock-20260804` tag, PeggyBank has ONE design
system. The component library in `src/components/peggy/` and the tokens in
`src/theme/` are the single source of truth. `docs/PEGGYBANK_DESIGN_BIBLE_V2.md`
documents it.**

### The One Rule
> **No visual component may be created inside a screen.** If a new visual pattern
> is needed, it must first be added to the design system (`src/components/peggy/`),
> documented in the Design Bible, and only then used across the app.

This is the rule that keeps Linear, Apple Wallet, Revolut, and Notion consistent
for years. It applies to Claude and to every developer.

### What this forbids in `src/screens/`
- ❌ New `StyleSheet` that re-creates a card, button, row, header, badge, or icon container.
- ❌ Raw `<Image source={require('assets/peggy-icons/…')}>` or `peggy-mascot` — use `PeggyIconFrame` / `PeggyAvatar`.
- ❌ Hand-rolled circles/tiles behind an icon — use `PeggyIconFrame`.
- ❌ New `Ionicons` used as a *concept* icon — concepts resolve through the registry. (Ionicons remain OK only as small UI affordances: chevrons, close, back, info.)
- ❌ Emoji in product UI.
- ❌ Arbitrary icon sizes — use the semantic `IconFrameSize` scale (compact/standard/card/feature/hero).
- ❌ Raw color/spacing/radius/shadow values — use `useColors()` + `Spacing`/`Radius`/`Shadow` tokens.

### What a screen MAY contain
Data loading, state, event handlers, navigation, section configuration, and the
composition of canonical components. Appearance comes from the system, not the screen.

### The canonical components (the only approved visual building blocks)
`PeggyPage`, `PeggyScreen`, `PeggyHeader`, `PeggyBackButton`, `PeggyBottomNav`,
`PeggyCard`, `PeggyHeroCard`, `PeggySection`, `PeggySectionHeader`, `PeggyDivider`,
`PeggyIconFrame`, `PeggyAvatar`, `PeggyGoalCard`, `PeggyQuickActionCard`,
`PeggyListRow`, `PeggyStatCard`, `PeggyPickerTile`, `PeggyButton`, `PeggyIconButton`,
`PeggyInput`, `PeggyCurrencyInput`, `PeggyChip`, `PeggyBadge`, `PeggyProgressBar`,
`PeggyEmptyState`, `PeggyLoadingState`, `PeggyErrorState`, `PeggyModal`,
`PeggyConfirmationModal`. (`PeggyIconBadge` is a deprecated shim over `PeggyIconFrame`.)

### The icon pipeline (one path, no exceptions)
`screen → concept ID → src/data/iconRegistry.ts → PeggyIconFrame`.
No screen imports an icon PNG. New concepts are added to the registry first.

### Enforcement
`src/__tests__/designSystemLock.test.ts` is a **ratchet**: it fails if a *new*
screen imports premium art directly or references the retired `peggyIcons` registry.
Do not add to its allow-list to make a violation pass — fix the screen instead.

### Feature freeze
No new features, screens, or visual experiments until the screen migration
(Design Bible Phase 7) is complete and approved. Migration order and acceptance
standard live in `docs/PEGGYBANK_DESIGN_BIBLE_V2.md`.
