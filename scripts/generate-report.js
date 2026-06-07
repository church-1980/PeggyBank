#!/usr/bin/env node
/**
 * generate-report.js
 * Reads Jest JSON output (test-results.json) and writes TEST_REPORT.md.
 * Run after: npm run test:ci
 */

const fs   = require('fs');
const path = require('path');

const ROOT         = path.join(__dirname, '..');
const RESULTS_FILE = path.join(ROOT, 'test-results.json');
const REPORT_FILE  = path.join(ROOT, 'TEST_REPORT.md');

const MANUAL_TESTS = [
  'Receipt camera — requires physical device with camera',
  'Push notifications — requires device + Expo Go or production build',
  'APK install on fresh Android device (no prior data)',
  'Currency rate API — requires active internet connection',
  'Dark/light mode visual check — theme tokens tested in Jest, visual rendering needs eyes',
  'Pull-to-refresh on slow connection',
  'Safe to Spend card with $0 income and $0 expenses (edge case)',
  'Payday countdown wraps correctly at end of month',
  'Recurring bill auto-reset at start of new month',
  'Goal deadline shows correctly in different time zones',
  'Keyboard avoidance on Add Expense / Add Income forms',
  'Large text accessibility (system font size set to XL)',
  'Data persistence across full app restart (not just background)',
];

const now = new Date().toLocaleString('en-CA', {
  year: 'numeric', month: 'long', day: 'numeric',
  hour: '2-digit', minute: '2-digit',
});

let pass = [];
let fail = [];

if (fs.existsSync(RESULTS_FILE)) {
  const raw  = fs.readFileSync(RESULTS_FILE, 'utf8');
  const data = JSON.parse(raw);

  for (const suite of (data.testResults ?? [])) {
    const suiteName = suite.testFilePath
      ? path.relative(ROOT, suite.testFilePath)
      : 'unknown';
    for (const test of (suite.assertionResults ?? suite.testResults ?? [])) {
      const ancestors = (test.ancestorTitles ?? []).join(' › ');
      const label = ancestors ? `${suiteName} › ${ancestors} › ${test.title}` : `${suiteName} › ${test.title}`;
      if (test.status === 'passed') {
        pass.push(label);
      } else if (test.status === 'failed') {
        const msg = (test.failureMessages ?? [])
          .map(m => m.split('\n')[0])
          .join('; ');
        fail.push(`${label}\n  Error: ${msg}`);
      }
    }
  }
} else {
  console.warn('⚠  test-results.json not found. Run: npm run test:ci first.');
  console.warn('   Writing report with placeholder results.\n');
  pass = ['(run npm run test:ci to populate results)'];
}

const passBlock = pass.length
  ? pass.map(t => `- ${t}`).join('\n')
  : '- (none)';

const failBlock = fail.length
  ? fail.map(t => `- ${t}`).join('\n')
  : '- (none — all tests passed)';

const manualBlock = MANUAL_TESTS.map(t => `- ${t}`).join('\n');

const report = `# PeggyBank Test Report
Generated: ${now}

---

## ✅ PASS (${pass.length})

${passBlock}

---

## ❌ FAIL (${fail.length})

${failBlock}

---

## 🔍 NEEDS MANUAL TESTING

${manualBlock}

---

## How to run tests

| Command | What it does |
|---------|-------------|
| \`npm test\` | Run Jest tests once |
| \`npm run test:watch\` | Run Jest in watch mode (re-runs on save) |
| \`npm run test:coverage\` | Run tests + generate coverage report |
| \`npm run test:ci\` | Run tests and save JSON output to test-results.json |
| \`npm run test:report\` | Generate this report from test-results.json |
| \`npm run test:all\` | Run tests + generate report in one command |

## How to run Maestro E2E flows

Maestro requires a running emulator or physical device connected via USB.

1. Install Maestro: \`curl -Ls "https://get.maestro.mobile.dev" | bash\`
2. Start your app: \`npx expo start --android\` (or --ios)
3. Run a single flow: \`maestro test maestro/01_add_expense.yaml\`
4. Run all flows: \`maestro test maestro/\`

Scripts (after Maestro is installed):
- \`npm run maestro:expense\` — test add expense flow
- \`npm run maestro:bill\`    — test add bill flow
- \`npm run maestro:goal\`    — test add goal flow
- \`npm run maestro:all\`     — run all 6 flows
`;

fs.writeFileSync(REPORT_FILE, report, 'utf8');
console.log(`✅ Report written to TEST_REPORT.md`);
console.log(`   PASS: ${pass.length}  |  FAIL: ${fail.length}  |  Manual: ${MANUAL_TESTS.length}`);
