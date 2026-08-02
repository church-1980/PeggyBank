# PeggyBank Master Icon Style Prompt (v1.0)

The locked visual style for **every** PeggyBank icon. Every icon must look like it
came from the same artist and the same product. Paste the style block + the
per-icon composition into an image generator. 1024×1024 PNG, transparent, no text.

> Mascot/logo (the piggy) is separate from this icon system.

---

## Overall style
Modern premium fintech · friendly · professional · minimal · high-end.
**Not** cartoon, **not** realistic, **not** clay, **not** flat.
Think Apple's latest app icons mixed with modern fintech illustration.

## Shape language
Soft rounded geometry · thick readable forms · no sharp corners unless the object
requires them · slight exaggeration for readability · simple silhouettes ·
recognizable at 48×48.

## Lighting
Soft studio lighting · very soft shadows · very subtle highlights · no harsh
reflections · no metallic shine · no glossy plastic. Only enough depth to
separate layers.

## Color palette
- **Primary:** Purple `#7B61FF`
- **Accent:** Mint / Teal (secondary color)
- White only for small highlights.
- **Never** black. **Never** outlines.

## Materials
Soft premium **matte** material · no texture · no grain · no noise · no fabric ·
no scratches · no realism.

## Composition
Transparent background · object centered · generous padding on every edge ·
nothing cropped · no surrounding decorations · no circle behind the icon unless
the object naturally requires one.

## Shadows
Very soft floating shadow only · no heavy drop shadow · no long shadows.

## Perspective
Slight 3D perspective, ~20–30°, **consistent across every icon.**

## Detail level
Medium — premium but instantly recognizable, never cluttered.

## Consistency rules — every icon uses identical:
lighting · perspective · materials · color treatment · shadow softness · corner-
radius philosophy. It must feel like one complete family.

## Design philosophy
Communicate meaning in under one second. If a detail doesn't improve recognition,
remove it. Clarity over realism.

## Output
PNG · transparent background · 1024×1024 · single object · no text · no border ·
no watermark.

---

## The 15 icons + per-icon composition
Filenames map to the registry keys (`src/data/iconRegistry.ts`).

| # | key | file | composition |
|---|-----|------|-------------|
| 1 | travel | travel.png | Premium rounded purple suitcase with a mint/teal passenger airplane sweeping diagonally across it, integrated through a smooth motion arc. |
| 2 | vehicle | vehicle.png | *(pending — delivered one at a time)* |
| 3 | home | home.png | *(pending)* |
| 4 | family | family.png | *(pending)* |
| 5 | education | education.png | *(pending)* |
| 6 | emergency-fund | emergency-fund.png | *(pending)* |
| 7 | investing | investing.png | *(pending)* |
| 8 | debt | debt.png | *(pending)* |
| 9 | gifts | gifts.png | *(pending)* |
| 10 | health | health.png | *(pending)* |
| 11 | pet | pet.png | *(pending)* |
| 12 | food | food.png | *(pending)* |
| 13 | shopping | shopping.png | *(pending)* |
| 14 | fun | fun.png | *(pending)* |
| 15 | other | other.png | *(pending)* |

Generated PNGs go into `assets/peggy-icons/`; `npm run validate:icons` checks
names/size/transparency; then `iconRegistry.ts` gets one `image: require(...)`
line per key and every screen upgrades at once.
