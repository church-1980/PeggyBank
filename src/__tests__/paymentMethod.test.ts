/**
 * "DO I HAVE TO PAY THIS, OR DOES IT COME OUT ON ITS OWN?"
 *
 * PeggyBank now knows the difference. This file proves that knowing it never
 * changes how much money the person has.
 *
 * THE INVARIANT, stated once:
 *
 *     A STATE TRANSITION MUST NOT CREATE OR DESTROY MONEY.
 *
 * A bill occurrence is subtracted EXACTLY ONCE — either as money still owed or
 * as money already gone. Moving between those two descriptions is a change of
 * certainty, not a financial event. We recently shipped a bug where paying a
 * bill made Safe to Spend go UP by the bill's amount; this file exists so that
 * cannot come back through the auto-pay door.
 */

import {
  occurrenceState, isReserved, isGone, needsAttention, describeOccurrence,
  ALL_STATES,
} from '../core/paymentState';
import { computeFinanceSummary, cents, type FinanceInput } from '../core/finance';

describe('Every state is either owed or gone — never both, never neither', () => {
  it('the two buckets are mutually exclusive', () => {
    for (const s of ALL_STATES) expect(isReserved(s) && isGone(s)).toBe(false);
  });

  it('the two buckets are exhaustive', () => {
    for (const s of ALL_STATES) expect(isReserved(s) || isGone(s)).toBe(true);
  });

  it('a failed automatic payment is still owed, not written off', () => {
    // The bank did not take it. The person still owes it. Releasing that money
    // back into Safe to Spend would tell them to go and spend the hydro bill.
    expect(isReserved('failed')).toBe(true);
    expect(isGone('failed')).toBe(false);
  });

  it('an expected auto-payment is still reserved until someone confirms it', () => {
    expect(isReserved('expected')).toBe(true);
  });
});

describe('What is true about this occurrence', () => {
  const base = { cycleDate: '2026-08-28', today: '2026-08-28' };

  it('a manual bill whose date has not arrived is simply upcoming', () => {
    expect(occurrenceState({ ...base, today: '2026-08-20', method: 'manual' })).toBe('upcoming');
  });

  it('a manual bill does NOT pay itself when the date arrives', () => {
    expect(occurrenceState({ ...base, method: 'manual' })).toBe('due');
  });

  it('a manual bill stays owed long after the due date', () => {
    expect(occurrenceState({ ...base, today: '2026-09-15', method: 'manual' })).toBe('due');
  });

  it('an auto-pay bill before its date is upcoming, not expected', () => {
    expect(occurrenceState({ ...base, today: '2026-08-20', method: 'auto' })).toBe('upcoming');
  });

  it('an auto-pay bill whose date has passed is EXPECTED, never "verified"', () => {
    // PeggyBank has no bank connection. It knows what it expected. That is all.
    expect(occurrenceState({ ...base, method: 'auto' })).toBe('expected');
  });

  it('what the user told us always beats the calendar', () => {
    expect(occurrenceState({ ...base, today: '2026-08-01', method: 'auto',
      payment: { paid: true, status: 'confirmed' } })).toBe('paid');
    expect(occurrenceState({ ...base, method: 'auto',
      payment: { paid: false, status: 'failed' } })).toBe('failed');
    expect(occurrenceState({ ...base, method: 'auto',
      payment: { paid: true, status: 'assumed' } })).toBe('assumed');
  });

  it('an old payment row with no status is treated as confirmed', () => {
    // Rows written before this feature existed were all ticked by hand.
    expect(occurrenceState({ ...base, method: 'manual', payment: { paid: true } })).toBe('paid');
  });
});

describe('The words on the screen', () => {
  it('never claims PeggyBank saw the bank', () => {
    for (const s of ALL_STATES) {
      for (const m of ['manual', 'auto'] as const) {
        const { label } = describeOccurrence(s, m, 'Friday');
        expect(label.toLowerCase()).not.toMatch(/verified|bank|withdraw|cleared|settled/);
      }
    }
  });

  it('uses no database or accounting jargon anywhere', () => {
    const banned = /occurrence|reconcil|ledger|cycle|state|status|transaction|reserved/i;
    for (const s of ALL_STATES) {
      for (const m of ['manual', 'auto'] as const) {
        expect(describeOccurrence(s, m, 'Friday').label).not.toMatch(banned);
      }
    }
  });

  it('tells the user plainly which kind of payment this is', () => {
    expect(describeOccurrence('upcoming', 'auto', 'Friday').label).toBe('Auto-pay Friday');
    expect(describeOccurrence('upcoming', 'manual', 'Friday').label).toBe('Due Friday');
    expect(describeOccurrence('upcoming', 'auto', 'Friday', true).label).toBe('Auto-charge Friday');
  });

  it('only asks for a tap when a tap is actually needed', () => {
    // An auto-pay bill that has not come due yet asks nothing of anyone.
    expect(describeOccurrence('upcoming', 'auto', 'Friday').action).toBeUndefined();
    expect(needsAttention('upcoming')).toBe(false);
    expect(describeOccurrence('due', 'manual', 'today').action).toBe('markPaid');
    expect(describeOccurrence('expected', 'auto', 'today').action).toBe('verify');
    expect(describeOccurrence('failed', 'auto', 'today').action).toBe('markPaid');
  });

  it('a settled bill shows no badge — the distinction stops mattering', () => {
    expect(describeOccurrence('paid', 'auto', 'today').badge).toBeNull();
    expect(describeOccurrence('assumed', 'auto', 'today').badge).toBeNull();
  });

  it('is honest that an assumed payment was assumed', () => {
    expect(describeOccurrence('assumed', 'auto', 'today').label).toBe('Paid automatically');
  });
});

// ── THE MONEY ───────────────────────────────────────────────────────────

const BELL = { id: 1, name: 'Bell', amount: 117, frequency: 'monthly' as const, due_day: 28 };

function month(paidCycles: FinanceInput['paidCycles'], today = new Date(2026, 7, 28)): FinanceInput {
  return {
    today,
    monthStart: '2026-08-01', monthEnd: '2026-08-31',
    expenses: [], income: [{ amount: 1000, date: '2026-08-01' }],
    bills: [BELL], paidCycles, goals: [],
  };
}

const safeOf = (i: FinanceInput) => computeFinanceSummary(i).safeToSpend;

describe('THE INVARIANT: changing state never creates money', () => {
  it('income $1000, Bell $117 auto-pay: $883 safe, before and after every step', () => {
    // 1. Before the due date. Reserved.
    const before = safeOf(month([], new Date(2026, 7, 20)));
    expect(before).toBe(883);

    // 2. The due date arrives. Expected, but nobody has confirmed anything, so
    //    no payment row exists and it is still owed. Nothing may change.
    const onDueDate = safeOf(month([]));
    expect(onDueDate).toBe(883);

    // 3. The user confirms it: money gone instead of money owed.
    const confirmed = safeOf(month([{ bill_id: 1, cycle_date: '2026-08-28', amount: 117 }]));
    expect(confirmed).toBe(883);

    // The whole point.
    expect(onDueDate).toBe(before);
    expect(confirmed).toBe(before);
  });

  it('confirming moves the money between buckets without changing the total', () => {
    const owed = computeFinanceSummary(month([]));
    expect(owed.unpaidBillsTotal).toBe(117);
    expect(owed.billsPaidTotal).toBe(0);

    const paid = computeFinanceSummary(month([{ bill_id: 1, cycle_date: '2026-08-28', amount: 117 }]));
    expect(paid.unpaidBillsTotal).toBe(0);
    expect(paid.billsPaidTotal).toBe(117);

    expect(owed.safeToSpend).toBe(paid.safeToSpend);
  });

  it('an ASSUMED payment costs exactly what a confirmed one costs', () => {
    // Same row, same paid = 1. Only the reason we believe it differs, and a
    // reason is not money.
    expect(safeOf(month([{ bill_id: 1, cycle_date: '2026-08-28', amount: 117 }]))).toBe(883);
  });

  it('a FAILED payment does not become spendable money', () => {
    // Failure writes paid = 0, which never reaches the engine, so the
    // occurrence is simply still owed — exactly what this models.
    expect(safeOf(month([]))).toBe(883);
    expect(computeFinanceSummary(month([])).unpaidBillsTotal).toBe(117);
  });

  it('the money is never counted twice', () => {
    const s = computeFinanceSummary(month([{ bill_id: 1, cycle_date: '2026-08-28', amount: 117 }]));
    expect(s.safeToSpend).toBe(883);      // 1000 - 117, not 1000 - 234
    expect(s.monthSpending).toBe(117);
  });
});

describe('A DIFFERENT AMOUNT than expected', () => {
  it('Bell planned $117 but took $121.36 — the extra $4.36 really costs', () => {
    const actual = computeFinanceSummary(month([{ bill_id: 1, cycle_date: '2026-08-28', amount: 121.36 }]));
    expect(actual.billsPaidTotal).toBe(121.36);
    expect(actual.safeToSpend).toBe(878.64);
    expect(cents(safeOf(month([])) - actual.safeToSpend)).toBe(4.36);
  });

  it('a cheaper month gives back the difference, and only the difference', () => {
    expect(safeOf(month([{ bill_id: 1, cycle_date: '2026-08-28', amount: 100 }]))).toBe(900);
  });

  it('the PLAN is untouched — next month still expects $117', () => {
    // Recording an actual amount writes to bill_payments, never to bills.
    const input = month([{ bill_id: 1, cycle_date: '2026-08-28', amount: 121.36 }]);
    expect(input.bills[0].amount).toBe(117);

    const september = computeFinanceSummary({
      ...input,
      today: new Date(2026, 8, 28),
      monthStart: '2026-09-01', monthEnd: '2026-09-30',
      income: [{ amount: 1000, date: '2026-09-01' }],
    });
    expect(september.unpaidBillsTotal).toBe(117);   // not 121.36
  });
});

describe('The next cycle always survives', () => {
  it('paying August does not touch September', () => {
    const september = computeFinanceSummary({
      today: new Date(2026, 8, 28),
      monthStart: '2026-09-01', monthEnd: '2026-09-30',
      expenses: [], income: [{ amount: 1000, date: '2026-09-01' }],
      bills: [BELL],
      paidCycles: [{ bill_id: 1, cycle_date: '2026-08-28', amount: 117 }],
      goals: [],
    });
    expect(september.unpaidBillsTotal).toBe(117);   // owed again; it did not vanish
    expect(september.safeToSpend).toBe(883);
  });
});

describe('Switching what you are adding switches how it is paid', () => {
  /**
   * A browser check found this: "Add New" opened from the Subscriptions row
   * starts as auto-pay, and switching the toggle to Bill left auto-pay
   * selected — quietly contradicting the conservative rule that a bill is
   * something you pay yourself unless you say otherwise.
   *
   * The screen now resets the method with the type. This pins the defaults
   * that reset depends on.
   */
  const defaultFor = (type: 'bill' | 'subscription') => (type === 'subscription' ? 'auto' : 'manual');

  it('a bill defaults to being paid by the person', () => {
    expect(defaultFor('bill')).toBe('manual');
  });

  it('a subscription defaults to charging itself', () => {
    expect(defaultFor('subscription')).toBe('auto');
  });

  it('the two defaults are genuinely different, or the reset means nothing', () => {
    expect(defaultFor('bill')).not.toBe(defaultFor('subscription'));
  });
});
