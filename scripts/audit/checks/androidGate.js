/**
 * ANDROID GATE (audit section 15).
 *
 * Two jobs.
 *
 * 1. PROTECT THE PRODUCTION APP.
 *    The production package is com.spall.peggybank. A locally-signed build must
 *    NEVER carry that applicationId: installing it would replace the real app
 *    and, because the signing key differs, Android would refuse the upgrade and
 *    the only way through is uninstalling -- which destroys the user's SQLite
 *    database. Development work belongs to com.spall.peggybank.dev, which gets
 *    its own data sandbox and installs alongside.
 *
 * 2. REPORT PERMISSIONS HONESTLY.
 *    Every permission is a promise to the user about what the app may do. A
 *    money app that requests the microphone owes an explanation. Permissions
 *    pulled in by a library the app does not actually use should be dropped.
 *
 * Like the web gate, this checks CONFIGURATION. It does not install anything,
 * does not touch a connected device, and never reports a device-level pass it
 * has not observed.
 */

const fs = require('fs');
const path = require('path');
const { ROOT } = require('../lib/sources');

const PRODUCTION_ID = 'com.spall.peggybank';
const DEV_ID = 'com.spall.peggybank.dev';

/** Permissions this app can justify from features it actually ships. */
const JUSTIFIED = {
  'android.permission.CAMERA': 'photographing receipts and bills',
  'android.permission.INTERNET': 'Expo runtime and currency rates',
  'android.permission.POST_NOTIFICATIONS': 'bill reminders',
  'android.permission.VIBRATE': 'haptics on button presses',
  'android.permission.READ_MEDIA_IMAGES': 'choosing an existing receipt photo',
  'android.permission.READ_MEDIA_VISUAL_USER_SELECTED': 'partial photo access on Android 14+',
  'android.permission.READ_EXTERNAL_STORAGE': 'choosing a receipt photo on older Android',
  'android.permission.WRITE_EXTERNAL_STORAGE': 'saving a backup file the user asked for',
};

function run() {
  const findings = [];

  // --- 1. dev/production identity separation ---
  const cfgPath = path.join(ROOT, 'app.config.js');
  if (!fs.existsSync(cfgPath)) {
    findings.push({
      severity: 'FAIL', where: 'app.config.js',
      what: 'the dev-variant overlay is missing',
      why: `Without it a local build carries ${PRODUCTION_ID} and would overwrite the real app.`,
    });
  } else {
    const cfg = fs.readFileSync(cfgPath, 'utf8');
    if (!cfg.includes(DEV_ID)) {
      findings.push({
        severity: 'FAIL', where: 'app.config.js',
        what: `does not define the separate dev package ${DEV_ID}`,
        why: 'Development builds would share the production data sandbox.',
      });
    } else {
      findings.push({
        severity: 'INFO', where: 'app.config.js',
        what: `dev identity ${DEV_ID} is separate from production ${PRODUCTION_ID}`,
        why: 'A dev build installs alongside the real app instead of replacing it.',
      });
    }
  }

  // --- 2. any built artifact must not claim the production id ---
  const apkDirs = ['android/app/build/outputs/apk/debug', 'android/app/build/outputs/apk/release'];
  let apksSeen = 0;
  for (const d of apkDirs) {
    const abs = path.join(ROOT, d);
    if (!fs.existsSync(abs)) continue;
    for (const name of fs.readdirSync(abs)) {
      if (!name.endsWith('.apk')) continue;
      apksSeen++;
    }
  }
  const gradlePath = path.join(ROOT, 'android/app/build.gradle');
  if (fs.existsSync(gradlePath)) {
    const g = fs.readFileSync(gradlePath, 'utf8');
    const m = g.match(/applicationId\s+['"]([^'"]+)['"]/);
    const appId = m && m[1];
    if (appId === PRODUCTION_ID) {
      findings.push({
        severity: 'FAIL', where: 'android/app/build.gradle',
        what: `applicationId is the PRODUCTION id ${PRODUCTION_ID}`,
        why:
          'A locally-signed APK with this id cannot upgrade the installed app (different key). ' +
          'The only way to install it is to uninstall production first, which deletes the ' +
          "user's database. Run the prebuild with APP_VARIANT=dev.",
      });
    } else if (appId) {
      findings.push({
        severity: 'INFO', where: 'android/app/build.gradle',
        what: `applicationId is ${appId}`,
        why: 'Not the production id, so a local build cannot overwrite the real app.',
      });
    }
  }

  // --- 3. permissions ---
  const manifestPath = path.join(ROOT, 'android/app/src/main/AndroidManifest.xml');
  let perms = [];
  if (fs.existsSync(manifestPath)) {
    const xml = fs.readFileSync(manifestPath, 'utf8');
    const seen = new Set();
    const marker = 'android:name="android.permission.';
    let i = 0;
    while ((i = xml.indexOf(marker, i)) !== -1) {
      const s = i + 'android:name="'.length;
      const e = xml.indexOf('"', s);
      i = e;
      if (e !== -1) seen.add(xml.slice(s, e));
    }
    perms = [...seen].sort();
    for (const p of perms) {
      if (JUSTIFIED[p]) continue;
      findings.push({
        severity: 'REVIEW', where: 'AndroidManifest.xml',
        what: `requests ${p}, which no shipped feature needs`,
        why:
          'Probably pulled in by a library default. Every permission is a promise to the ' +
          'user; unused ones invite questions at review time and erode trust.',
      });
    }
  }

  const failed = findings.filter(f => f.severity === 'FAIL');
  return {
    id: 'android-gate',
    title: 'Android identity and permissions',
    status: failed.length ? 'FAIL' : 'PASS',
    summary:
      `identity separation checked; ${perms.length} permissions declared, ` +
      `${findings.filter(f => f.severity === 'REVIEW').length} unjustified; ` +
      `${apksSeen} built APK(s) present. No device was touched.`,
    findings,
  };
}

module.exports = { run };
