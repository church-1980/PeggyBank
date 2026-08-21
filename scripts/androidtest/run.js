#!/usr/bin/env node
/**
 * npm run audit:android — drive the real app on a real Android device.
 *
 * Installs the DEV build, launches it, and reads the live screen through
 * uiautomator. It reports only what it observed. With no device attached it
 * records UNVERIFIED and exits non-zero; it never infers that the app works
 * from the fact that it compiled.
 *
 * SAFETY: the application id is read out of the APK BINARY before anything is
 * installed. If it is the production id the run aborts, because a locally
 * signed APK cannot upgrade the real app and the only way to install it would
 * be to uninstall production first -- which deletes the user's database.
 */

const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { assessApk, apkPermissions, adbPath, DEV_ID } = require('./safety');
const { parseDump, screenText, findTappable, unlabelledControls } = require('./ui');

const ROOT = path.resolve(__dirname, '..', '..');
const APK = path.join(ROOT, 'android/app/build/outputs/apk/release/app-release.apk');
const ADB = adbPath();
const SHOTS = path.join(ROOT, '.audit', 'android-screens');

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || '' });
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (detail ? '   [' + detail + ']' : ''));
}

function adb(args, opts) {
  return execFileSync(ADB, args, { encoding: 'utf8', timeout: 120000, ...(opts || {}) });
}
function adbQuiet(args) {
  const r = spawnSync(ADB, args, { encoding: 'utf8', timeout: 120000 });
  return (r.stdout || '') + (r.stderr || '');
}
const wait = ms => new Promise(r => setTimeout(r, ms));

function head() {
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); }
  catch { return 'unknown'; }
}

function record(status, detail) {
  fs.mkdirSync(path.join(ROOT, '.audit'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, '.audit', 'android-runtime.json'), JSON.stringify({
    status, detail,
    checks: { passed: results.filter(r => r.ok).length, total: results.length },
    results,
    commit: head(),
    when: new Date().toISOString(),
  }, null, 2));
}

function devices() {
  const out = adbQuiet(['devices', '-l']);
  return out.split('\n').slice(1)
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('*'))
    .filter(l => /\bdevice\b/.test(l))
    .map(l => ({ serial: l.split(/\s+/)[0], line: l }));
}

async function dump() {
  adbQuiet(['shell', 'uiautomator', 'dump', '/sdcard/peggy-dump.xml']);
  return parseDump(adbQuiet(['shell', 'cat', '/sdcard/peggy-dump.xml']));
}

async function tap(nodes, label) {
  const n = findTappable(nodes, label);
  if (!n || !n.box) return false;
  adbQuiet(['shell', 'input', 'tap', String(n.box.cx), String(n.box.cy)]);
  await wait(1800);
  return true;
}

async function shot(name) {
  fs.mkdirSync(SHOTS, { recursive: true });
  adbQuiet(['shell', 'screencap', '-p', '/sdcard/peggy-shot.png']);
  adbQuiet(['pull', '/sdcard/peggy-shot.png', path.join(SHOTS, name + '.png')]);
}

(async () => {
  console.log('');
  console.log('PEGGYBANK — ANDROID RUNTIME TEST');
  console.log('='.repeat(60));

  // ---- 0. SAFETY, before anything is installed ----
  const verdict = assessApk(APK);
  if (!verdict.safe) {
    console.log('');
    console.log('REFUSING TO INSTALL');
    console.log(verdict.reason);
    record('ABORTED', 'unsafe APK: ' + verdict.reason.split('\n')[0]);
    process.exit(2);
  }
  check('APK carries the DEV application id, not production', true, verdict.packageName);

  // ---- 1. is there anything to test on ----
  const found = devices();
  if (!found.length) {
    console.log('');
    console.log('  UNVERIFIED — no Android device or emulator is connected.');
    console.log('');
    console.log('  Nothing about the Android runtime can be reported from here. This is');
    console.log('  not a failure of the app; it is the absence of evidence about it.');
    console.log('');
    console.log('  To make this real, either:');
    console.log('    a) plug in an Android phone with USB debugging enabled, or');
    console.log('    b) start an emulator (needs virtualisation enabled in BIOS/UEFI)');
    console.log('  then run:  npm run audit:android');
    record('UNVERIFIED', 'no device connected');
    process.exit(1);
  }
  const target = found[0];
  const isEmulator = target.serial.startsWith('emulator-');
  check('a device is connected', true, (isEmulator ? 'EMULATOR ' : 'PHYSICAL DEVICE ') + target.serial);

  const model = adbQuiet(['-s', target.serial, 'shell', 'getprop', 'ro.product.model']).trim();
  const rel = adbQuiet(['-s', target.serial, 'shell', 'getprop', 'ro.build.version.release']).trim();
  const tz = adbQuiet(['-s', target.serial, 'shell', 'getprop', 'persist.sys.timezone']).trim();
  console.log('        model: ' + model + '   Android ' + rel + '   timezone ' + tz);

  // ---- 2. install ----
  let installed = false;
  try {
    const out = adb(['-s', target.serial, 'install', '-r', APK]);
    installed = /Success/i.test(out);
  } catch (e) {
    installed = false;
  }
  check('the app installs', installed);
  if (!installed) { record('FAIL', 'install failed'); process.exit(1); }

  // ---- 3. the permissions the DEVICE says it has ----
  const dump0 = adbQuiet(['-s', target.serial, 'shell', 'dumpsys', 'package', DEV_ID]);
  const requested = [...new Set(
    (dump0.match(/android\.permission\.[A-Z_]+/g) || [])
  )].sort();
  check('installed build does NOT request RECORD_AUDIO', !requested.includes('android.permission.RECORD_AUDIO'));
  check('installed build does NOT request SYSTEM_ALERT_WINDOW', !requested.includes('android.permission.SYSTEM_ALERT_WINDOW'));
  console.log('        requests: ' + requested.map(p => p.replace('android.permission.', '')).join(', '));

  // ---- 4. launch, and watch for a crash ----
  adbQuiet(['-s', target.serial, 'logcat', '-c']);
  adbQuiet(['-s', target.serial, 'shell', 'monkey', '-p', DEV_ID, '-c', 'android.intent.category.LAUNCHER', '1']);
  await wait(9000);

  const running = adbQuiet(['-s', target.serial, 'shell', 'pidof', DEV_ID]).trim();
  check('the app is still running after launch (no startup crash)', running.length > 0, running ? 'pid ' + running : 'process gone');

  const crashLog = adbQuiet(['-s', target.serial, 'logcat', '-d', '-t', '400']);
  const fatals = crashLog.split('\n').filter(l => /FATAL EXCEPTION|AndroidRuntime.*E |ReactNativeJS.*Error/.test(l));
  check('no fatal errors in logcat', fatals.length === 0, fatals.slice(0, 1).join('').slice(0, 120));

  // ---- 5. does a screen actually render ----
  let nodes = await dump();
  await shot('01-launch');
  const text = screenText(nodes);
  check('a screen renders with readable content', text.length > 20, text.slice(0, 60).replace(/\n/g, ' / '));

  // Onboarding may be first on a clean install.
  if (text.includes('Skip intro') || text.includes('Next')) {
    await tap(nodes, 'Skip intro');
    nodes = await dump();
  }
  const home = screenText(nodes);
  check('Home shows Safe to Spend', home.includes('Safe to Spend'), home.includes('Safe to Spend') ? '' : home.slice(0, 80));
  await shot('02-home');

  // ---- 6. accessibility, as TalkBack would hear it ----
  const unlabelled = unlabelledControls(nodes);
  check('every icon-only control on Home announces something', unlabelled.length === 0,
        unlabelled.length ? unlabelled.length + ' silent control(s)' : 'all labelled');
  const descs = nodes.map(n => n.desc).filter(Boolean);
  console.log('        announced: ' + descs.slice(0, 6).join(' | '));

  // ---- 7. navigation ----
  for (const tab of ['More', 'Home']) {
    const ok = await tap(await dump(), tab);
    check('the ' + tab + ' tab responds', ok);
  }
  await shot('03-more');

  // ---- 8. leave the device as we found it ----
  adbQuiet(['-s', target.serial, 'shell', 'am', 'force-stop', DEV_ID]);

  const failed = results.filter(r => !r.ok);
  console.log('');
  console.log((results.length - failed.length) + ' / ' + results.length + ' Android runtime checks passed');
  console.log('screenshots: ' + path.relative(ROOT, SHOTS));
  record(failed.length ? 'FAIL' : 'PASS',
         (isEmulator ? 'emulator ' : 'physical device ') + model + ' Android ' + rel);
  process.exit(failed.length ? 1 : 0);
})().catch(e => {
  console.error('android runtime test crashed: ' + e.message);
  record('FAIL', 'harness error: ' + e.message);
  process.exit(1);
});
