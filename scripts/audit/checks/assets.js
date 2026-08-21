/**
 * ICON & ASSET AUDIT (audit section 13).
 *
 * The icon registry (src/data/iconRegistry.ts) is the single source of truth:
 * one concept, one piece of artwork, everywhere. This check protects that
 * promise from the three ways it quietly breaks:
 *
 *   1. A registry entry points at an image file that is not there. The icon
 *      renders blank on a real device, while nothing fails at build time.
 *   2. A screen asks for an iconKey that the registry does not define. The icon
 *      silently falls back, so one screen looks different from the rest.
 *   3. Two different concepts resolve to the same artwork. The user cannot tell
 *      "Vehicle" from "Travel" at a glance, which was a real complaint.
 *
 * It also reports artwork weight, because oversized PNGs are paid for on every
 * cold start by someone on a phone.
 */

const fs = require('fs');
const path = require('path');
const { ROOT, productionFiles } = require('../lib/sources');

const REGISTRY = 'src/data/iconRegistry.ts';
const BIG_KB = 120; // an icon heavier than this is worth a second look

/** require('...') paths in the registry, with the key they belong to. */
function registryImages(text) {
  // The registry is one entry per line inside ICON_REGISTRY:
  //   travel: { label: 'Travel', ..., image: require('../../assets/peggy-icons/travel.png') },
  // Only that block is scanned, so doc-comment examples are not mistaken for entries.
  const start = text.indexOf('export const ICON_REGISTRY');
  if (start === -1) return [];
  const before = text.slice(0, start).split(String.fromCharCode(10)).length - 1;
  const out = [];
  text.slice(start).split(String.fromCharCode(10)).forEach((line, i) => {
    const at = line.indexOf("require('");
    if (at === -1) return;
    const end = line.indexOf("'", at + 9);
    if (end === -1) return;
    const colon = line.indexOf(":");
    if (colon === -1) return;
    // Keys with a dash are quoted in the source ('add-expense':), plain ones are not.
    const key = line.slice(0, colon).trim().replace(/^'|'$/g, '');
    if (!key || !/^[a-z0-9-]+$/.test(key)) return;   // not an entry line
    out.push({ key, spec: line.slice(at + 9, end), line: before + i + 1 });
  });
  return out;
}

/** IconKey union members declared in the registry. */
function declaredKeys(text) {
  const start = text.indexOf('export type IconKey');
  if (start === -1) return new Set();
  const end = text.indexOf(';', start);
  const body = text.slice(start, end === -1 ? undefined : end);
  const keys = new Set();
  let i = 0;
  while ((i = body.indexOf("| '", i)) !== -1) {
    const q = body.indexOf("'", i + 3);
    if (q === -1) break;
    keys.add(body.slice(i + 3, q));
    i = q + 1;
  }
  return keys;
}

/** iconKey="x" / iconKey: 'x' uses across the app. */
function keyUses(files) {
  const out = [];
  for (const f of files) {
    if (f.rel === REGISTRY) continue;
    f.text.split('\n').forEach((line, i) => {
      for (const marker of ['iconKey="', "iconKey: '", "iconKey='"]) {
        let at = 0;
        while ((at = line.indexOf(marker, at)) !== -1) {
          const quote = marker[marker.length - 1];
          const s = at + marker.length;
          const e = line.indexOf(quote, s);
          at = s;
          if (e === -1) continue;
          out.push({ key: line.slice(s, e), where: f.rel + ':' + (i + 1) });
        }
      }
    });
  }
  return out;
}

function run() {
  const findings = [];
  const reg = productionFiles().find(f => f.rel === REGISTRY);
  if (!reg) {
    return { id: 'assets', title: 'Icons and assets', status: 'FAIL',
      summary: 'icon registry not found',
      findings: [{ severity: 'FAIL', where: REGISTRY, what: 'missing', why: 'Icons cannot be verified.' }] };
  }

  const keys = declaredKeys(reg.text);
  const images = registryImages(reg.text);
  const regDir = path.dirname(path.join(ROOT, REGISTRY));

  // 1. every referenced image file exists
  const byFile = new Map();
  let totalKb = 0;
  for (const img of images) {
    const abs = path.resolve(regDir, img.spec);
    if (!fs.existsSync(abs)) {
      findings.push({
        severity: 'FAIL', where: `${REGISTRY}:${img.line}`,
        what: `artwork for "${img.key}" is missing: ${img.spec}`,
        why: 'The icon renders blank on a device; nothing fails at build time.',
      });
      continue;
    }
    const kb = Math.round(fs.statSync(abs).size / 1024);
    totalKb += kb;
    if (kb > BIG_KB) {
      findings.push({
        severity: 'REVIEW', where: `${REGISTRY}:${img.line}`,
        what: `artwork for "${img.key}" is ${kb} KB`,
        why: `Over ${BIG_KB} KB is paid for on every cold start.`,
      });
    }
    const norm = path.resolve(abs).toLowerCase();
    if (!byFile.has(norm)) byFile.set(norm, []);
    byFile.get(norm).push(img.key);
  }

  // 2. Two concepts sharing one picture.
  //
  // Allowed ONLY when declared in ICON_ALIASES with a reason, and only when the
  // alias names one of the very keys it is sharing with. Anything else is the
  // drift the registry exists to stop: two different things that look identical,
  // which is exactly the complaint that started this work.
  const aliasBlock = reg.text.slice(reg.text.indexOf('ICON_ALIASES'));
  const declaredAliases = new Map();
  {
    const stop = aliasBlock.indexOf('};');
    const body = stop === -1 ? aliasBlock : aliasBlock.slice(0, stop);
    // Scanned without a regex on purpose: escape sequences have repeatedly
    // failed to survive editing here, and a broken pattern would silently
    // report every alias as undeclared.
    for (const chunk of body.split("of:")) {
      const q = chunk.indexOf("'");
      if (q === -1) continue;
      const q2 = chunk.indexOf("'", q + 1);
      if (q2 === -1) continue;
      const target = chunk.slice(q + 1, q2);
      // the alias key is the last quoted name BEFORE this "of:"
      const before = body.slice(0, body.indexOf(chunk) + 1);
      const keys = before.split("'");
      const key = keys.length >= 2 ? keys[keys.length - 2] : null;
      if (key && /^[a-z0-9-]+$/.test(key) && /^[a-z0-9-]+$/.test(target)) {
        declaredAliases.set(key, target);
      }
    }
  }
  for (const [file, sharedKeys] of byFile) {
    if (sharedKeys.length < 2) continue;
    const undeclared = sharedKeys.filter(k => {
      const target = declaredAliases.get(k);
      return !target || !sharedKeys.includes(target);
    });
    if (undeclared.length > 1) {
      findings.push({
        severity: 'FAIL', where: path.relative(ROOT, file).split(path.sep).join('/'),
        what: `used for ${undeclared.length} concepts that are NOT declared aliases: ${undeclared.join(', ')}`,
        why: 'The user cannot tell these apart. Either give one its own artwork, or declare the alias in ICON_ALIASES with a reason.',
      });
    } else {
      const aliased = sharedKeys.filter(k => declaredAliases.has(k));
      findings.push({
        severity: 'INFO', where: path.relative(ROOT, file).split(path.sep).join('/'),
        what: `shared by declared alias(es): ${aliased.join(', ')}`,
        why: 'Deliberate: the same idea shown in two roles.',
      });
    }
  }

  // 3. screens asking for keys the registry does not define
  const uses = keyUses(productionFiles());
  const unknown = new Map();
  for (const u of uses) {
    if (keys.has(u.key)) continue;
    if (!unknown.has(u.key)) unknown.set(u.key, []);
    unknown.get(u.key).push(u.where);
  }
  for (const [key, wheres] of unknown) {
    findings.push({
      severity: 'FAIL', where: wheres.join(', '),
      what: `asks for icon "${key}", which the registry does not define`,
      why: 'Falls back silently, so this screen looks different from the rest.',
    });
  }

  // 4. declared but never used.
  // A key can reach a screen either as iconKey="x" or through a mapping table
  // (goal type -> icon, category -> icon), so a plain quoted occurrence counts
  // as use. Being generous here keeps this an honest INFO rather than noise.
  const used = new Set(uses.map(u => u.key));
  for (const file of productionFiles()) {
    if (file.rel === REGISTRY) continue;
    for (const k of keys) {
      if (used.has(k)) continue;
      if (file.text.includes("'" + k + "'") || file.text.includes('"' + k + '"')) used.add(k);
    }
  }
  const unused = [...keys].filter(k => !used.has(k));
  if (unused.length) {
    findings.push({
      severity: 'INFO', where: REGISTRY,
      what: `${unused.length} registry key(s) have no use found: ${unused.join(", ")}`,
      why: 'Not a defect — may be reserved for screens not built yet.',
    });
  }
  const failed = findings.filter(f => f.severity === 'FAIL');
  return {
    id: 'assets',
    title: 'Icons and assets',
    status: failed.length ? 'FAIL' : 'PASS',
    summary:
      `${keys.size} icon keys, ${images.length} artwork files (${totalKb} KB total), ` +
      `${uses.length} uses checked, ${unknown.size} unknown key(s)`,
    findings,
  };
}

module.exports = { run };
