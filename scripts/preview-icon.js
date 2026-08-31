#!/usr/bin/env node
/**
 * What the launcher will ACTUALLY show.
 *
 * The icon has been adjusted four times by eye, shipped, and judged on a
 * phone — which is a slow way to find out that a mask cut the top off. This
 * applies the same crop Android applies and writes the result out, so the
 * answer is visible here instead of after a build and an install.
 *
 * Android composes an adaptive icon from two 108dp layers and shows only the
 * middle 72dp — two thirds — then clips that to the launcher's shape. Samsung
 * uses a squircle, which is what the phone in question is running.
 */
const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2] || '.';

/** Superellipse |x|^n + |y|^n = 1. n≈4 is the squircle launchers use. */
function insideSquircle(u, v, n = 4) {
  const x = Math.abs(u * 2 - 1), y = Math.abs(v * 2 - 1);
  return Math.pow(x, n) + Math.pow(y, n) <= 1;
}

function read(f) { return PNG.sync.read(fs.readFileSync(path.join('assets', 'images', f))); }

/**
 * Compose the adaptive layers, take the middle two thirds Android guarantees,
 * and clip to the squircle.
 */
function adaptivePreview(size = 384) {
  const fg = read('android-icon-foreground.png');
  const bg = read('android-icon-background.png');
  const out = new PNG({ width: size, height: size });
  const VISIBLE = 72 / 108;                     // Android's guaranteed area

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const i = (size * y + x) << 2;
      if (!insideSquircle(u, v)) {              // outside the launcher shape
        out.data[i] = 235; out.data[i + 1] = 235; out.data[i + 2] = 238; out.data[i + 3] = 255;
        continue;
      }
      // Map into the source, showing only the middle VISIBLE fraction.
      const su = 0.5 + (u - 0.5) * VISIBLE;
      const sv = 0.5 + (v - 0.5) * VISIBLE;
      const sx = Math.min(fg.width - 1, Math.max(0, Math.round(su * fg.width)));
      const sy = Math.min(fg.height - 1, Math.max(0, Math.round(sv * fg.height)));
      const fi = (fg.width * sy + sx) << 2;
      const bi = (bg.width * sy + sx) << 2;
      const a = fg.data[fi + 3] / 255;
      out.data[i]     = Math.round(bg.data[bi]     * (1 - a) + fg.data[fi]     * a);
      out.data[i + 1] = Math.round(bg.data[bi + 1] * (1 - a) + fg.data[fi + 1] * a);
      out.data[i + 2] = Math.round(bg.data[bi + 2] * (1 - a) + fg.data[fi + 2] * a);
      out.data[i + 3] = 255;
    }
  }
  return out;
}

/** A launcher that ignores the adaptive layers and just masks icon.png. */
function legacyPreview(size = 384) {
  const src = read('icon.png');
  const out = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const i = (size * y + x) << 2;
      if (!insideSquircle(u, v)) {
        out.data[i] = 235; out.data[i + 1] = 235; out.data[i + 2] = 238; out.data[i + 3] = 255;
        continue;
      }
      const sx = Math.min(src.width - 1, Math.round(u * src.width));
      const sy = Math.min(src.height - 1, Math.round(v * src.height));
      const si = (src.width * sy + sx) << 2;
      out.data[i] = src.data[si]; out.data[i + 1] = src.data[si + 1];
      out.data[i + 2] = src.data[si + 2]; out.data[i + 3] = 255;
    }
  }
  return out;
}

fs.writeFileSync(path.join(OUT, 'preview-adaptive.png'), PNG.sync.write(adaptivePreview()));
fs.writeFileSync(path.join(OUT, 'preview-legacy.png'), PNG.sync.write(legacyPreview()));
console.log('  preview-adaptive.png  — how Android composes and crops it');
console.log('  preview-legacy.png    — a launcher that just masks icon.png');
