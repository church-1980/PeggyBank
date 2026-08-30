#!/usr/bin/env node
/**
 * The PeggyBank app icon, built from the real mascot.
 *
 * assets/peggy-mascot.png is the brand: the squirrel holding an acorn, sitting
 * in a P. This turns that one artwork into every size and shape Android, iOS
 * and the browser ask for, so the mark stays identical everywhere and there is
 * one file to change when it is redrawn.
 *
 * TWO THINGS THIS HAS TO HANDLE, or the icon looks wrong on a phone:
 *
 *   TRANSPARENT MARGIN. The source sits inside a quarter of empty canvas.
 *   Dropped in as-is the mascot arrives shrunken, because the launcher scales
 *   the whole square including the emptiness. The artwork is trimmed to its
 *   opaque bounds first.
 *
 *   TRANSPARENCY ITSELF. A launcher icon with no background renders against
 *   whatever the launcher feels like — white, black, a wallpaper. The mark goes
 *   on brand purple everywhere it will be masked.
 *
 * Regenerate with:  node scripts/make-app-icon.js
 */
const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

const SOURCE = path.join('assets', 'peggy-mascot.png');
/**
 * The ground the mark sits on: white.
 *
 * The mascot is drawn FOR a light background. Its white face and the counter
 * of the P are transparent with light pixels underneath, which is perfectly
 * normal for artwork of this kind — and means that on a dark ground the face
 * turns black and the P fills with whatever is behind it. Two earlier attempts
 * here failed on exactly that, first on purple and then on near-black.
 *
 * White is not a fallback. It is the background the artwork was composed
 * against, and on it the icon looks like the logo.
 */
const GROUND = [0xFF, 0xFF, 0xFF];

/** The artwork with its empty margin removed. */
function loadTrimmed() {
  const src = PNG.sync.read(fs.readFileSync(SOURCE));
  let minX = src.width, minY = src.height, maxX = 0, maxY = 0;
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      if (src.data[((src.width * y + x) << 2) + 3] > 16) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  // Keep it square so nothing stretches, centred on the artwork.
  const w = maxX - minX + 1, h = maxY - minY + 1;
  const side = Math.max(w, h);
  const ox = minX - Math.floor((side - w) / 2);
  const oy = minY - Math.floor((side - h) / 2);
  return { src, ox, oy, side };
}

/**
 * Area-averaged downsample with alpha weighting.
 *
 * Weighting by alpha matters: averaging colour through transparent pixels
 * drags a dark halo around every soft edge, which on this artwork means a
 * grey outline round the squirrel.
 */
function resample(art, size, { background, inset, monochrome = false }) {
  const { src, ox, oy, side } = art;
  const out = new PNG({ width: size, height: size });
  const span = side / inset;                       // inset < 1 leaves a margin
  const start = -(span - side) / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const x0 = ox + start + (x / size) * span;
      const x1 = ox + start + ((x + 1) / size) * span;
      const y0 = oy + start + (y / size) * span;
      const y1 = oy + start + ((y + 1) / size) * span;

      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = Math.floor(y0); sy < Math.ceil(y1); sy++) {
        for (let sx = Math.floor(x0); sx < Math.ceil(x1); sx++) {
          n++;
          if (sx < 0 || sy < 0 || sx >= src.width || sy >= src.height) continue;
          const i = (src.width * sy + sx) << 2;
          const sa = src.data[i + 3] / 255;
          r += src.data[i] * sa; g += src.data[i + 1] * sa; b += src.data[i + 2] * sa;
          a += sa;
        }
      }
      if (!n) n = 1;
      const alpha = a / n;
      let col = a > 0 ? [r / a, g / a, b / a] : [0, 0, 0];
      if (monochrome) col = [255, 255, 255];

      const i = (size * y + x) << 2;
      if (background) {
        // Composite over purple, so the result is fully opaque.
        out.data[i]     = Math.round(GROUND[0] * (1 - alpha) + col[0] * alpha);
        out.data[i + 1] = Math.round(GROUND[1] * (1 - alpha) + col[1] * alpha);
        out.data[i + 2] = Math.round(GROUND[2] * (1 - alpha) + col[2] * alpha);
        out.data[i + 3] = 255;
      } else {
        out.data[i] = Math.round(col[0]); out.data[i + 1] = Math.round(col[1]);
        out.data[i + 2] = Math.round(col[2]); out.data[i + 3] = Math.round(alpha * 255);
      }
    }
  }
  return out;
}

function solid(size) {
  const p = new PNG({ width: size, height: size });
  for (let i = 0; i < p.data.length; i += 4) {
    p.data[i] = GROUND[0]; p.data[i + 1] = GROUND[1]; p.data[i + 2] = GROUND[2]; p.data[i + 3] = 255;
  }
  return p;
}

function write(file, png) {
  const out = path.join('assets', 'images', file);
  fs.writeFileSync(out, PNG.sync.write(png));
  console.log('  ' + file.padEnd(32) + png.width + 'x' + png.height + '  ' +
    Math.round(fs.statSync(out).size / 1024) + ' KB');
}

const art = loadTrimmed();
console.log('PeggyBank icon, from ' + SOURCE + ':');

// A little breathing room so the mascot is not jammed against the edge.
write('icon.png',    resample(art, 1024, { background: true, inset: 0.86 }));
write('favicon.png', resample(art, 196,  { background: true, inset: 0.86 }));

// Android masks the adaptive foreground to roughly the middle two-thirds, so
// the mark is inset to survive the crop, and the colour lives on its own layer.
write('android-icon-foreground.png', resample(art, 1024, { background: false, inset: 0.62 }));
write('android-icon-background.png', solid(1024));
write('android-icon-monochrome.png', resample(art, 1024, { background: false, inset: 0.62, monochrome: true }));

// The splash has room, so the artwork is shown whole and unbacked.
write('splash-icon.png', resample(art, 512, { background: false, inset: 0.95 }));
console.log('Done.');
