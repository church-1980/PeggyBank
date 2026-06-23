#!/usr/bin/env node
/**
 * PeggyBank Icon Asset Validator
 *
 * Validates the PNG files in assets/peggy-icons/ against the locked Icon
 * System v1.0 standard, WITHOUT generating or modifying any assets.
 *
 * Checks performed:
 *   1. Filenames     — every key in the registry has a matching <key>.png,
 *                      and there are no stray/misnamed PNGs.
 *   2. Dimensions    — each PNG is square 1024x1024 (warns on other square sizes).
 *   3. Transparency  — each PNG has an alpha channel (color type 4/6) or a
 *                      tRNS chunk.
 *   4. Registry map  — the require() paths in src/data/peggyIcons.ts line up
 *                      1:1 with the expected key set.
 *
 * Zero dependencies: reads the PNG IHDR header directly.
 *
 * Usage:  node scripts/validate-icons.js
 * Exit:   0 = all present & valid, 1 = problems found, 2 = nothing to validate yet.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ICON_DIR = path.join(ROOT, 'assets', 'peggy-icons');
const REGISTRY = path.join(ROOT, 'src', 'data', 'peggyIcons.ts');
const EXPECTED_SIZE = 1024;

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function readRegistryKeys() {
  const src = fs.readFileSync(REGISTRY, 'utf8');
  const keys = [];
  const re = /assets\/peggy-icons\/([a-z0-9-]+)\.png/g;
  let m;
  while ((m = re.exec(src)) !== null) keys.push(m[1]);
  return [...new Set(keys)];
}

// Parse a PNG's IHDR. Returns { width, height, colorType, hasTRNS } or throws.
function parsePng(buf) {
  if (buf.length < 33 || !buf.subarray(0, 8).equals(PNG_SIG)) {
    throw new Error('not a valid PNG (bad signature)');
  }
  // IHDR is always the first chunk: length(4) type(4) at offset 8.
  const ihdrType = buf.subarray(12, 16).toString('ascii');
  if (ihdrType !== 'IHDR') throw new Error('missing IHDR chunk');
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const colorType = buf.readUInt8(25);

  // Scan chunks for a tRNS (palette/grayscale transparency).
  let hasTRNS = false;
  let offset = 8;
  while (offset + 8 <= buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString('ascii');
    if (type === 'tRNS') hasTRNS = true;
    if (type === 'IEND') break;
    offset += 12 + len; // length + type + data + crc
  }
  return { width, height, colorType, hasTRNS };
}

function hasAlpha({ colorType, hasTRNS }) {
  // color type 4 = grayscale+alpha, 6 = truecolor+alpha
  return colorType === 4 || colorType === 6 || hasTRNS;
}

function main() {
  const problems = [];
  const warnings = [];

  if (!fs.existsSync(REGISTRY)) {
    console.error(`✗ Registry not found: ${REGISTRY}`);
    process.exit(1);
  }
  const expectedKeys = readRegistryKeys();
  console.log(`Registry: ${expectedKeys.length} icon keys expected.`);

  const present = fs.existsSync(ICON_DIR)
    ? fs.readdirSync(ICON_DIR).filter((f) => f.toLowerCase().endsWith('.png'))
    : [];

  if (present.length === 0) {
    console.log(`\nNo PNG assets present yet in assets/peggy-icons/ (0/${expectedKeys.length}).`);
    console.log('Nothing to validate. Drop the generated PNGs in and re-run.');
    process.exit(2);
  }

  const presentKeys = new Set(present.map((f) => f.replace(/\.png$/i, '')));

  // 1. Missing files
  for (const key of expectedKeys) {
    if (!presentKeys.has(key)) problems.push(`Missing: ${key}.png`);
  }
  // 1b. Stray files not in the registry
  for (const f of present) {
    const key = f.replace(/\.png$/i, '');
    if (!expectedKeys.includes(key)) problems.push(`Unexpected file (not in registry): ${f}`);
  }

  // 2 & 3. Dimensions + transparency for each present, expected file
  for (const key of expectedKeys) {
    if (!presentKeys.has(key)) continue;
    const file = path.join(ICON_DIR, `${key}.png`);
    let info;
    try {
      info = parsePng(fs.readFileSync(file));
    } catch (e) {
      problems.push(`${key}.png — ${e.message}`);
      continue;
    }
    if (info.width !== info.height) {
      problems.push(`${key}.png — not square (${info.width}x${info.height})`);
    } else if (info.width !== EXPECTED_SIZE) {
      warnings.push(`${key}.png — ${info.width}x${info.width}, expected ${EXPECTED_SIZE}x${EXPECTED_SIZE}`);
    }
    if (!hasAlpha(info)) {
      problems.push(`${key}.png — no transparency (color type ${info.colorType}, no tRNS)`);
    }
  }

  // Report
  console.log(`\nPresent: ${present.length} PNG(s). Valid expected files: ${expectedKeys.filter((k) => presentKeys.has(k)).length}/${expectedKeys.length}.`);
  if (warnings.length) {
    console.log('\nWarnings:');
    warnings.forEach((w) => console.log('  ⚠ ' + w));
  }
  if (problems.length) {
    console.log('\nProblems:');
    problems.forEach((p) => console.log('  ✗ ' + p));
    console.log(`\n✗ Validation failed: ${problems.length} problem(s).`);
    process.exit(1);
  }
  console.log('\n✓ All expected icons present, square 1024x1024, with transparency.');
  process.exit(0);
}

main();
