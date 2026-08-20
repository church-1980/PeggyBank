/**
 * VISUAL ARCHITECTURE AUDIT (audit section 10).
 *
 * Two questions, asked of every production screen:
 *
 * 1. IS THIS SCREEN BUILT FROM THE DESIGN SYSTEM?
 *    src/components/peggy/index.ts states the rule: "No screen may define its
 *    own card, shadow, radius, icon container, button, input, progress bar,
 *    list row, or empty state." This check looks for exactly those SYSTEM
 *    things being re-declared locally.
 *
 *    It deliberately does NOT demand zero StyleSheets. A screen laying out its
 *    own grid, spacing or flex direction is doing its job. Punishing legitimate
 *    screen-specific layout would train people to ignore the audit. What is
 *    flagged is a screen re-inventing something the system already owns.
 *
 * 2. IS EVERY IONICON AN AFFORDANCE, NOT A CONCEPT?
 *    An Ionicon may say "tap here", "go back", "expand this". It may not stand
 *    in for a THING in the user's world -- a bill, a goal, a car, a pet. Those
 *    are concepts, and concepts come from the matte icon registry so they look
 *    the same everywhere. A line-art concept icon next to registry artwork is
 *    the exact drift this app has fought before.
 */

const { screenFiles, productionFiles } = require('../lib/sources');

/**
 * Ionicons that describe an ACTION or a NAVIGATION, not a thing.
 * Adding a name here is a design decision -- it says "this is furniture, not
 * subject matter". Do not add a name simply to silence the audit.
 */
const AFFORDANCE = new Set([
  // navigation
  'chevron-forward', 'chevron-back', 'chevron-down', 'chevron-up',
  'arrow-forward', 'arrow-back', 'arrow-forward-outline', 'arrow-back-outline',
  'arrow-down-circle-outline', 'close', 'close-outline', 'close-circle',
  // actions
  'add', 'add-outline', 'pencil', 'pencil-outline', 'trash-outline',
  'search', 'refresh', 'refresh-outline', 'ellipsis-horizontal',
  'share-social-outline', 'paper-plane-outline', 'swap-horizontal-outline',
  'camera', 'camera-outline', 'camera-reverse-outline', 'images-outline',
  'folder-open-outline', 'cloud-download-outline',
  // state feedback
  'checkmark', 'checkmark-circle', 'alert-circle-outline',
  'information-circle-outline', 'lock-closed-outline', 'cloud-offline-outline',
  'moon-outline',
]);

/** A StyleSheet key whose presence means the screen rebuilt something the system owns. */
const SYSTEM_STYLE_RULES = [
  { key: 'card',        needs: ['borderRadius', 'backgroundColor'], owns: 'PeggyCard' },
  { key: 'button',      needs: ['borderRadius', 'backgroundColor'], owns: 'PeggyButton' },
  { key: 'input',       needs: ['borderWidth'],                     owns: 'PeggyInput' },
  { key: 'row',         needs: ['flexDirection', 'borderBottom'],   owns: 'PeggyListRow' },
  { key: 'badge',       needs: ['borderRadius'],                    owns: 'PeggyBadge' },
  { key: 'progress',    needs: ['borderRadius'],                    owns: 'PeggyProgressBar' },
  { key: 'iconWrap',    needs: ['borderRadius'],                    owns: 'PeggyIconFrame' },
  { key: 'emptyState',  needs: [],                                  owns: 'PeggyEmptyState' },
];

/** Text of a StyleSheet entry, e.g. everything inside `card: { ... }`. */
function styleBlock(text, key) {
  const marker = key + ': {';
  const at = text.indexOf(marker);
  if (at === -1) return null;
  let depth = 0;
  for (let i = at + key.length + 2; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      if (depth === 0) return text.slice(at, i + 1);
      depth--;
    }
  }
  return null;
}

/** Every Ionicons name="..." in a file, with its line number. */
function iconUses(file) {
  const out = [];
  file.text.split('\n').forEach((line, i) => {
    if (!line.includes('name=')) return;
    const at = line.indexOf('name="');
    if (at === -1) return;
    const q = line.indexOf('"', at + 6);
    if (q === -1) return;
    const name = line.slice(at + 6, q);
    // Only count it if this line (or the one before) is actually an Ionicon.
    out.push({ name, line: i + 1, raw: line.trim() });
  });
  return out;
}

function run() {
  const findings = [];
  const screens = screenFiles();

  // ---- design-system adoption per screen ----
  const usesShell = [];
  for (const f of screens) {
    const shell = /<PeggyScreen|<PeggyPage/.test(f.text);
    if (shell) usesShell.push(f.rel);

    for (const rule of SYSTEM_STYLE_RULES) {
      const block = styleBlock(f.text, rule.key);
      if (!block) continue;
      const has = rule.needs.every(n => block.includes(n));
      if (!has) continue;
      // A screen already using the system component may still keep a wrapper style.
      if (f.text.includes('<' + rule.owns)) continue;
      findings.push({
        severity: 'FAIL',
        where: f.rel,
        what: `defines its own "${rule.key}" style instead of using ${rule.owns}`,
        why: 'Two implementations of one system element drift apart visually.',
      });
    }
  }

  // ---- Ionicons: affordance vs concept ----
  const conceptUses = [];
  for (const f of productionFiles()) {
    if (!f.text.includes('Ionicons')) continue;
    for (const use of iconUses(f)) {
      if (!/^[a-z][a-z0-9-]*$/.test(use.name)) continue; // not an icon name
      if (AFFORDANCE.has(use.name)) continue;
      conceptUses.push({ file: f.rel, ...use });
    }
  }
  for (const u of conceptUses) {
    findings.push({
      severity: 'FAIL',
      where: `${u.file}:${u.line}`,
      what: `Ionicon "${u.name}" is a CONCEPT, not an affordance`,
      why: 'Concepts must come from the matte icon registry so they match everywhere.',
    });
  }

  const failed = findings.filter(f => f.severity === 'FAIL');
  return {
    id: 'visual',
    title: 'Visual architecture',
    status: failed.length ? 'FAIL' : 'PASS',
    summary:
      `${screens.length} screens; ${usesShell.length}/${screens.length} on the PeggyScreen shell; ` +
      `${conceptUses.length} concept-icon use(s); ${failed.length - conceptUses.length} local rebuild(s) of system elements`,
    findings,
    detail: { screensOnShell: usesShell.length, screensTotal: screens.length },
  };
}

module.exports = { run };
