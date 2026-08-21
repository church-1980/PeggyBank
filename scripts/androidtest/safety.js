/**
 * THE SAFETY GATE. Nothing installs until this passes.
 *
 * PeggyBank's real app is com.spall.peggybank and holds the only copy of
 * someone's financial records. A locally-signed build carrying that same id
 * cannot upgrade it -- the signing key differs -- so Android's only offer is to
 * uninstall first, and uninstalling takes the database with it.
 *
 * Development builds must therefore be com.spall.peggybank.dev, which Android
 * treats as a separate app with its own storage. This module reads the id out
 * of the APK BINARY rather than trusting build config, because config is what
 * you intended and the binary is what you are about to install.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PRODUCTION_ID = 'com.spall.peggybank';
const DEV_ID = 'com.spall.peggybank.dev';

function sdkRoot() {
  return process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT ||
    path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk');
}

function findTool(name) {
  const root = sdkRoot();
  const bt = path.join(root, 'build-tools');
  if (fs.existsSync(bt)) {
    const versions = fs.readdirSync(bt).sort().reverse();
    for (const v of versions) {
      for (const exe of [name + '.exe', name]) {
        const p = path.join(bt, v, exe);
        if (fs.existsSync(p)) return p;
      }
    }
  }
  return null;
}

function adbPath() {
  const root = sdkRoot();
  for (const exe of ['adb.exe', 'adb']) {
    const p = path.join(root, 'platform-tools', exe);
    if (fs.existsSync(p)) return p;
  }
  return 'adb';
}

/** The application id recorded inside the APK itself. */
function apkPackageName(apkPath) {
  const aapt = findTool('aapt2');
  if (!aapt) throw new Error('aapt2 not found in the Android SDK build-tools');
  const out = execFileSync(aapt, ['dump', 'packagename', apkPath], { encoding: 'utf8' });
  return out.trim().split(/\r?\n/)[0].trim();
}

/** Permissions the APK actually requests. */
function apkPermissions(apkPath) {
  const aapt = findTool('aapt2');
  const out = execFileSync(aapt, ['dump', 'permissions', apkPath], { encoding: 'utf8' });
  return out.split(/\r?\n/)
    .filter(l => l.startsWith('uses-permission'))
    .map(l => {
      const m = l.match(/name='([^']+)'/);
      return m ? m[1] : null;
    })
    .filter(Boolean);
}

/**
 * Decide whether this APK is safe to install. Returns a verdict rather than
 * throwing, so the caller can print something a person understands.
 */
function assessApk(apkPath) {
  if (!fs.existsSync(apkPath)) {
    return { safe: false, reason: 'APK not found at ' + apkPath };
  }
  return verdictFor(apkPackageName(apkPath));
}

/**
 * The decision itself, separated from reading the file so it can be unit
 * tested. This is the most safety-critical logic in the project: if it ever
 * returns safe:true for the production id, someone loses their records.
 */
function verdictFor(pkg) {
  if (pkg === PRODUCTION_ID) {
    return {
      safe: false, packageName: pkg,
      reason:
        'THIS APK CARRIES THE PRODUCTION ID (' + PRODUCTION_ID + ').\n' +
        'Installing it would try to replace the real PeggyBank. It is signed with a\n' +
        'different key, so Android would refuse the upgrade and the only way through\n' +
        'is to uninstall production first -- which deletes the database holding the\n' +
        'real financial records. Rebuild with APP_VARIANT=dev.',
    };
  }
  if (pkg !== DEV_ID) {
    return {
      safe: false, packageName: pkg,
      reason: 'Unexpected application id "' + pkg + '". Expected ' + DEV_ID + '. Refusing to install.',
    };
  }
  return { safe: true, packageName: pkg };
}

module.exports = { PRODUCTION_ID, DEV_ID, assessApk, verdictFor, apkPackageName, apkPermissions, adbPath, findTool, sdkRoot };
