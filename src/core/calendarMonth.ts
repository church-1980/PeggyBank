import { dueDayInMonth, localDateString } from './datetime';
import type { PaymentMethod } from './paymentState';

/**
 * WHAT BELONGS ON EACH DAY OF A MONTH.
 *
 * The Calendar was drawing coloured dots from four tables and had no idea
 * whether any bill had been PAID — it never read bill_payments at all. So a
 * past month showed every bill as though it were still owed, and a bill paid
 * early looked unpaid right up to its due date.
 *
 * PURE. No database, no React. Callers read the rows; this decides what they
 * mean and which day they land on.
 *
 * THE TWO DATES A PAYMENT HAS
 * ---------------------------
 * A bill occurrence has a date it BELONGS TO. A payment has a date the money
 * actually MOVED. Pay September's bill on 31 August and both are true, and the
 * Calendar has to show both without implying the money left twice:
 *
 *   31 August    Bell  −$117   the money, on the day it moved
 *   28 September Bell  Paid early   the occurrence, satisfied, no amount
 *
 * The amount appears once. A calendar can never create money.
 */

export type EntryKind = 'payday' | 'income' | 'bill' | 'subscription' | 'expense' | 'goal';

export type EntryState =
  | 'due'          // owed, not yet paid
  | 'auto'         // expected to come out on its own
  | 'paid'         // settled on the day it was due
  | 'paidEarly'    // settled before its due date
  | 'paidLate'     // settled after its due date
  | 'expected'     // a payday or charge PeggyBank projects but cannot confirm
  | 'actual';      // money that really moved

export interface CalendarEntry {
  key: string;
  kind: EntryKind;
  /** Short. A calendar cell is not a sentence. */
  label: string;
  /** Undefined when showing the amount would imply the money moved twice. */
  amount?: number;
  state: EntryState;
  /** For navigation to the authoritative record. */
  source?: { table: 'expenses' | 'income' | 'bills' | 'subscriptions'; id: number };
  /** Ranking within a day. Lower shows first. */
  rank: number;
}

export interface MonthInput {
  year: number;
  /** 0-11. */
  month: number;
  /** Today, so past and future can be told apart. */
  today: string;
  bills: { id: number; name: string; amount: number; due_day?: number | null;
           frequency?: string | null; due_weekday?: number | null;
           payment_method?: string | null }[];
  subscriptions: { id: number; name: string; amount: number; billing_day: number;
                   payment_method?: string | null }[];
  /** Every payment row, whatever month it belongs to. */
  payments: { source: string; bill_id: number; cycle_date: string; paid: number;
              paid_at?: string | null; amount?: number | null; status?: string | null }[];
  /** Real money, already filtered to the month. */
  expenses: { id: number; amount: number; category?: string | null; note?: string | null; date: string }[];
  income: { id: number; amount: number; label?: string | null; date: string }[];
  /** Payday dates the income schedules produced, YYYY-MM-DD. */
  paydays: { date: string; label: string; amount: number }[];
}

/** How events are ordered within one day. Money in first — it reads better. */
const RANK: Record<EntryKind, number> = {
  payday: 0, income: 1, bill: 2, subscription: 3, goal: 4, expense: 5,
};

/**
 * The occurrence date to DISPLAY for a monthly item in this month.
 *
 * Uses the real length of the month, so a bill due on the 31st shows on 30
 * April and on 28/29 February rather than being silently moved.
 */
export function displayDay(dueDay: number, year: number, month: number): string {
  const d = dueDayInMonth(dueDay, year, month);
  return localDateString(new Date(year, month, d));
}

/**
 * The occurrence KEY for the same item — what bill_payments is filed under.
 *
 * Deliberately not the same function as displayDay. billCycles clamps to the
 * 28th so an occurrence has a stable identity in every month, which means a
 * bill due on the 31st is keyed 2026-01-28 while the calendar draws it on
 * 2026-01-31. Looking payment state up by the drawn date would never match,
 * and every bill due after the 28th would read as unpaid for ever.
 */
export function occurrenceKey(dueDay: number, year: number, month: number): string {
  const safe = Math.min(Math.max(dueDay, 1), 28);
  return localDateString(new Date(year, month, safe));
}

/** The local calendar day a payment actually happened. */
export function paymentDay(paidAt: string | null | undefined, fallback: string): string {
  if (!paidAt) return fallback;
  const d = new Date(paidAt);
  if (Number.isNaN(d.getTime())) return fallback;
  // paid_at is a UTC timestamp. Slicing it puts a late-evening payment on the
  // next day — and, at a month boundary, in the next MONTH.
  return localDateString(d);
}

/**
 * Everything that belongs on each day of one month, keyed by date.
 *
 * Recurring items are PROJECTED into the month being viewed — a bill exists in
 * March whether or not any row mentions March. Real money is only ever placed
 * on the day it happened; nothing is invented forwards.
 */
export function buildMonth(input: MonthInput): Map<string, CalendarEntry[]> {
  const { year, month, today } = input;
  const days = new Map<string, CalendarEntry[]>();
  const add = (date: string, e: CalendarEntry) => {
    if (!days.has(date)) days.set(date, []);
    days.get(date)!.push(e);
  };

  // Payments indexed the way occurrences are keyed, so a lookup can succeed.
  const paid = new Map<string, MonthInput['payments'][number]>();
  for (const p of input.payments) paid.set(p.source + '|' + p.bill_id + '|' + p.cycle_date, p);

  const recurring = (
    kind: 'bill' | 'subscription',
    id: number, name: string, amount: number, dueDay: number,
    method: PaymentMethod,
  ) => {
    const shown = displayDay(dueDay, year, month);
    const key = occurrenceKey(dueDay, year, month);
    const record = paid.get(kind + '|' + id + '|' + key);
    const table = kind === 'bill' ? 'bills' as const : 'subscriptions' as const;
    const rank = RANK[kind];

    // Nothing recorded: it is owed, or expected to come out on its own.
    if (!record || !record.paid) {
      const failed = record && record.status === 'failed';
      add(shown, {
        key: kind + '-' + id + '-' + shown,
        kind, label: name,
        amount,
        state: failed ? 'due' : (method === 'auto' && !failed ? 'auto' : 'due'),
        source: { table, id }, rank,
      });
      return;
    }

    // Settled. WHEN did the money actually move?
    const when = paymentDay(record.paid_at, key);
    const settledAmount = record.amount ?? amount;

    if (when === shown || when === key) {
      add(shown, {
        key: kind + '-' + id + '-' + shown,
        kind, label: name, amount: settledAmount,
        state: 'paid', source: { table, id }, rank,
      });
      return;
    }

    // Paid on a different day. The money goes where it moved; the occurrence
    // stays where it belongs, marked settled and carrying NO amount, so the
    // calendar never shows the same payment as money twice.
    const early = when < shown;
    if (when.slice(0, 7) === shown.slice(0, 7)) {
      add(when, {
        key: kind + '-' + id + '-paid-' + when,
        kind, label: name, amount: settledAmount,
        state: 'actual', source: { table, id }, rank,
      });
    }
    add(shown, {
      key: kind + '-' + id + '-' + shown,
      kind, label: name,
      state: early ? 'paidEarly' : 'paidLate',
      source: { table, id }, rank,
    });
  };

  for (const b of input.bills) {
    // Weekly bills recur every week rather than once a month; they are handled
    // by the caller, which owns the weekday walk.
    if (b.frequency === 'weekly') continue;
    recurring('bill', b.id, b.name, b.amount, b.due_day ?? 1,
      b.payment_method === 'auto' ? 'auto' : 'manual');
  }
  for (const s of input.subscriptions) {
    recurring('subscription', s.id, s.name, s.amount, s.billing_day,
      s.payment_method === 'manual' ? 'manual' : 'auto');
  }

  // Paydays: projected from the schedules, so they exist in months no income
  // row mentions. Marked expected — PeggyBank cannot confirm one arrived.
  for (const p of input.paydays) {
    add(p.date, {
      key: 'payday-' + p.date, kind: 'payday', label: p.label,
      amount: p.amount, state: p.date <= today ? 'actual' : 'expected', rank: RANK.payday,
    });
  }

  // Real money. Only ever on the day it happened.
  for (const i of input.income) {
    add(i.date, {
      key: 'income-' + i.id, kind: 'income', label: i.label || 'Income',
      amount: i.amount, state: 'actual',
      source: { table: 'income', id: i.id }, rank: RANK.income,
    });
  }
  for (const e of input.expenses) {
    add(e.date, {
      key: 'expense-' + e.id, kind: 'expense',
      label: (e.note && e.note.trim()) || e.category || 'Spent',
      amount: e.amount, state: 'actual',
      source: { table: 'expenses', id: e.id }, rank: RANK.expense,
    });
  }

  // Biggest money first within a rank, so a cell showing only two lines shows
  // the two that matter.
  for (const list of days.values()) {
    list.sort((a, b) => a.rank - b.rank || (b.amount ?? 0) - (a.amount ?? 0));
  }
  return days;
}

/**
 * What one cell shows.
 *
 * A month grid has room for two lines on a phone. Showing the first two and
 * counting the rest beats shrinking the type until none of it can be read.
 */
export function cellEntries(entries: CalendarEntry[], max = 2): {
  shown: CalendarEntry[]; more: number;
} {
  if (entries.length <= max) return { shown: entries, more: 0 };
  return { shown: entries.slice(0, max), more: entries.length - max };
}
