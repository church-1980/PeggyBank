/**
 * FIVE-PERSONA COVERAGE MODEL (audit section 16).
 *
 * Five people who will use PeggyBank. For each, the journey is listed step by
 * step, and every step is marked with what the audit ACTUALLY knows about it:
 *
 *   VERIFIED   An automated test asserts this works. Named, so it can be read.
 *   HEURISTIC  A static check looked at the source and formed an opinion. It
 *              has not run the app.
 *   HUMAN      Nothing automated covers this. A person must open the app.
 *
 * The point of this list is not to look complete. It is to make the size of the
 * unverified area visible, so nobody mistakes "the audit passed" for "a person
 * can use the app". Most of a mobile app's real behaviour lands in HUMAN, and
 * saying so plainly is the honest result.
 */

const PERSONAS = [
  {
    id: 'A',
    name: 'Never used the app before',
    who: 'Opens PeggyBank for the first time. No data, no idea what to expect.',
    steps: [
      { step: 'Opens the app and reaches onboarding',              status: 'HUMAN' },
      { step: 'Sees empty screens that explain themselves',        status: 'HEURISTIC', by: 'visual audit checks PeggyEmptyState use' },
      { step: 'Every number reads 0, never NaN or a blank',        status: 'VERIFIED',  by: 'goldenFinance: handles an empty database' },
      { step: 'Adds a first expense and sees it appear',           status: 'HUMAN' },
      { step: 'Understands what Safe to Spend means',              status: 'HUMAN' },
    ],
  },
  {
    id: 'B',
    name: 'Everyday user',
    who: 'Logs spending most days, checks what is left before buying something.',
    steps: [
      { step: 'Logs an expense in the evening, dated today',       status: 'VERIFIED',  by: 'dateTorture: 8:01 PM Toronto is still today' },
      { step: 'Safe to Spend reflects the new expense',            status: 'VERIFIED',  by: 'goldenFinance: SAFE TO SPEND is correct' },
      { step: 'Marks a bill paid; it leaves what is owed',         status: 'VERIFIED',  by: 'goldenFinance: paying this cycle removes the bill' },
      { step: 'Next month the same bill comes back',               status: 'VERIFIED',  by: 'goldenFinance: a bill paid LAST month is still owed THIS month' },
      { step: 'Dashboard and Weekly Check-In agree',               status: 'VERIFIED',  by: 'safeToSpendConsistency: every screen reads the same engine' },
      { step: 'The numbers are readable and well laid out',        status: 'HUMAN' },
    ],
  },
  {
    id: 'C',
    name: 'Power user',
    who: 'Many bills, several goals, debts, and a habit of exporting backups.',
    steps: [
      { step: 'Bills due on the 29th-31st appear every month',     status: 'VERIFIED',  by: 'dateTorture: clamps 29, 30 and 31 to 28' },
      { step: 'Goals never show over 100% or a negative need',     status: 'VERIFIED',  by: 'goldenFinance: over-funded goal contributes 0' },
      { step: 'Debt payoff says "never" when it never pays off',   status: 'VERIFIED',  by: 'goldenFinance: says "never" rather than a number' },
      { step: 'A backup contains every table of their data',       status: 'VERIFIED',  by: 'tableCoverage: backup manifest and classification agree' },
      { step: 'Export writes a file they can find and keep',       status: 'HUMAN' },
    ],
  },
  {
    id: 'D',
    name: 'Lost their phone',
    who: 'New device. Everything depends on the backup being real.',
    steps: [
      { step: 'A good backup restores every table',                status: 'VERIFIED',  by: 'backupRestore: round-trips every field of every table' },
      { step: 'A corrupt file is refused without deleting data',   status: 'VERIFIED',  by: 'backupRestore: rejects malformed data WITHOUT deleting anything' },
      { step: 'A failure mid-restore leaves data as it was',       status: 'VERIFIED',  by: 'backupRestore: ROLLS BACK entirely when a write fails midway' },
      { step: 'An older backup still restores',                    status: 'VERIFIED',  by: 'backupRestore: accepts an older backup that predates newer tables' },
      { step: 'Missing receipt images are reported, not hidden',   status: 'VERIFIED',  by: 'backupRestore: reports image references that cannot be recovered' },
      { step: 'Delete All Data really erases everything',          status: 'VERIFIED',  by: 'tableCoverage: wipes every table that is not deliberately excluded' },
      { step: 'They can find and pick the backup file on a new phone', status: 'HUMAN' },
    ],
  },
  {
    id: 'E',
    name: 'Uses a screen reader or large text',
    who: 'Needs the app to be operable without seeing it clearly.',
    steps: [
      { step: 'Every button announces what it does',               status: 'HEURISTIC', by: 'accessibility audit finds unlabelled icon-only buttons' },
      { step: 'Touch targets are big enough to hit',               status: 'HEURISTIC', by: 'accessibility audit, static sizes only' },
      { step: 'Text stays readable at large system font sizes',    status: 'HUMAN' },
      { step: 'Focus order makes sense with a screen reader',      status: 'HUMAN' },
      { step: 'Nothing important is conveyed by colour alone',     status: 'HUMAN' },
    ],
  },
];

function run() {
  const findings = [];
  let verified = 0, heuristic = 0, human = 0;

  for (const p of PERSONAS) {
    for (const s of p.steps) {
      if (s.status === 'VERIFIED') verified++;
      else if (s.status === 'HEURISTIC') heuristic++;
      else human++;
    }
    const humanSteps = p.steps.filter(s => s.status === 'HUMAN');
    if (humanSteps.length) {
      findings.push({
        severity: 'HUMAN',
        where: `Persona ${p.id} — ${p.name}`,
        what: `${humanSteps.length} of ${p.steps.length} steps need a person: ${humanSteps.map(s => s.step).join('; ')}`,
        why: 'No automated test covers these. The audit cannot speak for them.',
      });
    }
  }

  const total = verified + heuristic + human;
  return {
    id: 'personas',
    title: 'Five-persona coverage',
    status: 'INFO',
    summary:
      `${total} journey steps: ${verified} verified by tests, ${heuristic} heuristic, ` +
      `${human} need a person to check. Coverage is a fact here, not a grade.`,
    findings,
    detail: { verified, heuristic, human, personas: PERSONAS },
  };
}

module.exports = { run, PERSONAS };
