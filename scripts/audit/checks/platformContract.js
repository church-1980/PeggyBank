/**
 * PLATFORM DIFFERENCE CONTRACT (audit section 9).
 *
 * Android and web are allowed to differ in HOW they do a thing -- one uses ML
 * Kit for text recognition, the other cannot; one stores files natively, the
 * other in the browser. That is legitimate.
 *
 * What is NOT allowed is a platform adapter that does its own MONEY MATH. The
 * moment an adapter calculates a total, the two platforms can drift apart and
 * show the same person two different balances. Adapters fetch and store; only
 * src/core decides what a number is.
 *
 * This check enforces three things:
 *   1. Every platform-specific module exports the SAME NAMES as its base module,
 *      so a screen written against one resolves cleanly on the other.
 *   2. No platform-specific module contains financial arithmetic.
 *   3. No Platform.OS branch decides a financial value.
 */

const path = require('path');
const fs = require('fs');
const { ROOT, productionFiles, platformFiles, matches } = require('../lib/sources');

/** Names a module exports, so two implementations can be compared. */
function exportedNames(text) {
  const names = new Set();
  const re = /export\s+(?:async\s+)?(?:function|const|let|var|class|interface|type|enum)\s+([A-Za-z0-9_$]+)/g;
  let m;
  while ((m = re.exec(text))) names.add(m[1]);
  // export { a, b as c }
  const re2 = /export\s*\{([^}]*)\}/g;
  while ((m = re2.exec(text))) {
    for (const part of m[1].split(',')) {
      const n = part.trim().split(/\s+as\s+/).pop().trim();
      if (n) names.add(n);
    }
  }
  if (/export\s+default/.test(text)) names.add('default');
  return names;
}

/** Arithmetic that decides money. Deliberately narrow to avoid false alarms. */
const MONEY_MATH = [
  /safeToSpend/i,
  /target_amount\s*[-+*/]/,
  /current_amount\s*[-+*/]/,
  /\bamount\s*[-+*/]\s*/,
  /reduce\s*\([^)]*\bamount\b/,
  /SUM\s*\(\s*amount/i,
  /unpaid\w*Total/i,
  /monthlyGoalContribution|goalsSavingsNeeded|debtPayoff/,
];


/**
 * The names other modules actually IMPORT from a module.
 *
 * This is what the cross-platform contract really is. A module may export an
 * implementation detail under a platform-specific name (mlkitRecognizer vs
 * webRecognizer) without breaking anything, so long as every name a SCREEN
 * imports exists on both platforms. Comparing raw export lists instead would
 * flag honest naming differences and train people to ignore this audit.
 */
function importedNames(moduleRel) {
  // 'src/lib/recognition/index.ts' -> importable as '.../recognition'
  let bare = moduleRel;
  for (const ext of ['.tsx', '.ts']) {
    if (bare.endsWith(ext)) { bare = bare.slice(0, -ext.length); break; }
  }
  const key = bare.endsWith('/index') ? bare.slice(0, -'/index'.length) : bare;
  const tail = key.split('/').pop();
  const names = new Set();

  for (const file of productionFiles()) {
    const text = file.text;
    let i = 0;
    // Walk every "from '<specifier>'" and read the brace group in front of it.
    // Scanning rather than matching keeps multi-line import blocks working.
    while ((i = text.indexOf("from '", i)) !== -1) {
      const q1 = i + "from '".length;
      const q2 = text.indexOf("'", q1);
      if (q2 === -1) break;
      const spec = text.slice(q1, q2);
      i = q2 + 1;
      if (!spec.startsWith('.')) continue;
      if (spec.split('/').pop() !== tail) continue;
      const close = text.lastIndexOf('}', q1);
      const open = close === -1 ? -1 : text.lastIndexOf('{', close);
      if (open === -1) continue;                      // default or namespace import
      if (text.slice(close, q1).includes(';')) continue; // brace belongs to an earlier statement
      for (const part of text.slice(open + 1, close).split(',')) {
        const n = part.trim().split(' as ')[0].trim();
        if (n) names.add(n);
      }
    }
  }
  return names;
}

function run() {
  const findings = [];
  let checked = 0;

  // ---- 1 & 2: platform-specific modules ----
  for (const f of platformFiles()) {
    checked++;
    const baseRel = f.rel.replace(/\.(web|android|ios|native)\.(ts|tsx)$/, '.$2');
    const baseAbs = path.join(ROOT, baseRel);
    const indexBase = path.join(ROOT, f.rel.replace(/\.(web|android|ios|native)\.(ts|tsx)$/, '.$2'));

    if (fs.existsSync(baseAbs)) {
      const baseNames = exportedNames(fs.readFileSync(baseAbs, 'utf8'));
      const platNames = exportedNames(f.text);
      const used = importedNames(baseRel);
      const missing = [...baseNames].filter(n => !platNames.has(n) && used.has(n));
      const unused = [...baseNames].filter(n => !platNames.has(n) && !used.has(n));
      const extra = [...platNames].filter(n => !baseNames.has(n) && used.has(n));
      if (missing.length) {
        findings.push({
          severity: 'FAIL',
          where: f.rel,
          what: `does not export ${missing.join(', ')}, which ${baseRel} does`,
          why: 'A screen that works on one platform would fail to import on the other.',
        });
      }
      if (extra.length) {
        findings.push({
          severity: 'FAIL',
          where: f.rel,
          what: `exports ${extra.join(', ')}, which ${baseRel} does not`,
          why: 'Something imports this name, so the other platform would fail to resolve it.',
        });
      }
      if (unused.length) {
        findings.push({
          severity: 'INFO',
          where: f.rel,
          what: `implementation names differ from ${baseRel}: ${unused.join(', ')}`,
          why: 'Nothing imports these, so the shared contract is intact — named differently on purpose.',
        });
      }
    } else {
      findings.push({
        severity: 'REVIEW',
        where: f.rel,
        what: `has no matching base module at ${baseRel}`,
        why: 'Cannot verify the two platforms expose the same contract.',
      });
    }

    for (const re of MONEY_MATH) {
      for (const hit of matches(f, re)) {
        findings.push({
          severity: 'FAIL',
          where: `${f.rel}:${hit.line}`,
          what: 'a platform-specific module contains financial arithmetic',
          why: 'Money math here can drift from the other platform. Move it to src/core.',
          line: hit.text,
        });
      }
    }
  }

  // ---- 3: Platform.OS must not decide a financial value ----
  for (const f of productionFiles()) {
    const lines = f.text.split('\n');
    lines.forEach((text, i) => {
      if (!/Platform\.OS/.test(text)) return;
      checked++;
      // Look at the branch itself and the two lines after it.
      const window = lines.slice(i, i + 3).join('\n');
      for (const re of MONEY_MATH) {
        re.lastIndex = 0;
        if (re.test(window)) {
          findings.push({
            severity: 'FAIL',
            where: `${f.rel}:${i + 1}`,
            what: 'a Platform.OS branch sits on top of financial arithmetic',
            why: 'Android and web could compute different amounts for the same data.',
            line: text.trim(),
          });
          break;
        }
      }
    });
  }

  const failed = findings.filter(f => f.severity === 'FAIL');
  return {
    id: 'platform-contract',
    title: 'Platform difference contract',
    status: failed.length ? 'FAIL' : 'PASS',
    summary: failed.length
      ? `${failed.length} place(s) where a platform could compute its own money`
      : `${platformFiles().length} platform-specific module(s) checked; none does its own money math`,
    findings,
  };
}

module.exports = { run };
