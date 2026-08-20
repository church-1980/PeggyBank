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

  // --- the honest part ---
  if (!driver) {
    findings.push({
      severity: 'UNVERIFIED',
      where: 'web runtime',
      what: 'WEB RUNTIME — UNVERIFIED',
      why:
        'No browser automation is installed (none of: ' + DRIVERS.join(', ') + '), so nothing ' +
        'in this audit has opened the web app, loaded a page, or read a number off the screen. ' +
        'This is NOT a pass and NOT a failure. To turn it into a real result, install a driver ' +
        'and add a test that loads the app, writes a row, reloads, and reads it back.',
    });
    return {
      id: 'web-gate',
      title: 'Web runtime',
      status: 'UNVERIFIED',
      summary: 'no browser automation installed — the web app has not been run',
      findings,
    };
  }

  findings.push({
    severity: 'INFO', where: 'web runtime',
    what: `browser automation available (${driver})`,
    why: 'A runtime test can be written. Availability alone still proves nothing.',
  });
  return {
    id: 'web-gate',
    title: 'Web runtime',
    status: 'UNVERIFIED',
    summary: `${driver} is installed, but no runtime test asserts the web app actually works`,
    findings,
  };
}

module.exports = { run };
