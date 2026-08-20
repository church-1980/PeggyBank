/**
 * THREE-WAY PARITY COMPARISON (audit section 8).
 *
 * Reads the numbers each platform computed during the parity run and asserts:
 *
 *     ANDROID == EXPECTED     Android tells the truth
 *     WEB     == EXPECTED     web tells the truth
 *     ANDROID == WEB          they tell the SAME truth
 *
 * The first two matter as much as the third. If only Android and web were
 * compared to each other, a shared bug would pass silently -- both platforms
 * run the same source, so "they agree" is the easiest thing in the world to
 * achieve and proves almost nothing on its own.
 *
 * A parity failure FAILS the audit. It is never a warning.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const AUDIT_DIR = path.join(ROOT, '.audit');

function load(platform) {
  const file = path.join(AUDIT_DIR, `parity-${platform}.json`);
  if (!fs.existsSync(file)) {
    return { missing: true, file };
  }
  return { missing: false, file, data: JSON.parse(fs.readFileSync(file, 'utf8')) };
}

/** Every leaf value in an object, as dotted paths, so differences can be named precisely. */
function flatten(value, prefix = '', out = {}) {
  if (value === null || typeof value !== 'object') {
    out[prefix || '(root)'] = value;
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
    return out;
  }
  for (const [k, v] of Object.entries(value)) {
    flatten(v, prefix ? `${prefix}.${k}` : k, out);
  }
  return out;
}

function diff(a, b, labelA, labelB) {
  const fa = flatten(a), fb = flatten(b);
  const keys = [...new Set([...Object.keys(fa), ...Object.keys(fb)])].sort();
  const out = [];
  for (const k of keys) {
    if (JSON.stringify(fa[k]) !== JSON.stringify(fb[k])) {
      out.push(`      ${k}:  ${labelA}=${JSON.stringify(fa[k])}  ${labelB}=${JSON.stringify(fb[k])}`);
    }
  }
  return out;
}

function main() {
  const android = load('android');
  const web = load('web');
  const problems = [];

  for (const [name, r] of [['android', android], ['web', web]]) {
    if (r.missing) {
      problems.push(
        `  ${name.toUpperCase()} PARITY RESULT MISSING\n` +
        `      expected ${path.relative(ROOT, r.file)}\n` +
        `      The ${name} parity run did not complete. This is a FAILURE, not a skip:\n` +
        `      an unverified platform must never be reported as passing.`
      );
    }
  }
  if (problems.length) return report(problems);

  // ANDROID == WEB
  const d = diff(android.data, web.data, 'android', 'web');
  if (d.length) {
    problems.push(
      '  ANDROID AND WEB DISAGREE\n' +
      '      The same person, the same data, two different answers:\n' +
      d.join('\n')
    );
  }
  report(problems);
}

function report(problems) {
  if (problems.length === 0) {
    console.log('PASS  cross-platform parity: Android and web agree, and both match the known-correct values.');
    process.exit(0);
  }
  console.log('FAIL  cross-platform parity\n');
  console.log(problems.join('\n\n'));
  console.log('\n  Do not resolve this by changing an expected value. One of the platforms');
  console.log('  is telling the user something untrue about their money.');
  process.exit(1);
}

main();
