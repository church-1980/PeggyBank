#!/usr/bin/env node
/**
 * The matte icons are 1254x1254 PNGs (~1.2 MB each) but never render larger
 * than about 64pt. That is roughly 19x more pixels per side than any screen
 * uses, and it costs ~60 MB in the APK and ~62 MB on the web build — enough to
 * make the browser version unusable.
 *
 * This downsamples them to 256x256: still 4x the display size, so they stay
 * crisp on 3x/4x density screens, at a fraction of the weight.
 *
 * Area-averaging with alpha weighting, so soft transparent edges do not pick up
 * dark halos. The originals remain in git history:
 *     git checkout <commit> -- assets/peggy-icons
 *
 *   node scripts/resize-icons.js --dry     report only
 *   node scripts/resize-icons.js           rewrite in place
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const DIR = path.resolve(__dirname, '../assets/peggy-icons');
const TARGET = 256;
const dry = process.argv.includes('--dry');

function downsample(src, size) {
  const out = new PNG({ width: size, height: size });
  const xr = src.width / size;
  const yr = src.height / size;

  for (let y = 0; y < size; y++) {
    const y0 = Math.floor(y * yr), y1 = Math.min(src.height, Math.ceil((y + 1) * yr));
    for (let x = 0; x < size; x++) {
      const x0 = Math.floor(x * xr), x1 = Math.min(src.width, Math.ceil((x + 1) * xr));

      let r = 0, g = 0, b = 0, a = 0, aw = 0, n = 0;
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const i = (sy * src.width + sx) * 4;
          const av = src.data[i + 3];
          // Weight colour by alpha so fully transparent pixels never darken the edge.
          r += src.data[i] * av; g += src.data[i + 1] * av; b += src.data[i + 2] * av;
          a += av; aw += av; n++;
        }
      }
      const o = (y * size + x) * 4;
      if (aw > 0) {
        out.data[o] = Math.round(r / aw);
        out.data[o + 1] = Math.round(g / aw);
        out.data[o + 2] = Math.round(b / aw);
      }
      out.data[o + 3] = Math.round(a / n);
    }
  }
  return out;
}

const files = fs.readdirSync(DIR).filter(f => f.endsWith('.png'));
let before = 0, after = 0, skipped = 0;

for (const f of files) {
  const p = path.join(DIR, f);
  const src = PNG.sync.read(fs.readFileSync(p));
  const size = fs.statSync(p).size;
  before += size;

  if (src.width <= TARGET) { after += size; skipped++; continue; }

  const out = downsample(src, TARGET);
  const buf = PNG.sync.write(out, { deflateLevel: 9 });
  after += buf.length;
  if (!dry) fs.writeFileSync(p, buf);
  console.log(
    `  ${f.padEnd(20)} ${src.width}x${src.height} -> ${TARGET}x${TARGET}   ` +
    `${(size / 1024).toFixed(0)}KB -> ${(buf.length / 1024).toFixed(0)}KB`
  );
}

const mb = (n) => (n / 1048576).toFixed(1) + ' MB';
console.log(`\n${files.length} icons (${skipped} already small)`);
console.log(`total ${mb(before)} -> ${mb(after)}  (saves ${mb(before - after)})`);
if (dry) console.log('\nDry run — nothing written.');
