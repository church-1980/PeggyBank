/**
 * A CALENDAR HAS TO WORK BEFORE IT IS READ.
 *
 * On a real phone the previous version failed: every fact was present, in 8px
 * grey, and you had to hunt for it. Outdoors, at a glance, that is the same as
 * showing nothing.
 *
 * The day cell now carries the meaning as a shape — quiet days recede, days
 * that cost money stand out — and the words explain it. These prove the shape
 * is derived from the facts rather than guessed, and that colour is never the
 * only thing saying so.
 */

import { isMoneyIn, cellTreatment, cellHeadline, MAX_BANDS, type ActivityTone } from '../core/calendarVisual';
import type { CalendarEntry } from '../core/calendarMonth';

const e = (kind: CalendarEntry['kind']) => ({ kind });
const money = (n: number) => '$' + n.toFixed(2);

const full = (over: Partial<CalendarEntry> = {}): CalendarEntry => ({
  key: 'k', kind: 'bill', label: 'Bell', amount: 117,
  state: 'due', rank: 2, ...over,
});

describe('A quiet day stays quiet', () => {
  it('nothing scheduled means no treatment at all', () => {
    const t = cellTreatment([]);
    expect(t.quiet).toBe(true);
    expect(t.bands).toEqual([]);
    expect(t.crowded).toBe(false);
  });
});

describe('One kind of activity tints the whole day', () => {
  const cases: [CalendarEntry['kind'], ActivityTone][] = [
    ['payday', 'payday'], ['income', 'payday'],
    ['bill', 'bill'], ['subscription', 'subscription'],
    ['expense', 'spending'], ['goal', 'goal'],
  ];
  for (const [kind, tone] of cases) {
    it(kind + ' reads as ' + tone, () => {
      const t = cellTreatment([e(kind)]);
      expect(t.bands).toEqual([tone]);
      expect(t.quiet).toBe(false);
    });
  }

  it('money in is one idea, whether scheduled or received', () => {
    // A projected payday and a received paycheque are the same colour; the
    // difference is a word, not a hue.
    expect(cellTreatment([e('payday'), e('income')]).bands).toEqual(['payday']);
  });

  it('three coffees are still just spending', () => {
    expect(cellTreatment([e('expense'), e('expense'), e('expense')]).bands).toEqual(['spending']);
  });
});

describe('Several kinds on one day show the combination', () => {
  it('payday and a bill show both', () => {
    expect(cellTreatment([e('bill'), e('payday')]).bands).toEqual(['payday', 'bill']);
  });

  it('money in always leads, whatever order it arrived in', () => {
    // A busy Friday should not read as a bad day because an expense sorted
    // first in the database.
    expect(cellTreatment([e('expense'), e('payday')]).bands[0]).toBe('payday');
    expect(cellTreatment([e('payday'), e('expense')]).bands[0]).toBe('payday');
  });

  it('a scheduled obligation outranks a cup of coffee', () => {
    expect(cellTreatment([e('expense'), e('bill')]).bands).toEqual(['bill', 'spending']);
  });

  it('bill and subscription are distinguishable', () => {
    expect(cellTreatment([e('subscription'), e('bill')]).bands).toEqual(['bill', 'subscription']);
  });
});

describe('A crowded day does not become confetti', () => {
  it('never paints more than three bands', () => {
    const everything = [e('payday'), e('bill'), e('subscription'), e('expense'), e('goal')];
    const t = cellTreatment(everything);
    expect(t.bands.length).toBe(MAX_BANDS);
    expect(t.crowded).toBe(true);
  });

  it('and the three it paints are the three that matter most', () => {
    const t = cellTreatment([e('goal'), e('expense'), e('subscription'), e('bill'), e('payday')]);
    expect(t.bands).toEqual(['payday', 'bill', 'subscription']);
  });

  it('exactly three is not crowded', () => {
    const t = cellTreatment([e('payday'), e('bill'), e('subscription')]);
    expect(t.bands.length).toBe(3);
    expect(t.crowded).toBe(false);
  });

  it('the full list is still available even when the bands are capped', () => {
    // The cell paints three; the day view can still say there were five.
    const t = cellTreatment([e('payday'), e('bill'), e('subscription'), e('expense'), e('goal')]);
    expect(t.tones.length).toBe(5);
  });
});

describe('Colour is never the only thing saying it', () => {
  it('a due bill still says what it is, what it costs and its state', () => {
    const { name, detail } = cellHeadline(full(), money);
    expect(name).toBe('Bell');
    expect(detail).toBe('$117.00 · Due');
  });

  it('an auto-pay bill says Auto', () => {
    expect(cellHeadline(full({ state: 'auto' }), money).detail).toBe('$117.00 · Auto');
  });

  it('a settled bill shows the word, NOT the amount', () => {
    // The amount beside "Paid early" reads as money still owed.
    expect(cellHeadline(full({ state: 'paidEarly', amount: undefined }), money))
      .toEqual({ name: 'Bell', detail: 'Paid early' });
    expect(cellHeadline(full({ state: 'paid' }), money).detail).toBe('Paid');
  });

  it('a payday says how much came in', () => {
    const { name, detail } = cellHeadline(
      full({ kind: 'payday', label: 'Paycheck', amount: 1250, state: 'expected' }), money);
    expect(name).toBe('Paycheck');
    expect(detail).toBe('$1250.00');
  });

  it('every treated day has words, not just a colour', () => {
    for (const kind of ['payday', 'bill', 'subscription', 'expense'] as const) {
      const { name } = cellHeadline(full({ kind, label: 'Something' }), money);
      expect(name.length).toBeGreaterThan(0);
    }
  });
});

describe('which way the money moves', () => {
  it('a payday and an income are the only money coming in', () => {
    expect(isMoneyIn('payday')).toBe(true);
    expect(isMoneyIn('income')).toBe(true);
  });

  it('a bill, a subscription, an expense and a goal are all money going out', () => {
    for (const kind of ['bill', 'subscription', 'expense', 'goal'] as const) {
      expect(isMoneyIn(kind)).toBe(false);
    }
  });

  it('an event with no kind is never shown as money coming in', () => {
    expect(isMoneyIn(undefined)).toBe(false);
  });
});
