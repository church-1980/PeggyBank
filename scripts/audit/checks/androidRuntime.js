/**
 * ANDROID RUNTIME (audit section 15).
 *
 * Reports what actually happened when the app was run on an Android device.
 *
 * Nothing here infers behaviour from source or from a successful build. If no
 * run has been recorded, or the recorded run was made on different code, the
 * answer is UNVERIFIED -- not a pass, not a failure, an absence of evidence.
 *
 * Make it real with:
 *     npm run android:build      (once, or after native changes)
 *     npm run audit:android      (installs the DEV build and drives it)
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { ROOT } = require('../lib/sources');

function run() {
  const findings = [];
  const recPath = path.join(ROOT, '.audit', 'android-runtime.json');

  let rec = null;
  if (fs.existsSync(recPath)) {
    try { rec = JSON.parse(fs.readFileSync(recPath, 'utf8')); } catch { rec = null; }
  }

  let headSha = 'unknown';
  try {
    headSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {}

  const unverified = (what, why) => {
    findings.push({ severity: 'UNVERIFIED', where: 'Android runtime', what, why });
    return { id: 'android-runtime', title: 'Android runtime', status: 'UNVERIFIED',
             summary: why.split('.')[0].toLowerCase(), findings };
  };

  if (!rec) {
    return unverified('ANDROID RUNTIME — UNVERIFIED',
      'The app has never been run on a device or emulator. Run: npm run audit:android');
  }

  if (rec.status === 'UNVERIFIED') {
    return unverified('ANDROID RUNTIME — UNVERIFIED',
      'No device was connected when this was last attempted. Plug in a phone with USB ' +
      'debugging, or start an emulator, then run: npm run audit:android');
  }

  if (rec.commit !== headSha) {
    return unverified('ANDROID RUNTIME — UNVERIFIED (the recorded run is from other code)',
      'Measured on ' + String(rec.commit).slice(0, 8) + ', HEAD is ' + headSha.slice(0, 8) +
      '. A run against different code is not evidence about this code. Re-run: npm run audit:android');
  }

  const counts = rec.checks ? rec.checks.passed + '/' + rec.checks.total + ' checks' : 'recorded';

  if (rec.status === 'ABORTED') {
    findings.push({
      severity: 'FAIL', where: 'Android runtime',
      what: 'the run was ABORTED by the install safety gate',
      why: rec.detail || 'The APK did not carry the dev application id.',
    });
    return { id: 'android-runtime', title: 'Android runtime', status: 'FAIL',
             summary: 'aborted before installing', findings };
  }

  if (rec.status !== 'PASS') {
    for (const r of (rec.results || []).filter(x => !x.ok)) {
      findings.push({
        severity: 'FAIL', where: 'Android runtime',
        what: r.name + ' failed', why: r.detail || 'See npm run audit:android for detail.',
      });
    }
    return { id: 'android-runtime', title: 'Android runtime', status: 'FAIL',
             summary: counts + ' on ' + (rec.detail || 'a device'), findings };
  }

  findings.push({
    severity: 'INFO', where: 'Android runtime',
    what: 'verified on ' + (rec.detail || 'a device'),
    why: 'Measured ' + String(rec.when).slice(0, 19).replace('T', ' ') + ' on this exact commit.',
  });
  return { id: 'android-runtime', title: 'Android runtime', status: 'PASS',
           summary: counts + ' passed on ' + (rec.detail || 'a device'), findings };
}

module.exports = { run };
