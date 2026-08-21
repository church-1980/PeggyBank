# The PeggyBank Audit

One command:

```
npm run audit:all
```

It checks that the app tells the truth about a person and their money, and it
prints its findings in plain language. It is meant to be readable by someone who
does not write code.

---

## The three results, and why the third one exists

| Result | Meaning |
|---|---|
| **PASS** | Something automated checked this, and it was right. |
| **FAIL** | Something automated checked this, and it was **wrong**. |
| **UNVERIFIED** | **Nothing checked this.** Not a pass. Not a failure. A gap. |

`UNVERIFIED` is the important one. The easiest lie an audit can tell is to let a
successful build stand in for a working app. A bundle that compiles has not been
opened, tapped, or read. Where this audit did not look, it says so, every time.

An `UNVERIFIED` section does **not** fail the run. It is reported loudly instead,
because turning it green means building something that can actually check it —
not lowering a bar.

---

## What it checks

| # | Section | What a pass actually proves |
|---|---|---|
| 1 | Code compiles | The code is internally consistent. Nothing about behaviour. |
| 2 | Money, dates, backup and restore | The numbers match answers worked out by hand, evening entries land on the right day, and a bad backup cannot destroy good data. |
| 3 | Android and web each compute correctly | Each platform, on its own, produces the known-correct values. |
| 4 | Android and web agree with each other | The two platforms produce identical results. |
| 5 | Platform difference contract | No platform-specific module does its own money math. |
| 6 | Visual architecture | No screen rebuilds something the design system owns; no line icon stands in for a concept. |
| 7 | Accessibility | Every button announces what it does. |
| 8 | Navigation and routes | Every button goes somewhere that exists. |
| 9 | Icons and assets | Every icon exists, and no two concepts share one picture. |
| 10 | Web runtime | *(see below — currently UNVERIFIED)* |
| 11 | Android identity and permissions | A local build cannot overwrite the real installed app. |
| 12 | Five-persona coverage | How much of five real people's journeys is actually covered. |

---

## Why the golden dataset has hand-computed answers

`src/core/golden.ts` describes one person's month — income, spending, bills,
goals — and states what every resulting number **should be**. Those expectations
were worked out by hand and checked with raw arithmetic. Nothing in that file was
produced by calling the code under test.

This matters because checking Android against web is not enough on its own. Both
platforms run the same source, so they can agree perfectly and both be wrong.
Every platform is therefore checked against the hand-computed answers **as well
as** against the other platform.

> **If you change a number in `golden.ts`, you are changing what "correct" means.**

---

## Rules for working on this audit

1. **Never weaken a check to make it green.** Not by editing an expected value,
   not by excluding a screen, not by adding a name to an allow-list, not by
   mocking away the thing being tested.
2. **Never report a build as a runtime pass.** Compiling is not running.
3. **Never mark a platform verified without observing it.** If it was not run,
   it is `UNVERIFIED`.
4. **A red test is useful information.** It is doing exactly the job it was
   written for. Fix the code.

The goal is not to make the audit green. The goal is to make the audit tell the
truth.

---

## Before a release

**Run `npm run audit:all` and read the output before shipping a build.**

Every `FAIL` should be either fixed or consciously accepted with a reason. Every
`UNVERIFIED` area should be understood as untested, not assumed working.

This is written down as the expectation. It is **not** wired into the build or
release scripts — `scripts/ship.sh` is unchanged, and deployment behaviour was
deliberately left alone. Enforcing the audit as a release gate is a separate
decision for the project owner to make.

---

## The web runtime check

```
npm run web:build     # export the web bundle
npm run audit:web     # drive real Chrome against it
```

This is not a smoke test. It starts a server that sends the cross-origin
isolation headers, opens the exported build in real Chrome, and answers the only
question that matters on web:

> If someone types their money in and closes the tab, is it still there?

It writes an expense, reads it back, **reloads the page**, opens a **brand new
tab**, deletes the expense, reloads again, and checks the browser console is
clean. On web the database is SQLite compiled to WebAssembly, so persistence is
the part most likely to be quietly broken — and no unit test can see it, because
jest runs against a native mock.

**This check found a real one.** The web build compiled perfectly, every unit
test passed, and the app was a **blank white page in a browser**. A dev-only
showcase screen called `Image.resolveAssetSource` at module level; react-native-web
has no such function, so it threw the moment the navigator imported the screen —
before React rendered anything. Nothing else in the audit could have caught that.

The result is recorded to `.audit/web-runtime.json` **with the commit it was
measured on**. If that commit is not HEAD, the audit reports UNVERIFIED instead
of reusing it: a result from different code is not evidence about this code, and
a stale green is worse than an honest gap because it stops anyone looking again.

---

## Turning `UNVERIFIED` into a real result

**Web runtime** is currently `UNVERIFIED` because no browser automation is
installed, so nothing has opened the web app or read a number off a real page.
To make it real:

1. Install a driver (Playwright, Puppeteer or Cypress).
2. Write a test that loads the app, **writes a row, reloads the page, and reads
   it back** — that is the check that matters, because on web the database is
   WebAssembly SQLite and persistence is the part most likely to break.
3. Have `scripts/audit/checks/webGate.js` run it and report a real PASS or FAIL.

Until then it stays `UNVERIFIED`, which is the honest answer.
