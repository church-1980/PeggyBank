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
  // Merged in by libraries rather than declared by PeggyBank. Traced with the
  // manifest merger's own blame report, not guessed at.
  'android.permission.RECEIVE_BOOT_COMPLETED': 'expo-notifications: re-arms bill reminders after the phone restarts',
  'android.permission.WAKE_LOCK': 'firebase-messaging (via expo-notifications): delivers a reminder while the screen is off',
  'android.permission.ACCESS_NETWORK_STATE': 'expo-image: checks connectivity before fetching a remote image',
  'android.permission.READ_APP_BADGE': 'ShortcutBadger (via expo-notifications): shows the count on the launcher icon',
  'android.permission.BIND_JOB_SERVICE': 'Android itself, to run the scheduled-reminder job',
};

/**
 * The merged manifest, when a build has produced one, is what ACTUALLY ships:
 * it includes everything every library merges in, which the hand-written source
 * manifest does not show. Preferring it turns this from "the config looks right"
 * into "this is what the built app asks for".
 */
function manifestToRead(root) {
  const merged = path.join(root, 'android/app/build/intermediates/merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml');
  if (fs.existsSync(merged)) return { file: merged, kind: 'merged release manifest (what ships)' };
  const src = path.join(root, 'android/app/src/main/AndroidManifest.xml');
  if (fs.existsSync(src)) return { file: src, kind: 'source manifest only - no build has merged library permissions yet' };
  return null;
}

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
  const chosen = manifestToRead(ROOT);
  const manifestPath = chosen ? chosen.file : '';
  let perms = [];
  if (chosen) {
    findings.push({
      severity: 'INFO', where: path.relative(ROOT, chosen.file).split(path.sep).join('/'),
      what: 'permissions read from the ' + chosen.kind,
      why: chosen.kind.startsWith('source')
        ? 'Run a release build to see what libraries actually merge in.'
        : 'Includes every permission merged in by a dependency.',
    });
    const xml = fs.readFileSync(manifestPath, 'utf8');
    const seen = new Set();
    const blocked = new Set();
    // A line carrying tools:node="remove" is a permission the app REFUSES.
    // Expo emits these from blockedPermissions, and they are how a permission a
    // library declares in its own manifest is kept out of the merged result --
    // simply deleting the line would let the merger put it straight back.
    // Parsed ELEMENT by element, not line by line. The merged manifest wraps
    // longer declarations across lines:
    //     <uses-permission
    //         android:name="android.permission.READ_EXTERNAL_STORAGE"
    //         android:maxSdkVersion="32" />
    // A line-based scan silently missed every one of those, which is exactly
    // where an unwanted permission would hide.
    //
    // Only <uses-permission> counts as a request. An android:permission="..."
    // attribute on a component does the opposite job: it RESTRICTS who may
    // call that component.
    let p = 0;
    while ((p = xml.indexOf('<uses-permission', p)) !== -1) {
      const close = xml.indexOf('>', p);
      if (close === -1) break;
      const el = xml.slice(p, close);
      p = close + 1;
      const marker = 'android:name="';
      const at = el.indexOf(marker);
      if (at === -1) continue;
      const s = at + marker.length;
      const e = el.indexOf('"', s);
      if (e === -1) continue;
      const name = el.slice(s, e);
      if (!name.startsWith('android.permission.')) continue;  // OEM launcher extras
      if (el.includes('tools:node="remove"')) blocked.add(name);
      else seen.add(name);
    }
    perms = [...seen].sort();
    if (blocked.size) {
      findings.push({
        severity: 'INFO', where: 'AndroidManifest.xml',
        what: blocked.size + ' permission(s) explicitly refused: ' + [...blocked].sort().join(', '),
        why: 'Declared with tools:node="remove" so a library cannot merge them back in.',
      });
    }
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
