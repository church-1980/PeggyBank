# PeggyBank V3 — Product Architect Directive (GOVERNING CHARTER)

> This is the supreme governing document for PeggyBank. It outranks convenience,
> speed, and any single-screen request. If a task conflicts with this charter,
> the charter wins. Adopted 2026-08-04; enforced by CLAUDE.md §5 and
> `src/__tests__/designSystemLock.test.ts`.

**STOP. READ THIS ENTIRE DOCUMENT BEFORE WRITING A SINGLE LINE OF CODE.**

From this point forward you are NOT functioning as a feature developer. You are:
Lead Product Architect · Lead UX Architect · Lead Design Systems Engineer · Lead Frontend Architect.

You are responsible for PeggyBank as an entire product, not a collection of screens.
Your job is to build the operating system that every page uses. **If you ever find
yourself editing one screen in isolation, you are doing the wrong job.**

## The Goal
PeggyBank must feel like **one application** — not similar, not close, not inspired. One.
Every screen must appear built by the same team at the same time. If any screen feels
older, newer, flatter, more rounded, less detailed, or uses different spacing,
typography, shadows, icons, avatars, buttons, cards, rows, navigation, or interaction
patterns — the design system has failed.

## The Product Is Frozen
Do NOT: add features · redesign individual screens · invent new UI · patch visual
inconsistencies · replace icons with Ionicons · create temporary solutions.
No feature work is authorized. The only objective is complete architectural consistency.

## PeggyBank OS (System A) vs Screens (System B)
**System A — PeggyBank OS:** the permanent design system. Everything visual belongs
here and nowhere else. It owns: design tokens, typography, spacing, grid, layout,
motion, elevation, colors, radius, shadows, navigation, templates, icons, icon frames,
avatar, buttons, cards, rows, inputs, sections, headers, progress bars, chips, badges,
empty/loading/error states, camera flow, modal system, bottom navigation,
accessibility, and every interaction/selection/disabled/focus state.

**System B — Screens:** screens invent nothing. They assemble PeggyBank OS. They
request components; they never create components.

## First Responsibility
**Finish PeggyBank OS completely before any screen is migrated.**

## Canonical Component Library (each exists exactly once)
PeggyScreen/Page, PeggyHeader, PeggyHeroCard, PeggyCard, PeggySectionHeader,
PeggyAvatar, PeggyIcon, PeggyIconFrame, PeggyQuickAction, PeggyGoalCard, PeggyListRow,
PeggyButton, PeggyInput, PeggyProgressBar, PeggyChip, PeggyBadge, PeggyEmptyState,
PeggyLoadingState, PeggyErrorState, PeggyBottomNavigation, PeggyModal, PeggyDivider,
PeggyNotificationBadge, PeggySearchBar, PeggyForm, PeggyCameraCapture,
PeggyReceiptPreview, PeggyDocumentCard, PeggyConfirmationDialog, PeggySuccessState,
PeggyDeleteConfirmation.
If two screens use visually similar components, they use the **same** implementation —
not a copy, not a variation, not "close."

## Screen Templates (every screen inherits one)
Dashboard · List · Detail · Form · Settings · Camera · Report · Profile · Wizard.
No screen is designed individually. No exceptions.

## Icon System — one language
Same perspective, camera angle, lighting, material, softness, edge treatment,
dimensional depth, rendering quality, shadow, padding, transparent background, crop.
No sparkles, no baked-in circle/tile/shadow beyond the approved soft shadow. Only the
subject and dominant color may change. Tool, category, action, settings, navigation,
and report icons all belong to the same family.

## Icon Registry — one pipeline
No screen imports PNGs, SVGs, or Ionicons. Every icon resolves:
**semantic ID → registry → PeggyIcon → PeggyIconFrame.** Screens never know filenames.

## Avatar System
Exactly one avatar component. `PeggyAvatar` owns diameter, crop, border, background,
badge, status dot, fallback, shadow, scaling. Transparent artwork only; the component
owns the circle. Never stack a circular image inside another circular container. Never
create a second avatar implementation.

## Typography / Spacing / Motion
Complete centralized type scale (display, hero amount, screen/section/card titles,
body, helper, caption, label, button, status, amount). No arbitrary typography.
No arbitrary spacing — semantic tokens only, no `marginLeft: 7`, no magic numbers.
Complete motion language (navigation, buttons, cards, scanning, progress, loading,
success, delete, confirmation, receipt capture, goal completion). No random timings.

## Visual Audit
Audit every screen; record components used, direct icon imports, Ionicons, SVGs, emoji,
custom cards/rows/headers/spacing/colors/shadows/typography/avatars/icon containers,
duplicate implementations, and anything violating PeggyBank OS →
`docs/PEGGYBANK_UNIFORMITY_AUDIT.md`.

## Migration Order (only after PeggyBank OS is finalized)
Dashboard → More → Camera → Profile → Goals → Bills → Spending → Income → Reports →
Calendar → Weekly Check-In → Monthly Breakdown → Currency → Payday → Backup →
Settings → remaining. A screen is complete only when it uses **only** canonical OS
components.

## Automated Enforcement
Guardrails must fail the build on: direct PNG imports in screens, Ionicons in production
UI, emoji in production UI, arbitrary icon sizes, arbitrary spacing, duplicate visual
components.

## Absolute Rule
If two elements serve the same visual purpose, they MUST use the exact same shared
component — not a copy, not a variation, not "close."

## Final Acceptance
PeggyBank is complete only when: every page feels like the next page of the same app;
every visual element comes from PeggyBank OS; every icon belongs to one language; every
interaction belongs to one motion system; every component is reusable; every future
feature can be built without inventing new visual styles; zero legacy UI fragments
remain; and the product is visually indistinguishable from world-class product design.

## MANDATORY PHASE GATE — Visual evidence, not status reports
At the end of every major phase, **stop and produce visual evidence**, not just a
written report. For every canonical component and every migrated screen, provide
before-and-after visuals, list exactly which shared components it uses, and identify any
remaining deviations from PeggyBank OS. **Do not proceed to the next phase until those
visuals are reviewed and approved.**

*(Environment note: the RN app cannot be screenshotted from the build tooling here.
"Visual evidence" is therefore delivered as (a) an installable APK and (b) an HTML
mirror rendered from the same tokens/components/artwork. Both are provided at each gate.)*

---

## THE ONE EXTERNAL DEPENDENCY THIS CHARTER CANNOT RESOLVE ITSELF
Everything above is buildable **except the creation of icon artwork.** The matte-3D
icons can only be generated by the product owner (image generator); Claude can extract,
clean, wire, and place them, but cannot create them. "One icon language" therefore has a
hard dependency on the owner producing the ~15 remaining nav/action/tool icons listed in
`docs/PEGGYBANK_ICON_MANIFEST.md`. Until they exist, affected frames show a controlled
fallback — this is a **known, tracked gap**, not a design decision, and it is the true
critical path to full uniformity.
