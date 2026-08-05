# PeggyBank — Icon Manifest (Phase 3)

Every icon PeggyBank needs, in ONE locked family. This is the checklist that
completes the icon language. Generate one at a time; drop each into
`assets/peggy-icons/<key>.png`; then set the concept's `status: 'ready'` in
`src/data/iconRegistry.ts`.

## The locked style (prepend to EVERY prompt)
Full spec: `docs/PEGGYBANK_ICON_STYLE.md`. In short:

> Premium matte soft-3D icon, single centered subject, isometric ~20–30° camera
> angle, consistent top-left soft lighting, one soft grounding shadow, rounded
> friendly forms, brand purple **#7B61FF** with a mint/teal **#25C2A0** accent.
> **Transparent background, PNG with alpha, borderless.** No gloss, no glow, no
> outline, no baked-in circle or tile, no checkerboard, no sparkles, no pedestal,
> no text. Must read clearly at 28px. 1024×1024.

Keep camera angle, perspective, lighting, material, and rendering quality
**identical** across all icons — only the subject and dominant color change.

## Status
**Done (15 category/goal icons, extracted + transparent):** travel, vehicle, home,
family, education, emergency-fund, investing, debt, gifts, health, pet, food,
shopping, fun, other.

**Also needed — the mascot:** a clean, transparent, borderless `peggy-mascot.png`
(the current one is fine after extraction; regenerate only if you want a crisper
master).

## To generate — navigation / action / tool concepts
These are the icons on More, Quick Add, Camera, and every tool screen. Until each
exists, its frame shows the Ionicon fallback (`status: 'pending'`).

| # | Concept | Registry key | Dominant color | Subject prompt (append to the style block) |
|---|---|---|---|---|
| 1 | Camera / Scan | `camera` | `#7B61FF` | a friendly camera, lens catching a soft teal highlight |
| 2 | Add Expense | `add-expense` | `#FF6B6B` | a receipt with a small red minus/up arrow |
| 3 | Add Income | `add-income` | `#34C77B` | a banknote/coin stack with a green down-in arrow |
| 4 | Bills | `bills` | `#FF9F5A` | a stack of paper bills with a small clock |
| 5 | Goals | `goals` | `#34C77B` | a flag on a small hill (teal flag) |
| 6 | Weekly Check-In | `check-in` | `#34C77B` | a checkmark inside a soft calendar-week card |
| 7 | Reports | `reports` | `#7B61FF` | a rounded bar chart, bars rising left→right |
| 8 | Calendar | `calendar` | `#7B61FF` | a friendly calendar page with a teal ring on one day |
| 9 | Currency | `currency` | `#25C2A0` | two rounded coins with a swap arrow between them |
| 10 | Payday | `payday` | `#34C77B` | a wallet with a banknote peeking out |
| 11 | Backup / Export | `backup` | `#8E8CA3` | a cloud with a soft down arrow |
| 12 | Settings | `settings` | `#8E8CA3` | a single rounded gear, charcoal with a purple accent notch |
| 13 | Profile | `profile` | `#7B61FF` | a soft person bust inside a rounded frame |
| 14 | Notifications | `notifications` | `#F4B740` | a rounded bell with a small teal dot |
| 15 | Share | `share` | `#25C2A0` | three connected nodes (share graph), teal |

## Adding an icon to the system (the sanctioned path — CLAUDE.md §5)
1. Generate the transparent PNG per the style block → `assets/peggy-icons/<key>.png`.
2. Add the key to `IconKey` and an entry to `ICON_REGISTRY` in
   `src/data/iconRegistry.ts` with `color`, `status: 'ready'`, `image: require(...)`.
3. Map any action/tool that uses it to the key.
4. It now renders everywhere through `PeggyIconFrame` — no screen edits.

Do not place the PNG directly in a screen. The registry is the only entry point.
