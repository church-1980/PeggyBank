#!/usr/bin/env node
/**
 * Machine-generated evidence of whether PRODUCTION screens actually use the
 * PeggyBank component system. "The design system exists" is not the claim under
 * test — "the real screens use it" is.
 *
 *   node scripts/audit-visual.js          human table
 *   node scripts/audit-visual.js --json   machine readable
 */
const fs = require('fs');
const path = require('path');

const SCREENS = path.resolve(__dirname, '../src/screens');
// Not a product screen: internal gallery with no user entry point.
const DEV_ONLY = new Set(['ComponentShowcaseScreen.tsx']);

const has = (s, re) => re.test(s);
const count = (s, re) => (s.match(re) || []).length;

const rows = [];
for (const file of fs.readdirSync(SCREENS).filter(f => f.endsWith('.tsx'))) {
  const src = fs.readFileSync(path.join(SCREENS, file), 'utf8');
  rows.push({
    screen: file.replace('Screen.tsx', '').replace('.tsx', ''),
    file,
    devOnly: DEV_ONLY.has(file),
    shell:    has(src, /<PeggyScreen|<PeggyPage/),
    header:   has(src, /<PeggyHeader/),
    card:     has(src, /<PeggyCard/),
    row:      has(src, /<PeggyListRow/),
    iconFrame:has(src, /PeggyIconFrame/),
    legacyIconBadge: has(src, /from '\.\.\/components\/IconBadge'/),
    localStyles: count(src, /StyleSheet\.create/g),
    ionicons: count(src, /<Ionicons\s/g),
    directArt: count(src, /require\(['"][^'"]*peggy-icons/g),
  });
}

const prod = rows.filter(r => !r.devOnly);
const sum = (k) => prod.filter(r => r[k]).length;
const total = (k) => prod.reduce((n, r) => n + r[k], 0);

const summary = {
  productionScreens: prod.length,
  usingCanonicalShell: sum('shell'),
  usingCanonicalHeader: sum('header'),
  usingCanonicalCard: sum('card'),
  usingCanonicalRow: sum('row'),
  usingCanonicalIconFrame: sum('iconFrame'),
  importingLegacyIconBadge: sum('legacyIconBadge'),
  screensWithLocalStyleSheet: prod.filter(r => r.localStyles > 0).length,
  totalIoniconUsages: total('ionicons'),
  directPremiumArtImports: total('directArt'),
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ summary, rows }, null, 2));
} else {
  const b = (v) => (v ? 'yes' : ' - ');
  console.log('\nPRODUCTION SCREEN MIGRATION MATRIX');
  console.log('screen'.padEnd(20) + 'shell hdr card row frame | legacyBadge localSS ionicons art');
  console.log('-'.repeat(92));
  for (const r of prod.sort((a, b2) => a.screen.localeCompare(b2.screen))) {
    console.log(
      r.screen.padEnd(20) +
      b(r.shell).padEnd(6) + b(r.header).padEnd(4) + b(r.card).padEnd(5) +
      b(r.row).padEnd(4) + b(r.iconFrame).padEnd(6) + '| ' +
      b(r.legacyIconBadge).padEnd(12) + String(r.localStyles).padEnd(8) +
      String(r.ionicons).padEnd(9) + String(r.directArt)
    );
  }
  console.log('\nPROJECT-WIDE');
  for (const [k, v] of Object.entries(summary)) {
    console.log('  ' + k.padEnd(30), v);
  }
  console.log('');
}
