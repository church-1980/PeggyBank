/**
 * WEB GATE (audit section 14).
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE:
 *   A SUCCESSFUL BUILD IS NOT A RUNTIME PASS.
 *
 * "The web bundle compiled" says the JavaScript is syntactically valid. It says
 * nothing about whether the app opens, whether the database initialises, or
 * whether a single number appears on screen. Reporting a build as a runtime
 * pass is the most tempting lie in this whole audit, so this check refuses to
 * tell it: without browser automation installed, the web runtime is reported as
 * UNVERIFIED, which is neither a pass nor a failure. It is the truth.
 *
 * PeggyBank on web additionally needs cross-origin isolation: its SQLite runs
 * as WebAssembly and needs SharedArrayBuffer, which the browser only grants
 * when COOP/COEP headers are served. Those headers are checked here as a
 * STATIC configuration check -- again, not a runtime proof.
 */

const fs = require('fs');
const path = require('path');
const { ROOT } = require('../lib/sources');

/** Browser automation tools that could actually drive a real page. */
const DRIVERS = ['playwright', '@playwright/test', 'puppeteer', 'cypress', 'selenium-webdriver'];

function installed(name) {
  return fs.existsSync(path.join(ROOT, 'node_modules', ...name.split('/')));
}

function run() {
  const findings = [];
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const driver = DRIVERS.find(d => deps[d] || installed(d));

  // --- static: cross-origin isolation headers for WASM SQLite ---
  const headerFiles = ['public/_headers', 'dist/_headers'];
  const withHeaders = headerFiles.filter(h => fs.existsSync(path.join(ROOT, h)));
  let coopOk = false;
  for (const h of withHeaders) {
    const t = fs.readFileSync(path.join(ROOT, h), 'utf8');
    if (t.includes('Cross-Origin-Opener-Policy') && t.includes('Cross-Origin-Embedder-Policy')) coopOk = true;
  }
  if (!coopOk) {
    findings.push({
      severity: 'FAIL',
      where: headerFiles.join(' / '),
      what: 'no COOP/COEP headers found',
      why: 'Without cross-origin isolation the browser withholds SharedArrayBuffer, and WASM SQLite cannot start — the web app would open to an empty database.',
    });
  } else {
    findings.push({
      severity: 'INFO',
      where: withHeaders.join(', '),
      what: 'COOP/COEP headers are configured',
      why: 'Static check only. It does not prove the host actually serves them.',
    });
  }

  // --- the recorded browser result ---
  //
  // A recording made on DIFFERENT code is not evidence about this code. If the
  // commit does not match HEAD the result is treated as UNVERIFIED rather than
  // reused, because a stale green is worse than an honest gap: it stops anyone
  // looking again.
  const recPath = path.join(ROOT, '.audit', 'web-runtime.json');
  let rec = null;
  if (fs.existsSync(recPath)) {
    try { rec = JSON.parse(fs.readFileSync(recPath, 'utf8')); } catch { rec = null; }
  }

  let headSha = 'unknown';
  try {
    headSha = require('child_process')
      .execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {}

  if (!rec) {
    findings.push({
      severity: 'UNVERIFIED', where: 'web runtime',
      what: 'WEB RUNTIME — UNVERIFIED',
      why: 'Nothing has opened the web app. Run: npm run web:build && npm run audit:web',
    });
    return { id: 'web-gate', title: 'Web runtime', status: 'UNVERIFIED',
             summary: 'never run in a browser', findings };
  }

  if (rec.commit !== headSha) {
    findings.push({
      severity: 'UNVERIFIED', where: 'web runtime',
      what: 'WEB RUNTIME — UNVERIFIED (the recorded result is from other code)',
      why: 'Measured on ' + String(rec.commit).slice(0, 8) + ', HEAD is ' + headSha.slice(0, 8) +
           '. Re-run: npm run web:build && npm run audit:web',
    });
    return { id: 'web-gate', title: 'Web runtime', status: 'UNVERIFIED',
             summary: 'recorded result is stale (measured on ' + String(rec.commit).slice(0, 8) + ')', findings };
  }

  const counts = rec.checks ? rec.checks.passed + '/' + rec.checks.total + ' checks' : 'result recorded';
  if (rec.status !== 'PASS') {
    findings.push({
      severity: 'FAIL', where: 'web runtime',
      what: 'the web app failed its browser checks (' + counts + ')',
      why: rec.detail || 'See npm run audit:web for the detail.',
    });
    return { id: 'web-gate', title: 'Web runtime', status: 'FAIL',
             summary: counts + ' — measured in Chrome', findings };
  }

  findings.push({
    severity: 'INFO', where: 'web runtime',
    what: 'verified in Chrome: the app starts, stores an expense, and it survives a reload and a new tab',
    why: 'Measured ' + String(rec.when).slice(0, 19).replace('T', ' ') + ' on this exact commit.',
  });
  return { id: 'web-gate', title: 'Web runtime', status: 'PASS',
           summary: counts + ' passed in real Chrome, including persistence across reload', findings };
}

module.exports = { run };
