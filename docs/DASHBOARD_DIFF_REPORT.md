# Dashboard — Difference Report vs. the Design Bible
**Date:** 2026-07-10
**Compared:** implemented `DashboardScreen` (rebuilt from Peggy components) vs. `design/PeggyBank-Design-Bible.png`.
**Validation:** TypeScript clean · Tests 109/109 · Metro bundle exported clean · fresh APK built.

> **On screenshots:** I cannot run the app to capture screenshots myself (no device/emulator in this environment). This report is an honest element-by-element comparison of the built implementation against the Bible image, which I can see. Please install the APK and eyeball it against the list below.

---

## Structural match (top → bottom): ✅
Header · Safe-to-Spend hero · Quick Add (4 tiles) · Your Goals · Coming Up — **same order and same sections as the Bible.**

---

## Faithful to the Bible
- **Background:** warm off-white `#F7F6F2`, cards float on it, no borders.
- **Hero:** purple gradient, largest type is the amount, thin light progress bar, "View full breakdown" pill, soft purple shadow. Only gradient on the screen.
- **Quick Add:** 4 uniform pastel tiles (green/blue/peach/purple), identical size/spacing/elevation, filled icons.
- **Goals:** white cards, circular thumbnail slot, name, "of $X", milestone-colored bar, right-aligned %, encouraging line, chevron.
- **Coming Up:** clean rows, circular icon, name over due-date, right-aligned amount, no heavy borders.
- **Type/spacing/radius/shadow:** all from the Design System tokens.

---

## FAIL / KNOWN DIFFERENCES (honest)

### Artwork not yet drawn (placeholders reserving exact space) — HIGH
1. **Piggy-bank illustration** (hero right side) — the Bible shows a pink 3D piggy + coin. **Not implemented.** I did *not* add a stand-in figure. This is the most visible difference: the Bible hero has art on the right; mine has only text. Space behavior is fine, but the figure is absent.
2. **Goal thumbnails** are soft tinted placeholder circles, not the Bible's photos (beach / red car / house).
3. **Quick Action icons** are filled **Ionicons placeholders** (`receipt`, `cash`, `camera`, `add-circle`), not custom PeggyBank artwork. Rule 13 ("never Ionicons") is knowingly unmet until artwork exists.
4. **Bill row icons** use the category registry icon (Ionicon fallback), not the Bible's brand-style colored glyphs (Hydro lightning / Wi-Fi / Netflix "N").

### Header differences — MEDIUM
5. **Greeting name:** the Bible says "Good morning, **Peggy**!". The app has **no stored user name**, so I render "Good morning! 👋" with no name. Needs a name source, or confirm nameless. *(Not invented.)*
6. **Notification bell badge:** the Bible shows a purple "2" count. There is **no notification-count data**, so I render the bell with **no badge**. The bell navigates to Settings (closest existing destination).
7. **Avatar:** no user photo exists → `PeggyAvatar` initial-fallback ("P" placeholder), circular, correct footprint.

### Data-mapping differences (app has no "budget" concept) — MEDIUM
8. **Hero subtitle:** Bible reads "of $1,450 **budgeted**". PeggyBank has no budget feature, so I show "of {monthly income} this month". Mapped income → the "budgeted" reference.
9. **Hero percentage + bar:** Bible shows "24%" (spent-of-budget). I compute **spent ÷ monthly income**. Truthful, but it's a mapping, not a spec value.

### Deliberate omissions/additions vs. the Bible — LOW
10. **Suggestion nudge:** kept (a soft "breathing room" card) — **not in the Bible.** Keep or remove? Flagged.
11. **Payday line:** the old hero showed "Payday in N days"; the Bible hero has none, so I **removed it** from the hero (still computable). Confirm it shouldn't surface elsewhere.
12. **Goal unpin (✕):** the Bible goal card has a chevron, no ✕. I removed the dashboard ✕; **unpin still works** from the Goals screen action sheet, so no functionality lost.
13. **Bottom nav bar / center FAB:** shown in the Bible but it is app-wide navigation (`AppNavigator`), **explicitly out of Phase 2 scope** ("do not redesign navigation" / "Dashboard only"). Untouched.

---

## Fidelity estimate
- **Layout / hierarchy / color / type / spacing / cards / shadows:** ~90–95% to the Bible.
- **Overall "same design" impression:** held back mainly by **absent artwork** (piggy, goal photos, quick-action icons) and the **header name/badge**. With the artwork in place, this reaches the 95% target.

## Questions blocking a higher score
1. **User name** for the greeting — is there one, or stay nameless?
2. **Notification badge** — real count source, or omit?
3. **"budgeted" mapping** — is monthly-income the right reference, or should we add a real budget field?
4. **Suggestion nudge** — keep or remove (not in the Bible)?
5. Confirm **placeholder artwork** approach is acceptable for approval (art arrives later, nothing shifts).

Stopping for visual approval. No other screen will be touched.
