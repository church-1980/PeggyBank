#!/usr/bin/env node
/**
 * One command for the whole loop: verify → build → gate → stage.
 *
 * Replaces the five separate steps (tsc, jest, gradle, applicationId check,
 * copy to OneDrive) that were being run by hand for every change. Stops at the
 * first failure and never stages an APK that is not the dev package.
 *
 *   npm run ship          verify, build, stage
 *   npm run ship -- --fast   skip tests (use when only assets changed)
 *   npm run verify        checks only, no build
 */
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const SDK = process.env.ANDROID_HOME || 'C:\Users\spall\AppData\Local\Android\Sdk';
const DEV_PACKAGE = 'com.spall.peggybank.dev';
const PROD_PACKAGE = 'com.spall.peggybank';
const APK = path.join(REPO, 'android/app/build/outputs/apk/release/app-release.apk');
const TARGETS = [
  'C:\Users\spall\OneDrive\PeggyBankDev.apk',
  'C:\Users\spall\OneDrive\Desktop\PeggyBankDev.apk',
];

const args = process.argv.slice(2);
const fast = args.includes('--fast');
const verifyOnly = args.includes('--verify-only');

const step = (n, msg) => console.log(`\n[${n}] ${msg}`);
const die = (msg) => { console.error(`\nSTOP: ${msg}\n`); process.exit(1); };

function run(cmd, label) {
  const r = spawnSync(cmd, { cwd: REPO, shell: true, stdio: 'pipe', encoding: 'utf8' });
  if (r.status !== 0) {
    console.error((r.stdout || '') + (r.stderr || ''));
    die(`${label} failed.`);
  }
  return (r.stdout || '') + (r.stderr || '');
}

// ── 1. Types ────────────────────────────────────────────────────────────────
step(1, 'Typecheck');
const tsc = spawnSync('npx tsc --noEmit', { cwd: REPO, shell: true, encoding: 'utf8' });
const tscErrors = ((tsc.stdout || '') + (tsc.stderr || '')).split('\n').filter(l => l.includes('error TS'));
if (tscErrors.length) { console.error(tscErrors.slice(0, 15).join('\n')); die(`${tscErrors.length} type error(s).`); }
console.log('    clean');

// ── 2. Tests ────────────────────────────────────────────────────────────────
if (!fast) {
  step(2, 'Tests');
  const out = run('npx jest --silent', 'Tests');
  const line = out.split('\n').find(l => l.trim().startsWith('Tests:')) || '';
  console.log('   ', line.trim() || 'passed');
} else {
  step(2, 'Tests — skipped (--fast)');
}

if (verifyOnly) { console.log('\nVerify only. Nothing built.\n'); process.exit(0); }

// ── 3. Build ────────────────────────────────────────────────────────────────
step(3, 'Building release APK (arm64)');
const env = {
  ...process.env,
  ANDROID_HOME: SDK,
  ANDROID_SDK_ROOT: SDK,
  APP_VARIANT: 'dev',
  NODE_OPTIONS: '--max-old-space-size=6144',
};
const build = spawnSync(
  '.\gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon',
  { cwd: path.join(REPO, 'android'), shell: true, env, encoding: 'utf8' }
);
const buildOut = (build.stdout || '') + (build.stderr || '');
if (!buildOut.includes('BUILD SUCCESSFUL')) {
  const errs = buildOut.split('\n').filter(l => /error:|FAILURE:|What went wrong/i.test(l));
  console.error(errs.slice(0, 20).join('\n') || buildOut.slice(-2000));
  die('Gradle build failed.');
}
console.log('    BUILD SUCCESSFUL');

// ── 4. Identity gate ────────────────────────────────────────────────────────
step(4, 'Checking which app this is');
if (!fs.existsSync(APK)) die('No APK was produced.');
const buildTools = fs.readdirSync(path.join(SDK, 'build-tools')).sort().reverse()[0];
const aapt = path.join(SDK, 'build-tools', buildTools, 'aapt.exe');
const badging = execSync(`"${aapt}" dump badging "${APK}"`, { encoding: 'utf8' });
const pkg = (badging.match(/package: name='([^']+)'/) || [])[1];
console.log('    applicationId =', pkg);
if (pkg === PROD_PACKAGE) die('This is the PRODUCTION app. Refusing to stage it.');
if (pkg !== DEV_PACKAGE) die(`Expected ${DEV_PACKAGE}, got ${pkg}. Refusing to stage.`);

// ── 5. Stage ────────────────────────────────────────────────────────────────
step(5, 'Copying where the phone can reach it');
for (const t of TARGETS) {
  try { fs.copyFileSync(APK, t); console.log('   ', t); }
  catch (e) { console.log('    could not write', t, '-', e.message); }
}
const mb = (fs.statSync(APK).size / 1048576).toFixed(0);
console.log(`\nDone. ${mb} MB, ${pkg}. Install it from OneDrive.\n`);
