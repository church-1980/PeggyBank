# PeggyBank — Handoff / Resume Anywhere

Read this first to continue the work on any device. Everything below is in the
GitHub repo, so a fresh Claude session (or you) can pick up instantly.

- **Repo:** github.com/church-1980/PeggyBank
- **Active branch:** `feature/three-tab-camera-profile` (NOT yet merged to main)
- **Last updated:** 2026-08-02

---

## Where we are right now
The **3-tab nav (Home · Camera · More)**, **Profile screen**, and **Smart Quick
Capture (on-device ML Kit OCR)** are built, tested (TS clean, ~124 Jest tests),
and device-approved. The profile-connection + two code-review fixes are in.

**Current task: generating the 15 premium app icons, one at a time.**

## The icon job (the live task)
- **Style is LOCKED:** see `docs/PEGGYBANK_ICON_STYLE.md` (matte purple `#7B61FF`
  + mint/teal, soft-3D ~20–30°, no gloss, transparent PNG, 1024×1024).
- **The piggy mascot/logo is separate** from this icon set.
- **Done (9/15)** in `assets/peggy-icons/`: `travel, home, vehicle, family,
  education, emergency-fund, investing` (a pile of nuts/acorns — on-brand),
  `debt, gifts`.
- **Remaining (6):** `health` (medical cross), `pet` (paw), `food` (grocery bag),
  `shopping` (shopping bag), `fun` (game controller), `other` (plus in a circle).

### To make each remaining icon
Paste the **style block from `docs/PEGGYBANK_ICON_STYLE.md`** into an image
generator, swap in the subject above, generate a **transparent 1024×1024 PNG**,
and save it into `assets/peggy-icons/<key>.png` using the exact key name.

### When all 15 exist
Add one line per key to `src/data/iconRegistry.ts` — e.g.
`travel: { label:'Travel', ionicon:'airplane-outline', image: require('../../assets/peggy-icons/travel.png') }`
— and every screen upgrades to the premium art at once. (`npm run validate:icons`
exists but currently targets the old 25-key set; eyeball for now.)

## Parked decisions (waiting on Paul)
1. **APK build** — EAS free build quota is used up; resets **Aug 1** (or upgrade plan).
2. **Dark mode** — deferred by design (`DarkColors = {...LightColors}`). Decision
   pending: keep deferred / build with a dark palette you approve / hide the toggle.
3. **Phase C OCR review** — try real receipts/bills on the last Phase C APK and
   report accuracy so the parsing rules can be tuned.

## How to resume on another computer
1. `git clone` / `git pull` the repo, branch `feature/three-tab-camera-profile`.
2. Open a Claude Code session there and tell it: "Read HANDOFF.md and continue."
3. On your phone: generate icons from `docs/PEGGYBANK_ICON_STYLE.md`, commit the
   PNGs (or send them to a session) — the repo is the shared source of truth.

## Key docs
- `docs/PEGGYBANK_ICON_STYLE.md` — locked icon style + prompts
- `docs/PEGGYBANK_DESIGN_SYSTEM.md` — full visual system (21 rules)
- `PROJECT_STATUS.md` — overall status
- `CLAUDE.md` — how Claude should work on this project
