#!/usr/bin/env node
/**
 * npm run audit:all — THE ONE COMMAND (audit section 17).
 *
 * Runs everything and says what is true, in plain language, for someone who
 * does not read code.
 *
 * THREE RESULTS, AND THEY MEAN DIFFERENT THINGS:
 *
 *   PASS         Something automated checked this and it was right.
 *   FAIL         Something automated checked this and it was wrong.
 *   UNVERIFIED   NOTHING checked this. Not a pass. Not a failure. A gap.
 *
 * UNVERIFIED exists because the tempting lie in an audit like this is to let a
 * successful build stand in for a working app. A bundle that compiles has not
 * been opened, clicked, or read. Where the audit did not look, it says so.
 *
 * The audit fails (exit code 1) if any section FAILS. UNVERIFIED sections do
 * not fail the run -- they are reported loudly instead, because turning them
 * green means building something, not lowering a bar.
 */

const { execFileSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..', '..');
// NOTE: do NOT shell out to npx here. On Windows, execFileSync cannot launch a
// .cmd shim, and the failure looks exactly like the tool reporting an error --
// which would make this audit announce failures that are not real. Running the
// packages' own JS entrypoints under the current node binary avoids the shell
// altogether and behaves the same on every platform.
const JEST = path.join(ROOT, 'node_modules', 'jest', 'bin', 'jest.js');
const TSC = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');

const results = [];
let sectionNo = 0;

function line(char, n) { return (char || '-').repeat(n || 74); }

function record(r) {
  sectionNo++;
  results.push(Object.assign({ no: sectionNo }, r));
  const badge = { PASS: 'PASS      ', FAIL: 'FAIL      ', UNVERIFIED: 'UNVERIFIED', INFO: 'INFO      ' }[r.status] || r.status;
  const dots = '.'.repeat(Math.max(2, 44 - r.title.length));
  console.log('  ' + String(sectionNo).padStart(2) + '. ' + r.title + ' ' + dots + ' ' + badge + '  ' + (r.summary || ''));
}

/** Run a jest config and report pass/fail from its exit status. */
function runJest(title, args, whatItProves) {
  // spawnSync, not execFileSync: Jest prints its result summary to stderr even
  // when everything passes, and the counts in that summary are what this report
  // shows. Reading only stdout would report every successful run as "completed"
  // with no numbers behind it.
  const proc = spawnSync(process.execPath, [JEST].concat(args), { cwd: ROOT, encoding: 'utf8' });
  const output = (proc.stdout || '') + (proc.stderr || '');
  const ok = proc.status === 0;
  const m = output.match(/Tests:\s+(?:(\d+) failed,\s+)?(?:(\d+) skipped,\s+)?(\d+) passed,\s+(\d+) total/);
  const failed = m && m[1] ? Number(m[1]) : null;
  const passed = m ? Number(m[3]) : null;
  return {
    title,
    status: ok ? 'PASS' : 'FAIL',
    summary: passed === null
      ? (ok ? 'completed' : 'the test run itself failed to start')
      : passed + ' checks passed' + (failed ? ', ' + failed + ' FAILED' : ''),
    detail: whatItProves,
    output: ok ? '' : output.split('\n').filter(function (l) { return /●|✕|×|Expected|Received/.test(l); }).slice(0, 30).join('\n'),
  };
}

console.log('');
console.log(line('=', 74));
console.log('  PEGGYBANK AUDIT');
console.log('  Checks that the app tells the truth about a person and their money.');
console.log(line('=', 74));
console.log('');
console.log('  WHAT THE RESULTS MEAN');
console.log('    PASS        something checked this, and it was right');
console.log('    FAIL        something checked this, and it was WRONG');
console.log('    UNVERIFIED  nothing checked this - a gap, not a pass');
console.log('');
console.log(line('-', 74));
console.log('');

// -- 1. Does the code even compile? -------------------------------------------
try {
  execFileSync(process.execPath, [TSC, '--noEmit'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  record({
    title: 'Code compiles', status: 'PASS', summary: 'no type errors',
    detail: 'Proves the code is internally consistent. Proves nothing about behaviour.',
  });
} catch (e) {
  record({
    title: 'Code compiles', status: 'FAIL', summary: 'type errors',
    output: ((e.stdout || '') + (e.stderr || '')).split('\n').slice(0, 20).join('\n'),
  });
}

// -- 2. Behaviour: the main test suite ----------------------------------------
record(runJest('Money, dates, backup and restore', ['--silent'],
  'Financial invariants against hand-computed answers, timezone torture, backup and restore safety, table coverage.'));

// -- 3. Each platform on its own ----------------------------------------------
record(runJest('Android and web each compute correctly', ['--config', 'jest.parity.config.js', '--silent'],
  'Runs the same checks twice, once per platform, against the known-correct values.'));

// -- 4. The two platforms against each other ----------------------------------
try {
  const out = execFileSync(process.execPath, [path.join(__dirname, 'parity-compare.js')], { cwd: ROOT, encoding: 'utf8' });
  record({ title: 'Android and web agree with each other', status: 'PASS', summary: 'identical results', detail: out.trim() });
} catch (e) {
  record({ title: 'Android and web agree with each other', status: 'FAIL', summary: 'the two platforms disagree',
           output: (e.stdout || '') + (e.stderr || '') });
}

// -- 5+. Static architecture checks --------------------------------------------
const CHECKS = ['platformContract', 'visual', 'accessibility', 'navigation', 'assets', 'webGate', 'androidGate', 'androidRuntime', 'personas'];
for (const name of CHECKS) {
  record(require(path.join(__dirname, 'checks', name + '.js')).run());
}

// -- the written report ---------------------------------------------------------
console.log('');
console.log(line('-', 74));
console.log('');

const failures = results.filter(function (r) { return r.status === 'FAIL'; });
const unverified = results.filter(function (r) { return r.status === 'UNVERIFIED'; });

function printFindings(r, severities, heading) {
  const items = (r.findings || []).filter(function (f) { return severities.indexOf(f.severity) !== -1; });
  if (!items.length) return;
  console.log('  ' + r.no + '. ' + r.title + ' - ' + heading);
  items.slice(0, 40).forEach(function (f) {
    console.log('      * ' + f.what);
    console.log('        where: ' + f.where);
    if (f.why) console.log('        why:   ' + f.why);
  });
  if (items.length > 40) console.log('      ... and ' + (items.length - 40) + ' more');
  console.log('');
}

if (failures.length) {
  console.log('  THINGS THAT ARE WRONG');
  console.log('');
  failures.forEach(function (r) {
    printFindings(r, ['FAIL'], 'needs fixing');
    if (r.output) {
      console.log('  ' + r.no + '. ' + r.title + ' - details');
      console.log(r.output.split('\n').map(function (l) { return '      ' + l; }).join('\n'));
      console.log('');
    }
  });
}

if (unverified.length) {
  console.log('  THINGS NOBODY CHECKED');
  console.log('');
  unverified.forEach(function (r) { printFindings(r, ['UNVERIFIED', 'FAIL'], 'not verified'); });
}

const reviewable = results.filter(function (r) {
  return (r.findings || []).some(function (f) { return f.severity === 'REVIEW' || f.severity === 'HUMAN'; });
});
if (reviewable.length) {
  console.log('  THINGS A PERSON SHOULD LOOK AT');
  console.log('  (an opinion formed by reading the code, or a step no test covers)');
  console.log('');
  reviewable.forEach(function (r) { printFindings(r, ['REVIEW', 'HUMAN'], 'human judgement'); });
}

console.log(line('=', 74));
if (failures.length) {
  console.log('  RESULT: ' + failures.length + ' section(s) FAILED.');
  console.log('');
  console.log('  Fix the code. Do not edit an expected value, exclude a screen, or');
  console.log('  weaken a check to make this green. A red audit is useful information.');
} else {
  console.log('  RESULT: every automated check passed.');
}
if (unverified.length) {
  console.log('  ' + unverified.length + ' area(s) remain UNVERIFIED - see above. That is not a pass.');
}
console.log(line('=', 74));
console.log('');

// A machine-readable copy, so a run can be compared with the one before it.
fs.mkdirSync(path.join(ROOT, '.audit'), { recursive: true });
fs.writeFileSync(path.join(ROOT, '.audit', 'last-run.json'),
  JSON.stringify({ when: new Date().toISOString(), results: results }, null, 2));

process.exit(failures.length ? 1 : 0);
