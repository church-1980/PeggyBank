/**
 * Shared source scanner for the static audits.
 *
 * Walks src/ once, caches every file's text, and offers small helpers the
 * individual checks share. Keeping this in one place means every audit sees the
 * same set of files -- an audit cannot quietly skip a screen by walking
 * differently from its neighbours.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const SRC = path.join(ROOT, 'src');

let cache = null;

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (name === 'node_modules') continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push({
        abs: p,
        rel: path.relative(ROOT, p).split(path.sep).join('/'),
        name,
        text: fs.readFileSync(p, 'utf8'),
      });
    }
  }
  return out;
}

/** Every .ts/.tsx file under src/, including tests. */
function allFiles() {
  if (!cache) cache = walk(SRC, []);
  return cache;
}

/** Production source only: excludes __tests__ and the audit's own fixtures. */
function productionFiles() {
  return allFiles().filter(f => !f.rel.includes('/__tests__/'));
}

/** The screens a user can actually navigate to. */
function screenFiles() {
  return productionFiles().filter(f => f.rel.startsWith('src/screens/') && f.name.endsWith('Screen.tsx'));
}

/** Files that exist per-platform (foo.web.ts, foo.android.ts, foo.native.ts). */
function platformFiles() {
  return productionFiles().filter(f => /\.(web|android|ios|native)\.(ts|tsx)$/.test(f.name));
}

/** Line-by-line matches of a regex within a file, as {line, text}. */
function matches(file, re) {
  const out = [];
  file.text.split('\n').forEach((text, i) => {
    re.lastIndex = 0;
    if (re.test(text)) out.push({ line: i + 1, text: text.trim() });
  });
  return out;
}

module.exports = { ROOT, SRC, allFiles, productionFiles, screenFiles, platformFiles, matches };
