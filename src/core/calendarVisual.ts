import type { CalendarEntry, EntryKind } from './calendarMonth';

/**
 * WHAT A DAY LOOKS LIKE BEFORE ANYONE READS IT.
 *
 * On a real phone, outdoors, at a glance, the previous Calendar failed: the
 * information was all there in 8px grey and you had to hunt for it. A calendar
 * has to work as a SHAPE first — quiet days recede, days that cost money stand
 * out — and only then as text.
 *
 * So the day cell itself carries the meaning, and the words explain it. Colour
 * is never the only channel: every treated cell still says what it is.
 *
 * PURE. No React, no colours. It returns which KINDS a day holds, in priority
 * order; the screen maps those to the palette it already owns. Keeping the
 * palette out means this can be tested without a theme, and the design system
 * stays the only place that decides what green is.
 */

/** The kinds a day can be tinted by, most important first. */
export type ActivityTone = 'payday' | 'bill' | 'subscription' | 'spending' | 'goal' | 'reminder';

const TONE_OF: Record<EntryKind, ActivityTone> = {
  payday: 'payday',
  income: 'payday',          // money in reads as one idea
  bill: 'bill',
  subscription: 'subscription',
  expense: 'spending',
  goal: 'goal',
};

/**
 * Priority when a day holds several kinds.
 *
 * Money arriving outranks money leaving, and a scheduled obligation outranks a
 * cup of coffee — so a payday is never hidden behind an expense, and a busy
 * day still leads with the thing worth knowing.
 */
const PRIORITY: ActivityTone[] = ['payday', 'bill', 'subscription', 'spending', 'goal', 'reminder'];

export interface CellTreatment {
  /** Distinct kinds present, in priority order. Empty means a quiet day. */
  tones: ActivityTone[];
  /** How many bands the cell should paint. Never more than three. */
  bands: ActivityTone[];
  /** True when more kinds exist than bands shown. */
  crowded: boolean;
  /** Nothing at all happened. The cell should stay calm. */
  quiet: boolean;
}

/**
 * At most this many colour bands. Beyond three a cell stops reading as "busy"
 * and starts reading as confetti, which is worse than a plain square.
 */
export const MAX_BANDS = 3;

export function cellTreatment(entries: Pick<CalendarEntry, 'kind'>[]): CellTreatment {
  const present = new Set<ActivityTone>();
  for (const e of entries) {
    const tone = TONE_OF[e.kind];
    if (tone) present.add(tone);
  }

  const tones = PRIORITY.filter(t => present.has(t));
  return {
    tones,
    bands: tones.slice(0, MAX_BANDS),
    crowded: tones.length > MAX_BANDS,
    quiet: tones.length === 0,
  };
}

/**
 * The one line a cell leads with.
 *
 * "Bell · $117 · Due" is more use than two truncated names stacked in grey.
 * The date is already the largest thing in the cell, so this is what it is,
 * then what it costs, then what state it is in — dropped in that order as the
 * space runs out.
 */
export function cellHeadline(entry: CalendarEntry, money: (n: number) => string): {
  name: string; detail?: string;
} {
  const state = entry.state === 'paidEarly' ? 'Paid early'
    : entry.state === 'paidLate' ? 'Paid late'
    : entry.state === 'paid' ? 'Paid'
    : entry.state === 'auto' ? 'Auto'
    : entry.state === 'due' ? 'Due'
    : undefined;

  // A settled bill's amount would read as money still owed, so the word alone
  // is the honest thing to show.
  if (state && state.startsWith('Paid')) return { name: entry.label, detail: state };

  const parts = [
    entry.amount != null ? money(entry.amount) : null,
    state,
  ].filter(Boolean) as string[];

  return { name: entry.label, detail: parts.length ? parts.join(' · ') : undefined };
}

/**
 * Which way the money moves. A payday or an income is the only money coming
 * IN — a bill, a subscription, an expense and a goal contribution all go OUT.
 * Derived from the same tone table the day cells tint from, so a row's sign
 * and its colour can never disagree.
 */
export function isMoneyIn(kind: EntryKind | undefined): boolean {
  return kind !== undefined && TONE_OF[kind] === 'payday';
}
