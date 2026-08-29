/**
 * THE COMPLEXITY STAYS UNDERNEATH.
 *
 * PeggyBank's engine knows about occurrences, payment statuses, cycle dates and
 * reservations. A person using it must never meet any of those words. This is a
 * hard product rule, so it gets a test rather than good intentions: "All bills
 * are paid this cycle" had been sitting on the Weekly Check-In screen.
 *
 * This scans the literal strings the screens can display. It is deliberately
 * narrow — quoted text and JSX text, not identifiers — so `currentCycleDate(b)`
 * is fine and "paid this cycle" is not.
 */

import * as fs from 'fs';
import * as path from 'path';

const SCREENS = path.join(__dirname, '..', 'screens');

/** Words that describe how the app is BUILT, not what the person's money is doing. */
const JARGON = /\b(occurrence|reconcile|reconciliation|ledger|cycle|settlement|transaction state|payload|schema)\b/i;

/**
 * Text the user could read: JSX text nodes, and the strings passed to props
 * that render or are spoken aloud.
 */
function userVisibleStrings(src: string): string[] {
  const out: string[] = [];

  // JSX text: >Some words here<  AND  {value} some words here<
  //
  // The second case is why this missed "$0.00 still due this cycle" sitting on
  // the Bills header: the sentence starts after an interpolation, not after a
  // tag, so a pattern anchored to > never saw it.
  for (const m of src.matchAll(/[>}]\s*([A-Za-z][^<>{}\n]{4,80})\s*</g)) out.push(m[1]);

  // text: '...', label: "...", title: '...', message: '...', placeholder: '...'
  const re = /\b(?:text|label|title|message|placeholder|subtitle|accessibilityLabel|actionLabel|helper)\s*[:=]\s*["']([^"']{4,120})["']/g;
  for (const m of src.matchAll(re)) out.push(m[1]);

  return out;
}

describe('No screen speaks in implementation terms', () => {
  const files = fs.readdirSync(SCREENS).filter(f => f.endsWith('.tsx'));

  it('finds screens to check (guard against an empty pass)', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  for (const file of files) {
    it(file + ' says nothing about occurrences, cycles or ledgers', () => {
      const src = fs.readFileSync(path.join(SCREENS, file), 'utf8');
      const offenders = userVisibleStrings(src).filter(s => JARGON.test(s));
      expect(offenders).toEqual([]);
    });
  }
});

describe('The guard actually catches things', () => {
  it('flags the sentence that was really on the Weekly Check-In screen', () => {
    const bad = `text: 'All bills are paid this cycle.'`;
    expect(userVisibleStrings(bad).filter(s => JARGON.test(s))).toEqual(
      ['All bills are paid this cycle.']);
  });

  it('does not flag ordinary code that merely mentions a cycle', () => {
    const fine = `const d = currentCycleDate(bill); setPaidCycles(cycleMap);`;
    expect(userVisibleStrings(fine).filter(s => JARGON.test(s))).toEqual([]);
  });
});
