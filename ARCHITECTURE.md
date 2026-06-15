# The Plastic Surgeon — Architecture

> *The Plastic Surgeon exists to reduce failed prints, extend printer life, and make maintenance approachable for every maker, regardless of technical skill.*
>
> **Created by Jester's Workshop — Saving printers one layer at a time.**

---

## Five Architectural Pillars

Every design decision in this codebase is evaluated against these five principles, in order.

### 1. Mobile First
This is a **phone-first** application. Every screen is designed for one-handed use on Android devices before tablets or desktop layouts are considered.

- Minimum tap target: 48×48dp
- Critical actions live in the bottom half of the screen, within thumb reach
- Bottom tab navigation keeps the most-used features one tap away
- Swipe gestures are supplemental, never the only way to perform an action
- Forms scroll naturally without horizontal layout complexity

### 2. Offline First
**The app must function without an internet connection.** Maintenance manuals, inspection guides, schedules, printer records, and maintenance history all work offline.

Core rule: *If a user needs it standing in a garage with no Wi-Fi, it lives in the device database.*

- All guide content is seeded into SQLite at first launch — guides never require a network call
- All maintenance records are written to SQLite immediately on save
- Network features (cloud backup, AI inspection scoring) are additive layers that degrade gracefully
- No loading spinners for data the user already has

### 3. Camera Inspection Is a Core Feature
Camera-based visual inspection is a **first-class feature**, not a future addition. It is woven into the data model from the first schema design.

- `inspection_results.photo_uri` on every checkpoint row
- `guide_steps.requires_camera` column flags steps that should document evidence
- Camera permission is requested during onboarding — not as an afterthought when the user first taps it
- `InspectionScreen` is in primary navigation (bottom tab), not buried in a menu

### 4. Beginner Friendly
Most users have never disassembled a printer. The app assumes zero technical knowledge.

- Plain language throughout: "Clean your nozzle" not "Perform extruder maintenance protocol"
- Safety warnings displayed **prominently** before any step involving heat, electricity, or sharp tools
- Difficulty badges on every guide: 🟢 Beginner · 🟡 Intermediate · 🔴 Advanced
- Large images and clear visual cues in inspection guides
- **One step at a time** in all wizards — users never face a wall of text
- Estimated time on every guide so users can plan

### 5. Revenue-Ready Architecture
Design for premium features now, even if they ship later. Adding monetization must not require architectural rewrites.

- `guides.is_premium` column gates advanced guide content
- `isPremium()` utility at `src/lib/premium.ts` — currently returns `false`, swappable with IAP
- Premium features are **visible but locked** (not hidden), with tasteful upgrade prompts
- `printers` table designed for print farm scale (no artificial row limits in the schema)

**Future premium candidates:** AI inspection scoring, print farm multi-printer dashboard, cloud backup/sync, video tutorials, community repair database, unlimited print history

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Expo + React Native | 55 / 0.83.6 |
| Language | TypeScript | ~5.9 |
| Database | expo-sqlite (SQLite WAL) | ~55.0 |
| Navigation | React Navigation | 7.x |
| Camera | expo-camera + expo-image-picker | — |
| Notifications | expo-notifications | — |
| Animations | react-native-reanimated | 4.x |
| Icons | @expo/vector-icons (Ionicons) | — |
| Font | DM Sans | 0.4 |
| Testing | Jest + RNTL + Maestro | 29.7 |

---

## Data Model

### Entity Relationships
```
Printer (1) ──< MaintenanceTask (many)       — scheduled recurring tasks
Printer (1) ──< MaintenanceHistory (many)    — completed task log
Printer (1) ──< Inspection (many)            — visual inspection sessions
Printer (1) ──< PrintJob (many)              — print history (tracks wear)
Inspection (1) ──< InspectionResult (many)   — per-checkpoint results + photos
Guide (1) ──< GuideStep (many)               — step-by-step instructions
```

### Schema Tables
See `src/database/database.ts` for full SQL.

| Table | Purpose |
|-------|---------|
| `printers` | Registered printers with brand, model, hours |
| `maintenance_tasks` | Scheduled tasks — calendar and/or hour-based intervals |
| `maintenance_history` | Completed task log with cost, parts, photos |
| `inspections` | Visual inspection sessions with overall health score |
| `inspection_results` | Per-checkpoint status + photo URI (camera output) |
| `print_jobs` | Print history — feeds `total_print_hours` on printer |
| `guides` | Maintenance guides (seeded offline at first launch) |
| `guide_steps` | Step-by-step instructions, safety notes, camera flags |
| `settings` | Key-value app settings |

### Key Design Decisions
- `printers.total_print_hours` is updated on each `print_jobs` insert, enabling hour-based maintenance intervals without a full scan
- `maintenance_tasks` supports both `interval_days` (calendar) and `interval_hours` (usage) — real tasks often use both
- `inspection_results.photo_uri` stores the local device path — photos never leave the device unless the user explicitly exports
- Array fields (`parts_replaced`, `photos`, `tools_needed`) are stored as JSON strings, parsed at the application layer
- `guides` and `guide_steps` are seeded from `src/data/maintenanceGuides.ts` at first launch — fully offline

---

## Navigation Structure

```
AppNavigator (Stack)
├── Onboarding                    — First-run: add first printer, camera permission
└── Home (Bottom Tabs — 4 tabs)
    ├── [Tab] Home                — Printer cards, maintenance alerts dashboard
    ├── [Tab] Inspect             — Camera inspection entry point (core feature)
    ├── [Tab] Guides              — Browse offline maintenance guides
    └── [Tab] More                — Settings, about, export
        │
        └── Modal Screens
            ├── PrinterDetail     — Single printer status + upcoming tasks
            ├── AddPrinter        — Register a new printer
            ├── EditPrinter       — Edit printer details / log hours
            ├── LogMaintenance    — Record a completed maintenance task
            ├── MaintenanceHistory — Full task history for one printer
            ├── InspectionWizard  — Step-by-step camera inspection
            ├── InspectionResult  — View a completed inspection with photos
            ├── GuideDetail       — Step-by-step guide viewer
            ├── PrintHistory      — Log and view print jobs
            ├── LogPrintJob       — Record a new print job
            ├── Settings          — Notifications, appearance, data export
            └── About             — App info, Jester's Workshop credit
```

---

## Theme System

Two modes: **Workshop Night** (dark) and **Workshop Day** (light).

**Visual goal:** A clean, precise workspace — clinical enough to feel trustworthy, warm enough to feel approachable. The orange primary accent mirrors Jester's Workshop brand energy.

**Semantic color mapping:**

| Token | Dark | Light | Meaning |
|-------|------|-------|---------|
| `primary` | #FF6B2B | #E85820 | Jester orange — primary actions |
| `healthy` | #2CC9A8 | #1FA888 | Good health, tasks complete |
| `warning` | #F5A623 | #D4900F | Maintenance due soon |
| `critical` | #E84855 | #C53040 | Overdue, urgent, danger |
| `info` | #4B9EFF | #2F7FE0 | Tips, guides, informational |
| `premium` | #B27EFF | #8A55E0 | Premium feature indicators |

---

## Offline-First Data Flow

```
App Launch
  └── SQLite opens (WAL mode, singleton)
      └── Schema migrations run (safe, idempotent)
          └── Guide seed data inserted (INSERT OR IGNORE)
              └── App ready — all core features available offline

User Action: "Log Maintenance"
  └── Write to SQLite immediately
      └── Update maintenance_tasks.last_done_at + next_due_at
          └── UI refreshes from local state
              └── (Future) Queue event for cloud sync

User Action: "Run Inspection"
  └── Create inspections row
      └── For each checkpoint:
          ├── Camera → save photo to app sandbox
          ├── Mark status (pass/warn/fail)
          └── Write inspection_results row (photo_uri = local path)
      └── Compute overall_score
      └── Update inspections.status = 'completed'
```

---

## Premium Feature Pattern

```typescript
// src/lib/premium.ts
export function isPremium(): boolean {
  return false; // Replace with expo-iap check when monetizing
}

// Usage in any screen:
if (!isPremium() && guides.filter(g => g.is_premium).length > 0) {
  // Show lock overlay with upgrade prompt
}
```

Premium features use a **visible-but-locked** pattern:
- Feature renders normally
- A lock overlay appears for free users
- One-tap upgrade prompt
- Never hide premium content entirely — showing it drives conversion

---

## Testing Strategy

| Layer | Tool | Target |
|-------|------|--------|
| Schema, utils, theme | Jest | 100% |
| Components | React Native Testing Library | Key components |
| User journeys | Maestro E2E | 5 core flows |
| Device features | Manual checklist | Camera, notifications, offline |

**Core Maestro flows:**
1. `01_onboarding.yaml` — Add first printer
2. `02_log_maintenance.yaml` — Log a completed task
3. `03_inspection.yaml` — Run a quick inspection
4. `04_view_guide.yaml` — Open and complete a guide
5. `05_add_print_job.yaml` — Log a print job

---

## Security & Privacy

- No personal data transmitted without explicit user consent
- Inspection photos stored in app sandbox — not accessible to other apps
- Future cloud backup uses end-to-end encryption before upload
- No analytics or crash reporting by default
- Camera permission requested at onboarding with plain-language explanation

---

## Creator

> **The Plastic Surgeon**
> Created by Jester's Workshop
> *Saving printers one layer at a time.*
