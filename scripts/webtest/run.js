#!/usr/bin/env node
/**
 * npm run audit:web — the real browser runtime check.
 *
 * Starts a server that sends the cross-origin isolation headers, drives Chrome
 * against the exported build, and RECORDS the outcome to .audit/web-runtime.json
 * together with the commit it was measured on.
 *
 * The commit matters. A result from different code is not evidence about this
 * code, so the audit treats a recording from another commit as UNVERIFIED
 * rather than quietly reusing it. That is the difference between a report that
 * is current and one that is merely green.
 */
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DIST = path.join(ROOT, 'dist-web');
const PORT = 8099;

function head() {
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); }
  catch { return 'unknown'; }
}

function record(status, detail, checks) {
  const dir = path.join(ROOT, '.audit');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'web-runtime.json'), JSON.stringify({
    status, detail, checks, commit: head(), when: new Date().toISOString(),
  }, null, 2));
}

(async () => {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    console.log('No web build found at dist-web/.');
    console.log('Build it first:  npx expo export --platform web --output-dir dist-web');
    record('UNVERIFIED', 'no web build present', null);
    process.exit(1);
  }

  const server = spawn(process.execPath, [path.join(__dirname, 'serve.js')], {
    cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore',
  });
  await new Promise(r => setTimeout(r, 1500));

  let code = 1, output = '';
  try {
    output = execFileSync(process.execPath, [path.join(__dirname, 'persistence.test.js')], {
      cwd: ROOT, encoding: 'utf8', env: { ...process.env, WEB_URL: 'http://localhost:' + PORT + '/' },
    });
    code = 0;
  } catch (e) {
    output = (e.stdout || '') + (e.stderr || '');
    code = e.status == null ? 1 : e.status;
  } finally {
    server.kill();
  }

  console.log(output);
  const m = output.match(/(\d+) \/ (\d+) web runtime checks passed/);
  const checks = m ? { passed: Number(m[1]), total: Number(m[2]) } : null;
  record(code === 0 ? 'PASS' : 'FAIL',
         code === 0 ? 'browser runtime and persistence verified' : 'browser runtime checks failed',
         checks);
  process.exit(code);
})();
