/**
 * NAVIGATION & ROUTE AUDIT (audit section 12).
 *
 * Three ways navigation breaks in a way TypeScript will not catch, because
 * route names are plain strings:
 *
 *   1. A button navigates to a route that was never registered -> the app does
 *      nothing when tapped, or crashes. The user thinks the app is broken.
 *   2. A screen file exists but is registered nowhere -> dead code that still
 *      gets maintained, or a feature the user can never reach.
 *   3. Two routes share a name -> one of them is unreachable, silently.
 *
 * Every one of these is invisible until someone taps the wrong thing.
 */

const path = require('path');
const { ROOT, productionFiles, screenFiles } = require('../lib/sources');

const NAV_FILE = 'src/navigation/AppNavigator.tsx';

/** Route names registered on a navigator, in order, so duplicates are visible. */
function registeredRoutes(text) {
  const out = [];
  let i = 0;
  const marker = 'name="';
  while ((i = text.indexOf(marker, i)) !== -1) {
    const q = text.indexOf('"', i + marker.length);
    if (q === -1) break;
    const name = text.slice(i + marker.length, q);
    i = q + 1;
    if (/^[A-Z][A-Za-z0-9]*$/.test(name)) out.push(name);
  }
  return out;
}

/** Every navigate('X') / push('X') / replace('X') target in the app. */
function navigationTargets(files) {
  const out = [];
  for (const f of files) {
    const lines = f.text.split('\n');
    lines.forEach((line, i) => {
      for (const verb of ['navigate(', 'push(', 'replace(']) {
        let at = 0;
        while ((at = line.indexOf(verb, at)) !== -1) {
          const rest = line.slice(at + verb.length);
          at += verb.length;
          const quote = rest[0];
          if (quote !== "'" && quote !== '"') continue;
          const end = rest.indexOf(quote, 1);
          if (end === -1) continue;
          const name = rest.slice(1, end);
          if (/^[A-Z][A-Za-z0-9]*$/.test(name)) {
            out.push({ name, where: f.rel + ':' + (i + 1) });
          }
        }
      }
    });
  }
  return out;
}

function run() {
  const findings = [];
  const nav = productionFiles().find(f => f.rel === NAV_FILE);
  if (!nav) {
    return {
      id: 'navigation', title: 'Navigation and routes', status: 'FAIL',
      summary: `navigator not found at ${NAV_FILE}`,
      findings: [{ severity: 'FAIL', where: NAV_FILE, what: 'missing', why: 'Routes cannot be verified.' }],
    };
  }

  const routes = registeredRoutes(nav.text);
  const routeSet = new Set(routes);

  // 1. duplicates
  const seen = new Set();
  for (const r of routes) {
    if (seen.has(r)) {
      findings.push({
        severity: 'FAIL', where: NAV_FILE,
        what: `route "${r}" is registered more than once`,
        why: 'One of the two screens can never be reached.',
      });
    }
    seen.add(r);
  }

  // 2. navigate() targets that do not exist
  const targets = navigationTargets(productionFiles());
  const unknown = new Map();
  for (const t of targets) {
    if (routeSet.has(t.name)) continue;
    if (!unknown.has(t.name)) unknown.set(t.name, []);
    unknown.get(t.name).push(t.where);
  }
  for (const [name, wheres] of unknown) {
    findings.push({
      severity: 'FAIL',
      where: wheres.join(', '),
      what: `navigates to "${name}", which is not a registered route`,
      why: 'Tapping this does nothing, or crashes.',
    });
  }

  // 3. screens nobody can reach
  const registeredComponents = new Set();
  for (const m of nav.text.split('\n')) {
    const at = m.indexOf('component={');
    if (at === -1) continue;
    const end = m.indexOf('}', at);
    if (end !== -1) registeredComponents.add(m.slice(at + 'component={'.length, end).trim());
  }
  const orphans = [];
  for (const s of screenFiles()) {
    const base = path.basename(s.rel, '.tsx');
    if (!nav.text.includes(base)) orphans.push(s.rel);
  }
  for (const o of orphans) {
    findings.push({
      severity: 'REVIEW', where: o,
      what: 'screen file is not referenced by the navigator',
      why: 'Either unreachable by the user, or reached some other way — confirm which.',
    });
  }

  const failed = findings.filter(f => f.severity === 'FAIL');
  return {
    id: 'navigation',
    title: 'Navigation and routes',
    status: failed.length ? 'FAIL' : 'PASS',
    summary:
      `${routes.length} routes registered, ${targets.length} navigation calls checked, ` +
      `${unknown.size} broken target(s), ${orphans.length} unreferenced screen(s)`,
    findings,
  };
}

module.exports = { run };
