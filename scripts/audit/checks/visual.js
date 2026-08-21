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
  { key: 'emptyState',  needs: ['backgroundColor', 'borderRadius'], owns: 'PeggyEmptyState' },
];

/** Text of a StyleSheet entry, e.g. everything inside `card: { ... }`. */
function styleBlock(text, key) {
  // Returns ONLY the body of `key: { ... }`.
  //
  // The previous version began counting at the opening brace itself, so the
  // first closing brace merely balanced it and the block ran on into the NEXT
  // style. Rules then matched properties belonging to a neighbour, which is how
  // a plain centring style got reported as rebuilding a card.
  const marker = key + ': {';
  const at = text.indexOf(marker);
  if (at === -1) return null;
  let depth = 1;                       // we are already inside the opening brace
  for (let i = at + marker.length; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.slice(at, i + 1);
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
    // Rendered size decides whether this is a concept slot or an adornment.
    let size = null;
    const sAt = line.indexOf('size={');
    if (sAt !== -1) {
      const sEnd = line.indexOf('}', sAt);
      const raw = sEnd === -1 ? "" : line.slice(sAt + 6, sEnd).trim();
      if (/^[0-9]+$/.test(raw)) size = Number(raw);
    }
    out.push({ name, size, line: i + 1, raw: line.trim() });
  });
  return out;
}

function run() {
  const findings = [];
  const screens = screenFiles();

  // ---- design-system adoption per screen ----
  const usesShell = [];
  const exempt = [];
  for (const f of screens) {
    const shell = /<PeggyScreen|<PeggyPage/.test(f.text);
    if (shell) usesShell.push(f.rel);

    // A screen may sit outside the shell ONLY with a written reason at the top
    // of the file. The marker alone is not enough -- an exemption without an
    // explanation is just a way to switch the check off.
    if (!shell) {
      const marker = f.text.indexOf('PEGGY-SHELL-EXEMPT:');
      const reason = marker === -1 ? '' : f.text.slice(marker + 'PEGGY-SHELL-EXEMPT:'.length).split(String.fromCharCode(10))[0].trim();
      if (reason.length > 25) {
        exempt.push(f.rel);
        findings.push({
          severity: 'INFO',
          where: f.rel,
          what: 'sits outside the shared shell by documented exception',
          why: reason,
        });
      } else {
        findings.push({
          severity: 'FAIL',
          where: f.rel,
          what: 'does not use the shared PeggyScreen shell',
          why: marker === -1
            ? 'Every production screen builds on the shared shell so backgrounds, safe-area insets and rhythm match. If this screen genuinely cannot, add a PEGGY-SHELL-EXEMPT comment at the top of the file explaining why.'
            : 'It is marked PEGGY-SHELL-EXEMPT but gives no real reason. State why this screen cannot use the shell.',
        });
      }
    }

    for (const rule of SYSTEM_STYLE_RULES) {
      const block = styleBlock(f.text, rule.key);
      if (!block) continue;
      const has = rule.needs.every(n => block.includes(n));
      if (!has) continue;
      // NOTE: there is deliberately no "this screen already uses PeggyCard, so
      // skip it" escape. That would let a screen use the system card once and
      // then hand-build others freely. The rule judges SUBSTANCE instead: a
      // wrapper style holding layout (width, margin, a meaningful accent
      // border) is fine and passes; one that declares the card SURFACE --
      // background and radius -- is rebuilding what PeggyCard owns.
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
  // A CONCEPT SLOT vs AN ADORNMENT.
  //
  // The registry's artwork is matte, softly shaded 3D. Below roughly 24dp that
  // shading turns to mud and the shape stops reading -- which is why the design
  // system's own inline concept tier starts at 40dp. So a 14dp icon sitting on
  // the same line as a sentence was never going to be registry art; it is
  // typographic punctuation, and demanding artwork there would make the app
  // worse, not more consistent.
  //
  // What DOES have to be registry art is a concept standing on its own as the
  // single visual for a block: an empty state, a tile, a card header. Those are
  // reported as failures. The small inline ones are still listed, as REVIEW, so
  // they stay visible rather than disappearing from the report.
  const CONCEPT_SLOT_MIN = 24;
  for (const u of conceptUses) {
    const isSlot = u.size !== null && u.size >= CONCEPT_SLOT_MIN;
    findings.push({
      severity: isSlot ? 'FAIL' : 'REVIEW',
      where: `${u.file}:${u.line}`,
      what: isSlot
        ? `Ionicon "${u.name}" fills a concept slot at ${u.size}dp`
        : `Ionicon "${u.name}" is a concept used as a ${u.size === null ? 'small inline' : u.size + 'dp inline'} adornment`,
      why: isSlot
        ? 'A concept standing alone must come from the matte registry so it matches everywhere.'
        : 'HEURISTIC - too small for matte artwork to read. Acceptable as punctuation beside text; worth a human eye.',
    });
  }

  const failed = findings.filter(f => f.severity === 'FAIL');
  return {
    id: 'visual',
    title: 'Visual architecture',
    status: failed.length ? 'FAIL' : 'PASS',
    summary:
      `${screens.length} screens; ${usesShell.length} on the shared shell, ${exempt.length} documented exception(s); ` +
      `${conceptUses.filter(u => u.size !== null && u.size >= 24).length} concept slot(s) drawn as line art; ` +
      `${failed.length} failing item(s) in total`,
    findings,
    detail: { screensOnShell: usesShell.length, screensTotal: screens.length },
  };
}

module.exports = { run };
