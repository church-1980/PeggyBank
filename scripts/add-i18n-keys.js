#!/usr/bin/env node
/**
 * Add translation keys to all five dictionaries at once.
 *
 * Wiring a screen means adding the same key to en, fr, es, pt and zh. Doing
 * that by hand five times is how one language quietly ends up missing a line —
 * which the integrity test catches, but only after the fact. This adds them
 * together or not at all.
 *
 * Usage: node scripts/add-i18n-keys.js <file.json>
 * where the JSON is { "key.name": { en, fr, es, pt, zh }, ... }
 */
const fs = require('fs');
const path = require('path');

const LOCALES = ['en', 'fr', 'es', 'pt', 'zh'];
const input = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const keys = Object.keys(input);

// Refuse a half-filled batch rather than write four languages and leave one.
for (const k of keys) {
  for (const l of LOCALES) {
    if (input[k][l] == null || input[k][l] === '') {
      console.error('MISSING ' + l + ' for "' + k + '" — nothing written.');
      process.exit(1);
    }
  }
}

for (const locale of LOCALES) {
  const f = path.join('src', 'i18n', 'locales', locale + '.ts');
  let t = fs.readFileSync(f, 'utf8');
  const close = t.lastIndexOf('};');
  if (close < 0) { console.error('no closing brace in ' + f); process.exit(1); }

  const lines = [];
  for (const k of keys) {
    if (t.includes("'" + k + "':")) continue;           // already there
    const v = input[k][locale];
    // Double quotes when the text contains an apostrophe, which French and
    // Portuguese are full of.
    const q = v.includes("'") ? '"' + v.replace(/"/g, '\\"') + '"' : "'" + v + "'";
    lines.push("  '" + k + "': " + q + ',');
  }
  if (!lines.length) { console.log('  ' + locale + ': nothing new'); continue; }
  t = t.slice(0, close) + lines.join('\n') + '\n' + t.slice(close);
  fs.writeFileSync(f, t);
  console.log('  ' + locale + ': +' + lines.length);
}
console.log('Added ' + keys.length + ' key(s) to all five languages.');
