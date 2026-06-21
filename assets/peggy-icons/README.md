# PeggyBank Icon Assets

Premium 3D PNG icons for the PeggyBank Icon System v1.0.

Drop the 25 generated PNGs here using the exact filenames listed in
[`/docs/PEGGYBANK_ICON_SYSTEM.md`](../../docs/PEGGYBANK_ICON_SYSTEM.md) §2.

Each: 1024×1024, transparent background, generated with the prompt in §3.

Until all 25 PNGs exist, do not import `src/data/peggyIcons.ts` from any
rendered screen — the registry `require()`s these files and Metro will fail
on missing assets.
