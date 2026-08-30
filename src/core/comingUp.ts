import { occurrenceState, describeOccurrence, type PaymentMethod } from './paymentState';

/**
 * WHAT'S HAPPENING NEXT?
 *
 * Coming Up used to answer half the question. It listed the bills a person
 * owes and said nothing about the money arriving to pay them — so the screen
 * knew payday existed (income schedules have always been in the database) and
 * simply never mentioned it.
 *
 * THIS IS NOT A FORECASTING ENGINE.
 *
 * It works nothing out. It is handed occurrences the existing schedule logic
 * already produced and arranges them by day. Every amount comes from a record
 * that already exists; nothing here projects, estimates or predicts. If a
 * number cannot come from the canonical engine, it does not appear.
 */

export type UpcomingKind = 'income' | 'bill' | 'subscription';

export interface UpcomingItem {
  key: string;
  kind: UpcomingKind;
  /** What the person calls it: "Paycheck", "Bell", "Netflix". */
  name: string;
  /** Always positive. `kind` says which way it goes. */
  amount: number;
  /** Local YYYY-MM-DD. */
  date: string;
  /** For a bill: is it theirs to pay, or does it happen on its own? */
  method?: PaymentMethod;
}

export interface UpcomingDay {
  date: string;
  items: UpcomingItem[];
}

/**
 * Group what is coming into days, soonest first.
 *
 * Money in is listed before money out within a day. Someone glancing at
 * "Friday" wants to see the paycheque arrive before the bills that eat it —
 * showing the outgoings first reads as a worse day than it is.
 */
export function groupUpcoming(items: UpcomingItem[], limitDays = 3): UpcomingDay[] {
  const byDate = new Map<string, UpcomingItem[]>();
  for (const it of items) {
    if (!byDate.has(it.date)) byDate.set(it.date, []);
    byDate.get(it.date)!.push(it);
  }

  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(0, limitDays)
    .map(([date, list]) => ({
      date,
      items: list.sort((a, b) => {
        if (a.kind === 'income' && b.kind !== 'income') return -1;
        if (b.kind === 'income' && a.kind !== 'income') return 1;
        return b.amount - a.amount;
      }),
    }));
}

/**
 * The one line under an item's name.
 *
 * Income says when it arrives. A bill says whether it is the person's job or
 * the bank's — the distinction the auto-pay work exists for, in the same words
 * the Bills screen uses, from the same function.
 */
export function describeUpcoming(item: UpcomingItem, when: string, today: string): string {
  if (item.kind === 'income') return 'Payday ' + when;

  const method: PaymentMethod = item.method ?? 'manual';
  const state = occurrenceState({ method, cycleDate: item.date, today, payment: null });
  return describeOccurrence(state, method, when, item.kind === 'subscription').label;
}
