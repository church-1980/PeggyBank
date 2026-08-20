/**
 * ACCESSIBILITY AUDIT (audit section 11).
 *
 * PeggyBank is for someone managing money on a phone, possibly in a hurry,
 * possibly with a screen reader, possibly with tired eyes. Three things are
 * checked, and each is reported at the confidence it actually deserves:
 *
 *   1. ICON-ONLY BUTTONS WITHOUT A LABEL  (FAIL, high confidence)
 *      A button whose only child is an icon reads out as "button" and nothing
 *      else. A screen reader user cannot know what it does. This is checkable
 *      from the source with certainty.
 *
 *   2. TOUCH TARGETS UNDER 44dp  (REVIEW, heuristic)
 *      Only explicit width/height on a touchable can be seen statically;
 *      padding and flex are decided at runtime. Reported for human review, not
 *      as a hard failure, because a static guess either way would be dishonest.
 *
 *   3. BODY TEXT UNDER 14pt  (REVIEW, heuristic)
 *      Small text in a money app is a real barrier. Caption-sized type is
 *      legitimate in places, so this is surfaced for judgement, not failed.
 *
 * Items 2 and 3 are HEURISTIC and are reported as such. They are never counted
 * as verified passes.
 */

const { productionFiles } = require('../lib/sources');

const TOUCHABLES = ['TouchableOpacity', 'Pressable', 'TouchableHighlight', 'TouchableWithoutFeedback'];
const MIN_TARGET = 44;
const MIN_TEXT = 14;

/** The source of each JSX element of the given type, roughly bounded by its closing tag. */
function elements(text, tag) {
  const out = [];
  const open = '<' + tag;
  const close = '</' + tag + '>';
  let i = 0;
  while ((i = text.indexOf(open, i)) !== -1) {
    const nextChar = text[i + open.length];
    if (nextChar && /[A-Za-z0-9]/.test(nextChar)) { i += open.length; continue; }
    const end = text.indexOf(close, i);
    const selfClose = text.indexOf('/>', i);
    const stop = end === -1 ? (selfClose === -1 ? text.length : selfClose + 2) : end + close.length;
    const line = text.slice(0, i).split(String.fromCharCode(10)).length;
    out.push({ src: text.slice(i, stop), line });
    i = stop;
  }
  return out;
}

function run() {
  const findings = [];
  let touchablesChecked = 0;

  for (const f of productionFiles()) {
    if (!f.rel.endsWith('.tsx')) continue;

    // 1. icon-only buttons with no accessible name
    for (const tag of TOUCHABLES) {
      for (const el of elements(f.text, tag)) {
        touchablesChecked++;
        const hasIcon = el.src.includes('<Ionicons') || el.src.includes('<PeggyIconFrame') || el.src.includes('<Image');
        if (!hasIcon) continue;
        const hasText = el.src.includes('<Text');
        if (hasText) continue;                      // the text is the accessible name
        if (el.src.includes('accessibilityLabel')) continue;
        findings.push({
          severity: 'FAIL',
          where: `${f.rel}:${el.line}`,
          what: `${tag} contains only an icon and has no accessibilityLabel`,
          why: 'A screen reader announces "button" with no indication of what it does.',
        });
      }
    }

    // 2. explicitly small touch targets (heuristic)
    f.text.split(String.fromCharCode(10)).forEach((line, i) => {
      const m = line.match(/(?:width|height|minWidth|minHeight):\s*(\d+)/);
      if (!m) return;
      const px = Number(m[1]);
      if (px >= MIN_TARGET || px < 12) return;      // <12 is an icon glyph, not a target
      if (!/(button|touch|tap|press|hit|target|chip|fab)/i.test(line)) return;
      findings.push({
        severity: 'REVIEW',
        where: `${f.rel}:${i + 1}`,
        what: `a tappable-looking element is ${px}dp (under ${MIN_TARGET}dp)`,
        why: 'HEURISTIC — padding may make the real target bigger. Needs a human look.',
      });
    });

    // 3. very small text (heuristic)
    f.text.split(String.fromCharCode(10)).forEach((line, i) => {
      const m = line.match(/fontSize:\s*(\d+)/);
      if (!m) return;
      const px = Number(m[1]);
      if (px >= MIN_TEXT) return;
      findings.push({
        severity: 'REVIEW',
        where: `${f.rel}:${i + 1}`,
        what: `fontSize ${px} is under ${MIN_TEXT}`,
        why: 'HEURISTIC — fine for a caption, a problem for anything the user must read.',
      });
    });
  }

  const failed = findings.filter(x => x.severity === 'FAIL');
  const review = findings.filter(x => x.severity === 'REVIEW');
  return {
    id: 'accessibility',
    title: 'Accessibility',
    status: failed.length ? 'FAIL' : 'PASS',
    summary:
      `${touchablesChecked} touchables checked; ${failed.length} unlabelled icon-only button(s) ` +
      `[verified]; ${review.length} item(s) flagged for human review [heuristic]`,
    findings,
  };
}

module.exports = { run };
