#!/usr/bin/env node
/**
 * The PeggyBank app mark.
 *
 * The app was shipping Expo's default placeholder — the blue chevron with
 * construction guides — which is what sat on the phone's home screen and in
 * the browser tab. This draws a real one.
 *
 * THE MARK: a coin about to drop into a slot. Money going somewhere safe,
 * which is what the app is for. Two shapes only, because an icon is read at
 * 48 pixels on a home screen full of other icons; anything finer than that is
 * decoration nobody sees.
 *
 * Drawn at 4x and averaged down, so the curves have real anti-aliasing rather
 * than the staircase edges of plotting circles directly at final size.
 *
 * Regenerate with:  node scripts/make-app-icon.js
 */
const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

const PURPLE = [0x7B, 0x61, 0xFF];
const TEAL   = [0x4F, 0xC4, 0xBA];
const WHITE  = [0xFF, 0xFF, 0xFF];

const SS = 4;                       // supersample factor

/** Composite `src` over `dst` at alpha a (0..1). */
const over = (dst, src, a) => [
  Math.round(dst[0] * (1 - a) + src[0] * a),
  Math.round(dst[1] * (1 - a) + src[1] * a),
  Math.round(dst[2] * (1 - a) + src[2] * a),
];

/**
 * Draw the mark on a unit square, returning colour+alpha for one sample point.
 * Everything is expressed as a fraction of the canvas so one description
 * serves every size we need.
 */
function sample(u, v, { background }) {
  let rgb = background ? PURPLE : [0, 0, 0];
  let a = background ? 1 : 0;

  const put = (color) => { rgb = a > 0 ? over(rgb, color, 1) : color; a = 1; };

  // THE COIN, drawn first so the slot can pass in front of it. A coin resting
  // above a bar is just a dot above a bar; a coin cut off BY the bar is a coin
  // going in, which is the whole idea.
  const coinY = 0.455, coinR = 0.158;
  const dCoin = Math.hypot(u - 0.5, v - coinY);
  if (dCoin <= coinR) put(TEAL);
  // A lighter core, so it reads as a struck coin rather than a flat circle.
  if (dCoin <= coinR * 0.52) put([0x7E, 0xDA, 0xD2]);

  // THE SLOT, over the coin.
  const slotY = 0.60, slotH = 0.098, slotW = 0.50;
  const halfLen = (slotW - slotH) / 2;
  const dx = Math.max(0, Math.abs(u - 0.5) - halfLen);
  const dy = v - slotY;
  if (Math.hypot(dx, dy) <= slotH / 2) put(WHITE);

  return { rgb, a };
}

function render(size, { background, monochrome = false, inset = 1 }) {
  const png = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, alpha = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          // Map the pixel into the mark's unit square, honouring the inset so
          // an adaptive-icon foreground keeps clear of the mask.
          const u = 0.5 + (((x + (sx + 0.5) / SS) / size) - 0.5) / inset;
          const v = 0.5 + (((y + (sy + 0.5) / SS) / size) - 0.5) / inset;
          const s = (u < 0 || u > 1 || v < 0 || v > 1)
            ? { rgb: background ? PURPLE : [0, 0, 0], a: background ? 1 : 0 }
            : sample(u, v, { background });
          const c = monochrome && s.a > 0 ? WHITE : s.rgb;
          r += c[0] * s.a; g += c[1] * s.a; b += c[2] * s.a; alpha += s.a;
        }
      }
      const n = SS * SS;
      const i = (size * y + x) << 2;
      png.data[i]     = alpha > 0 ? Math.round(r / alpha) : 0;
      png.data[i + 1] = alpha > 0 ? Math.round(g / alpha) : 0;
      png.data[i + 2] = alpha > 0 ? Math.round(b / alpha) : 0;
      png.data[i + 3] = Math.round((alpha / n) * 255);
    }
  }
  return png;
}

function write(file, png) {
  const out = path.join(process.cwd(), 'assets', 'images', file);
  fs.writeFileSync(out, PNG.sync.write(png));
  const kb = Math.round(fs.statSync(out).size / 1024);
  console.log('  ' + file.padEnd(32) + png.width + 'x' + png.height + '  ' + kb + ' KB');
}

console.log('PeggyBank app mark:');
write('icon.png',                     render(1024, { background: true }));
write('favicon.png',                  render(196,  { background: true }));
// Android masks the adaptive foreground, so the mark is inset into the safe
// zone and the colour lives on the background layer.
write('android-icon-foreground.png',  render(1024, { background: false, inset: 0.66 }));
write('android-icon-background.png',  render(1024, { background: true, inset: 0.001 }));
write('android-icon-monochrome.png',  render(1024, { background: false, inset: 0.66, monochrome: true }));
write('splash-icon.png',              render(512,  { background: false }));
console.log('Done.');
