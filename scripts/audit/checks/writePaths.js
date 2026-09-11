/**
 * WRITE-PATH CONSISTENCY AUDIT (diagnostic section 8/18).
 *
 * The one-brain audit found this by hand: expenses and income each had
 * several independent places writing a new row into the same table, with no
 * guarantee they stayed in agreement. This automates the DISCOVERY half of
 * that so it does not need re-finding by hand next time — a table gaining a
 * third writer, or a table that used to have one writer growing a second,
 * shows up here without anyone reading every screen again.
 *
 * WHAT THIS CANNOT DO: judge whether multiple writers are a problem. Some
 * are fine by design — a dedicated undo-restore path is deliberately
 * separate from the normal creator (see saveExpense.ts: createExpense vs
 * restoreExpense). This check finds the FACT of multiple writers and reports
 * it as REVIEW, not FAIL — a human decides whether it is duplication risk or
 * an intentional, distinct write.
 */

const { productionFiles } = require('../lib/sources');

// The record types the diagnostic cares about — the ones with real money or
// a plan behind them. Not every table in the schema; settings/custom_logos/
// calendar_reminders are low-stakes and would just add noise.
const TRACKED_TABLES = [
  'expenses', 'income', 'income_schedules', 'bills', 'subscriptions',
  'bill_payments', 'savings_goals', 'debts', 'debt_payments', 'merchant_memory',
];

/** Every `INSERT INTO <table>` this file contains, with line numbers. */
function insertSitesIn(file) {
  const out = [];
  const re = /INSERT(?:\s+OR\s+\w+)?\s+INTO\s+(\w+)/gi;
  file.text.split('\n').forEach((line, i) => {
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(line))) {
      out.push({ table: m[1], line: i + 1 });
    }
  });
  return out;
}

function run() {
  const files = productionFiles().filter(f => !f.rel.startsWith('scripts/'));
  /** @type {Map<string, {file: string, line: number}[]>} */
  const writers = new Map();

  for (const f of files) {
    for (const site of insertSitesIn(f)) {
      if (!TRACKED_TABLES.includes(site.table)) continue;
      if (!writers.has(site.table)) writers.set(site.table, []);
      writers.get(site.table).push({ file: f.rel, line: site.line });
    }
  }

  const findings = [];
  let multiWriterTables = 0;
  for (const table of TRACKED_TABLES) {
    const sites = writers.get(table) || [];
    const distinctFiles = [...new Set(sites.map(s => s.file))];
    if (distinctFiles.length <= 1) continue;
    multiWriterTables++;
    findings.push({
      severity: 'REVIEW',
      where: distinctFiles.map((f, idx) => f + ':' + sites.filter(s => s.file === f).map(s => s.line).join(',')).join(' | '),
      what: `${table} is written by ${distinctFiles.length} different files (${sites.length} INSERT site(s) total)`,
      why: 'Multiple writers for the same record type is how validation, defaults or a side-effect (like merchant memory) quietly drift apart between entry points. May be intentional (e.g. a dedicated undo-restore path) — confirm each site agrees on shape, not just that it compiles.',
    });
  }

  return {
    id: 'writePaths',
    title: 'Write-path consistency',
    status: 'INFO', // discovery only — never fails the run; a human judges each REVIEW
    summary: `${TRACKED_TABLES.length} record type(s) checked; ${multiWriterTables} with more than one writer file`,
    findings,
  };
}

module.exports = { run };
