/**
 * ONE SOURCE OF TRUTH FOR MONEY (audit section 2).
 *
 * The invariant: Dashboard and Weekly Check-In cannot disagree.
 *
 * They used to. Both showed a "Safe to Spend" figure and each worked it out
 * itself, differing in three ways:
 *
 *   - Dashboard counted bills by OCCURRENCE; Weekly Check-In read the old
 *     bills.is_paid flag, so paying August's hydro made September look paid.
 *   - Dashboard subtracted monthly goal savings; Weekly Check-In ignored goals.
 *   - Dashboard included subscriptions; Weekly Check-In did not.
 *
 * And Dashboard had a bug of its own: it counted only the three most recently
 * created goals (LIMIT 3), so a person with four goals was told more money was
 * safe to spend than really was.
 *
 * Both screens now read src/lib/financeSummary.ts, which delegates to the pure
 * engine in src/core/finance.ts. This test keeps it that way: it fails if any
 * screen starts deriving these numbers on its own again.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC = path.join(__dirname, '..');

/**
 * The only modules allowed to DERIVE financial figures.
 * Adding a file here is a significant decision, not a way to quiet the test.
 */
const ALLOWED_TO_CALCULATE = [
  'core/finance.ts',        // the pure engine
  'core/golden.ts',         // the known-correct fixtures
  'lib/financeSummary.ts',  // reads rows, delegates to the engine
  'lib/billCycles.ts',      // owns bill occurrence logic
  'utils/helpers.ts',       // legacy pure helpers, unit-tested
];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) {
      if (name !== '__tests__' && name !== 'node_modules') walk(p, out);
    } else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

function rel(p: string) {
  return path.relative(SRC, p).split(path.sep).join('/');
}

function sourceFiles() {
  return walk(SRC).filter(p => !ALLOWED_TO_CALCULATE.includes(rel(p)));
}

describe('Only the shared engine decides what a number is', () => {
  it('no screen derives its own Safe to Spend', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        // An assignment that COMPUTES the figure, not one that reads it off an object.
        const assigns = /(?:const|let|var)\s+safeToSpend\s*=/.test(line);
        if (!assigns) return;
        const readsFromEngine = /=\s*(finance|summary|data)\./.test(line);
        if (readsFromEngine) return;
        offenders.push(`${rel(file)}:${i + 1}  ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it('no screen spreads goal savings over its own number of months', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        if (!/target_amount\s*-\s*\w*[Cc]urrent/.test(line)) return;
        if (!/\/\s*\d+/.test(line)) return;   // divided by a month count
        offenders.push(`${rel(file)}:${i + 1}  ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it('no screen counts bills as paid using the permanent is_paid flag', () => {
    // Paid-ness belongs to an OCCURRENCE. The column still exists so the change
    // stays reversible, but nothing may branch on it to decide what is owed.
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      if (!rel(file).startsWith('screens/')) continue;
      fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        if (!/[!.]is_paid/.test(line)) return;
        if (!/filter|reduce|\?|if\s*\(/.test(line)) return;
        offenders.push(`${rel(file)}:${i + 1}  ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it('both screens read the shared engine', () => {
    for (const screen of ['screens/DashboardScreen.tsx', 'screens/WeeklyCheckInScreen.tsx']) {
      const text = fs.readFileSync(path.join(SRC, screen), 'utf8');
      expect(text).toContain('loadFinanceSummary');
    }
  });
});
