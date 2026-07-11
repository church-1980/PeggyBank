# The PeggyBank Design System
**Status:** The design language for the entire application. Not a dashboard spec.
**Source of truth:** `design/PeggyBank-Design-Bible.png` (the approved dashboard).
**Governing rule:** Every screen inherits these rules. **If a future screen breaks a rule here, that screen is wrong — not the Design System.**

> **Accuracy note:** hex values and pixel sizes are read from a compressed phone screenshot and are **best estimates** (marked ~). Structure, hierarchy, intent, and proportion are high-confidence. Exact values get tuned once implemented, but the *rules* below do not change.

Every section has three parts: **Specification** (what exists) · **Design Intent** (why) · **Reusable Rule** (the permanent law).

---

## 1. Background

**Specification**
- App background: warm off-white, ~`#F7F6F2`.
- Never pure white (`#FFFFFF`) as a page background.
- Cards sit on top of it in true white.

**Design Intent**
Pure white is clinical and reads as "spreadsheet" or "bank statement" — exactly the anxiety PeggyBank exists to reduce. A warm off-white feels like paper and daylight, which is calming. It also creates a low-contrast base so that white cards visibly *float* without needing borders.

**Reusable Rule**
> Every PeggyBank screen uses the warm off-white background. White is reserved for elevated surfaces (cards). No screen may use a pure-white page background, and no card may sit on white.

---

## 2. Header

**Specification**
- Circular profile avatar (left, ~40).
- Greeting: "Good morning, Peggy! 👋" — ~21px, bold, `textPrimary`.
- Subtitle: "You're doing amazing today!" — ~13px, `textSecondary`.
- Notification bell (right) with a small purple count badge.
- Generous breathing room above and below.

**Design Intent**
The header speaks *to a person*, not to an account holder. Using the name and a time-of-day greeting establishes that PeggyBank is a companion, not a ledger. The affirming subtitle sets emotional tone before any number appears — the user is reassured *before* being informed. The avatar personalizes ownership; the bell is deliberately quiet (small, right-aligned) so it never competes with the greeting.

**Reusable Rule**
> Every screen's header leads with a human, encouraging line in bold `textPrimary`, with supportive muted context beneath it. Utility icons (bell, settings, back) are secondary: small, right-aligned, never visually louder than the title.

---

## 3. Hero Card (Safe to Spend)

**Specification**
- Large rounded rectangle, radius ~26.
- Purple gradient, ~`#8A6BF0` (top-left) → ~`#A55EE6` (bottom-right).
- "Safe to Spend" label + small info (i) icon, white.
- Amount `$342.68` — ~40px, weight 800, white. The largest text on the screen.
- "of $1,450 budgeted" — small, `rgba(255,255,255,0.8)`.
- `24%` right-aligned; thin light progress bar beneath.
- Friendly piggy-bank illustration on the right.
- "View full breakdown ⌄" pill (semi-transparent white, full radius).
- Soft, purple-tinted shadow.

**Design Intent**
This is the single answer to the only question the user actually opens the app to ask: *"How much can I spend?"* Everything about it enforces that primacy — it is the biggest element, the only saturated color block, and the only gradient. Nothing else on any screen is allowed to compete. The illustration makes a stressful number feel friendly; the pill button offers depth *without* demanding it. The number is white on purple because maximum contrast = maximum confidence.

**Reusable Rule**
> Each screen has exactly **one** hero element carrying its most important number, rendered in the purple gradient with the largest type on the screen. No other element on that screen may use a gradient or exceed the hero's type size. If a screen has no single most-important number, it has no hero.

---

## 4. Goals

**Specification**
- Each goal is its own white card (radius ~20, soft shadow, no border).
- Left: ~52 circular thumbnail image.
- Bold goal title (~16); muted "of $3,000" amount line (~13).
- Colored progress bar; bold percentage (~14) at the right.
- An encouraging line that changes with progress. Approved copy:
  - in progress: *"Every dollar gets you closer!"* / *"You're doing great!"* / *"Almost there!"* (verbatim from the Bible)
  - **completed:** primary *"You did it!"* + secondary *"Goal complete — amazing work! 🎉"*
- Chevron on the right edge.

**Design Intent**
Saving is emotional, not arithmetic. The photograph/illustration makes the goal *real* — you are saving for a beach, not for a row in a database. The encouragement line is the mechanism that converts data into motivation, and it is **not decoration**: it changes with progress so the user is met where they are. The percentage sits outside the bar so the bar stays clean and the number stays legible.

**Reusable Rule**
> Every goal representation in PeggyBank must show: an image, a name, progress as both a colored bar and a percentage, and a progress-appropriate encouraging sentence. A goal is never shown as bare numbers. Encouragement is a required field, not an optional flourish.

---

## 5. Progress Bars

**Specification**
- Full-radius track in a light neutral (`surfaceMuted`).
- Fill is full-radius and colored by **discrete milestone band** (never a continuous blend):
  | Band | Color | Token |
  |------|-------|-------|
  | 0–24% | coral | `danger` `#FF6B6B` |
  | 25–49% | orange | `warning` `#FF9F5A` |
  | 50–74% | PeggyBank purple | `primary` `#7B61FF` |
  | 75–99% | teal/green | `success` `#34C77B` |
  | 100% | gold + green success accent | `gold` `#F4B740` (bar) + `success` (text) |
- Fill animates on load.
- Percentage lives outside the bar, bold.
- Hero uses a thinner light-on-purple variant.
- No illustrations, journeys, airplanes, or SVG scenes inside a bar.

**Design Intent**
Color carries meaning faster than digits. Bands (not a continuous blend) let the user recognize their *stage* at a glance — moving from coral → orange → purple → green → gold is a visible sense of progression through milestones, each a small reward. Animating the fill exploits the goal-gradient effect. The rounded track makes progress feel gentle rather than like a deadline.

**Reusable Rule**
> All progress in PeggyBank uses the same rounded, animated bar, colored by the fixed milestone bands above. The color changes by band, never continuously. Percentage always sits outside the bar. No bar may contain artwork.

---

## 6. Quick Actions

**Specification**
- Row of square tiles, radius ~18, identical size, identical spacing, identical elevation.
- Soft pastel background per action: green / blue / peach / purple.
- Filled icon (~26) centered above a small label (~12).
- No outline icons.

**Design Intent**
These are the four things a user does most, so they must be reachable in one tap and identifiable *without reading*. Pastel backgrounds color-code them for muscle memory — over time the user reaches for "the green one." Identical geometry is what makes them read as one set; any deviation in size, spacing, or elevation would make one look more important than the others, which would be a lie.

**Reusable Rule**
> Action tiles are always uniform: same size, radius, elevation, and spacing, differing only by pastel color and icon. Never use outline icons in a tile. If one action needs emphasis over the others, it does not belong in the grid.

---

## 7. Cards

**Specification**
- White surface on the off-white background.
- Radius ~20 (hero ~26).
- Inner padding ~16; ~12 between stacked cards.
- Soft shadow, **no border**.

**Design Intent**
Cards group meaning. Separation is achieved by elevation and whitespace rather than lines, because lines add visual noise and read as "form," not "product." The large radius is the single strongest signal of the brand's friendliness — sharp corners feel corporate and cold.

**Reusable Rule**
> All content is grouped in white, generously rounded, shadow-separated cards with no borders. Never use a line or a border to separate content that a card and whitespace can separate.

---

## 8. Shadows

**Specification**
- Card: `rgba(60,50,120, ~0.08)`, y-offset ~6, blur ~16, elevation ~3.
- Hero: purple-tinted, y-offset ~10, blur ~24.
- No hard or dark shadows.

**Design Intent**
Shadows are colored with a hint of the brand purple, not black, so elevation feels warm and integrated rather than dropped-on. They are soft and low-opacity because their job is to imply a gentle layer of depth — not to dramatize.

**Reusable Rule**
> Shadows are always soft, low-opacity, and purple-tinted — never black, never harsh. Elevation communicates hierarchy; it is never used decoratively.

---

## 9. Borders

**Specification**
- Cards: none.
- List rows: none (or a barely-there hairline at most).
- Inputs: subtle fill instead of an outline.

**Design Intent**
Borders are the visual signature of developer UI and web forms. Removing them is the single biggest change that moves the app from "built" to "designed." Contrast, spacing, and elevation do the work borders used to do.

**Reusable Rule**
> PeggyBank does not use borders to define surfaces. If something needs separation, use elevation, spacing, or a background tint — in that order.

---

## 10. Corner Radius

**Specification**
| Element | Radius |
|---|---|
| Hero card | ~26 |
| Standard card | ~20 |
| Quick-action tile | ~18 |
| Square icon badge | ~12–14 |
| Bill icon / goal thumbnail | full circle |
| Pill button, progress bar | full |

**Design Intent**
Radius scales *with* the element's size, so every shape feels like it came from the same pen. Large surfaces get large radii; small badges get small ones. Perfectly circular icons keep the eye moving smoothly down a list.

**Reusable Rule**
> Radius is proportional to element size and drawn only from the scale above. Never introduce a new radius value. Icons in lists are circular; icons in grids are rounded squares.

---

## 11. Colors

**Specification**
- Primary purple ~`#7B61FF`; hero gradient ~`#8A6BF0` → `#A55EE6`.
- Background ~`#F7F6F2`; surface `#FFFFFF`; muted fill ~`#F3F1FB`.
- Text primary ~`#2B2A3A` (soft near-black); secondary ~`#8E8CA3`.
- Pastels: green `#E7F5EC`/`#3FBF7F`, blue `#E7F0FE`/`#4B9BFF`, peach `#FDEEE1`/`#FF9F5A`, purple `#EFE9FE`/`#8B5CF6`.
- Semantic: success ~`#34C77B`, warning ~`#FF9F5A`, danger ~`#FF6B6B`.
- Bill amounts ~`#6C63FF`.
- No pure black. No harsh saturated red as a primary UI color.

**Design Intent**
Purple is optimistic and slightly unexpected in finance (where blue = bank, green = money). It signals that PeggyBank is a friendlier species of money app. Pastels carry meaning without shouting. Text is a *soft* near-black because true black on off-white vibrates and feels aggressive — money apps must never feel aggressive.

**Reusable Rule**
> Purple is the only brand color and the only gradient. Pastels are for categorization, semantics for status. `#000000` is forbidden. Red is used only to signal a real financial risk, never as decoration.

---

## 12. Typography

**Specification**
| Style | Size / weight |
|---|---|
| Hero amount | ~40 / 800 |
| Greeting | ~21 / 700 |
| Section header | ~17 / 700 |
| Card title | ~16 / 700 |
| Amount (row) | ~15 / 700 |
| Body | ~14 / 500 |
| Helper / date | ~13 / 500 (`textSecondary`) |
| "See all" | ~13 / 600 (primary) |
| Percentage | ~14 / 700 |
| Nav label | ~11 / 600 |

**Design Intent**
Hierarchy is created by *weight and color*, not by a dozen sizes. Financial numbers are always the boldest thing in their container because they are what the user came for. Helper text is muted so it never competes — the user's eye should land on the number, then the label, then the context, in that order, without effort.

**Reusable Rule**
> Money is always the boldest element in its container. Supporting text is always muted. Use only the scale above; never introduce an intermediate size. Hierarchy is achieved with weight and color before size.

---

## 13. Icons

**Specification**
- Filled, friendly, custom PeggyBank artwork. Never outline icons, never emoji, never Ionicons/Material/FontAwesome.
- List contexts: glyph (~20) inside a ~40 **circular** tinted badge.
- Grid/tile contexts: icon (~26) inside a ~48 **rounded-square** pastel tile.
- Goal contexts: ~52 circular image.
- All icons resolve from the **single icon registry**; a concept has exactly one artwork everywhere.

**Design Intent**
Outline icons read as "generic UI kit." Filled, softly-shaded artwork reads as "someone drew this for us." One registry guarantees that "Home" is never two different pictures — inconsistency is the fastest way to look amateur, regardless of how nice any individual icon is.

**Reusable Rule**
> Every icon comes from the shared registry, is filled (never outline), and lives in the container prescribed by its context (circle in lists, rounded square in grids). No screen may define its own icon. One concept = one artwork, forever.

---

## 14. List Rows

**Specification**
- Left: circular tinted icon badge (~40).
- Middle: bold name (~15) over muted due-date/context (~12).
- Right: bold, colored amount, right-aligned.
- Comfortable vertical padding (~14). No heavy dividers.

**Design Intent**
The eye scans a list along two rails: the left (what is it?) and the right (how much?). Aligning amounts hard-right lets the user compare figures vertically without reading a single word. The two-line middle gives identity plus urgency without a third column.

**Reusable Rule**
> All lists in PeggyBank use the same row anatomy: circular icon · bold name over muted context · right-aligned bold amount. Amounts always align right. Rows are separated by space, never by heavy lines.

---

## 15. Section Headers

**Specification**
- Bold title (~17) left; optional "See all" in primary purple (~13) right.
- ~24 above, ~12 below.

**Design Intent**
Consistent rhythm lets the user skim the screen structurally before reading any content. "See all" is a quiet purple word rather than a button because it is an escape hatch, not a call to action.

**Reusable Rule**
> Every content group is introduced by this exact section header, with the same spacing above and below. Secondary navigation is always a purple text link, never a button.

---

## 16. Buttons

**Specification**
- **FAB:** ~56 purple circle, white `+`, soft shadow, centered in the nav.
- **Pill:** semi-transparent white on the hero, full radius.
- **Primary:** purple fill, white text, radius ~16, height ~52.

**Design Intent**
There is exactly one primary action per screen and it is unmistakable. The FAB is round and purple because "add money/expense" is the app's core verb. Pills are used for *optional depth* ("View full breakdown") — soft, low-commitment, never demanding.

**Reusable Rule**
> One primary purple button per screen. Optional or secondary actions are pills or text links, never a second filled button. Buttons are generously tall and never sharp-cornered.

---

## 17. Inputs

**Specification** *(inferred — not shown in the Bible; confirm on first form screen)*
- Soft filled field (`surfaceMuted`), radius ~16, no outline.
- Generous height (~52), comfortable padding.
- Muted placeholder; label above in `textSecondary`.
- Focus indicated by a subtle purple tint/glow, not a hard border.

**Design Intent**
Outlined inputs are the most "form-like" element in software and instantly break the premium feel. A soft filled well feels like a place to put something, which is friendlier and reduces the perceived effort of entering financial data.

**Reusable Rule**
> Inputs are filled wells, never outlined boxes. Focus is shown with tint, never with a hard border. All inputs share one height and one radius across the app.

---

## 18. Empty States

**Specification** *(inferred — confirm on first empty screen)*
- Centered friendly illustration or icon in a tinted circle.
- Primary line in `textPrimary`; supportive helper line in `textSecondary`.
- Optional single pill/primary button.

**Design Intent**
An empty screen is the moment a user is most likely to leave. It must never read as an error or a void. It should feel like an invitation, in the same encouraging voice as the header and the goal cards.

**Reusable Rule**
> No empty state may be a bare message. Every one has artwork, an encouraging sentence, and exactly one next action. Empty states use the app's warm voice, never neutral system language.

---

## 19. Animation Philosophy

**Specification**
- Progress bars animate their fill on load.
- Motion is soft, brief, eased.
- No bounce, no spin, no attention-grabbing motion.

**Design Intent**
Motion is used to make progress feel *alive* — to reward the user — not to entertain. A bar that grows tells the user "you did this." Anything more energetic would trivialize the subject matter; money is serious even when the app is friendly.

**Reusable Rule**
> Animate only to show progress or state change, always gently and briefly. Never animate for delight alone. Nothing in PeggyBank bounces.

---

## 20. Whitespace

**Specification**
- Screen padding ~20; between sections ~24; between cards ~12; card padding ~16; icon↔text gap ~12.

**Design Intent**
Whitespace is the cheapest premium signal that exists, and it directly reduces cognitive load. Financial anxiety comes from feeling overwhelmed; a breathing layout is therefore a *functional* feature, not an aesthetic one.

**Reusable Rule**
> Every section breathes. Vertical rhythm is consistent across all screens. When in doubt, add space rather than content. Crowding is a bug.

---

## 21. Visual Hierarchy

**Specification**
Order of visual weight, descending:
1. Hero number → 2. Hero card → 3. Section headers → 4. Card titles & amounts → 5. Progress bars → 6. Helper text → 7. Utility icons.

**Design Intent**
The user should be able to answer "am I okay?" in under a second, "what's coming?" in three, and "what should I do?" in five — without reading. Every size, weight, and color choice above exists to serve that sequence.

**Reusable Rule**
> Every screen must have an unambiguous first thing the eye lands on, and it must be the most important information on that screen. If two elements compete, one is wrong.

---

## The Governing Law
> This document is not for the Dashboard. It is for PeggyBank.
> Every future screen inherits these rules. **If a screen breaks a rule here, the screen is wrong — not the Design System.**
> Nothing is designed per-screen. Everything is composed from shared components built from these rules.

---

## Component hierarchy (what these rules compile into)
| Component | Encodes rules from |
|---|---|
| `PeggyScreen` | Background, Whitespace |
| `PeggyCard` | Cards, Shadows, Borders, Radius |
| `PeggySectionHeader` | Section Headers, Typography |
| `HeroBalanceCard` | Hero, Colors, Typography, Hierarchy |
| `PeggyQuickActionCard` / `QuickActionGrid` | Quick Actions, Icons |
| `GoalProgressCard` | Goals, Progress Bars, Icons |
| `PeggyProgressBar` | Progress Bars, Animation |
| `UpcomingBillsCard` / `PeggyListRow` | List Rows, Icons |
| `PeggyIconBadge` | Icons, Radius |
| `PeggyButton` | Buttons |
| `PeggyInput` | Inputs |
| `PeggyEmptyState` | Empty States |

---

## Honest gaps before 95% fidelity is achievable
These are reported, not invented around:
1. **Hero piggy-bank illustration** — asset does not exist.
2. **Goal thumbnails are photographic circles** in the Bible. This *reverses* our earlier "no custom photos" decision. Needs your ruling + assets.
3. **Quick Action icons (4)** — need premium artwork.
4. **The 15 concept PNGs** — still 0 generated. Rule 13 ("never Ionicons") cannot be satisfied until they exist.
5. **Nav bar icons** — need premium set.
6. **`expo-linear-gradient`** — not installed; required for the hero gradient.

Structure, color, type, spacing, radius, shadows, and hierarchy can all be implemented now. **Artwork slots will show fallbacks until the assets exist.**

## Decisions needed before building
1. Goal thumbnails: photographs (as in the Bible) or illustrated registry icons?
2. Generate artwork first, or build structure now with fallbacks?
3. OK to add `expo-linear-gradient`?
