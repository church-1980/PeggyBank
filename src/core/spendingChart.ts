/**
 * WHERE THE MONEY WENT.
 *
 * One job: take the month the finance engine already worked out and cut it
 * into pieces a person can look at for two seconds and understand.
 *
 * THE RULE THAT MAKES IT HONEST
 * -----------------------------
 * The pieces must add up to the SAME "Money out" the screen prints above the
 * chart. A chart that says $694 next to a total that says $781 is worse than
 * no chart: it quietly teaches the person that the app's numbers are decorative.
 *
 * So this file NEVER adds money up itself. It is handed the authoritative
 * total and the authoritative category rows, and it only decides how to slice
 * and label them. Any sub-cent residual is folded into the largest slice so the
 * dollars reconcile exactly — the total is never adjusted to suit the chart.
 */

import { cents } from './finance';

export interface ChartSegment {
  /** Category key, or 'bills' / 'everything-else' for the two synthetic slices. */
  key: string;
  label: string;
  color: string;
  amount: number;
  /** Whole percent. These are chosen so the displayed values total exactly 100. */
  percent: number;
}

export interface ChartInput {
  /** The authoritative "Money out" for the month. The slices must total this. */
  moneyOut: number;
  /** Bills and subscriptions actually paid, from the finance engine. */
  billsPaid: number;
  /** Everyday spending per category, already summed by the engine. */
  categories: { category: string; total: number }[];
  /** Label and colour for a category key. Supplied so this file owns no palette. */
  meta: (key: string) => { label: string; color: string };
  billsColor: string;
  otherColor: string;
}

/**
 * At most this many slices. Beyond six a donut stops being readable at a glance
 * and becomes a puzzle, which is the opposite of the point.
 */
export const MAX_SLICES = 6;

/** Slices smaller than this are candidates for grouping, not automatically hidden. */
export const MIN_SHARE = 0.03;

export const ELSE_KEY = 'everything-else';
export const BILLS_KEY = 'bills-paid';

/**
 * Build the slices.
 *
 * Grouping is deterministic and stated plainly: biggest first, keep the ones
 * worth seeing, and gather the remainder into one honest "Everything else".
 * A single leftover is never hidden behind that label — if only one slice
 * would be grouped, it keeps its own name, because "Everything else: $4.20"
 * tells the person strictly less than "Pets: $4.20".
 */
export function buildSegments(input: ChartInput): ChartSegment[] {
  const total = cents(input.moneyOut);
  if (total <= 0) return [];

  const raw: { key: string; label: string; color: string; amount: number }[] = [];

  if (input.billsPaid > 0) {
    raw.push({ key: BILLS_KEY, label: 'Bills paid', color: input.billsColor, amount: cents(input.billsPaid) });
  }
  for (const c of input.categories) {
    const amount = cents(c.total);
    if (amount <= 0) continue;
    const m = input.meta(c.category);
    raw.push({ key: c.category, label: m.label, color: m.color, amount });
  }

  raw.sort((a, b) => b.amount - a.amount || a.key.localeCompare(b.key));

  // Fold any sub-cent difference into the biggest slice so the slices always
  // add up to the authoritative total. Never the other way round.
  const summed = cents(raw.reduce((s, r) => s + r.amount, 0));
  if (raw.length && summed !== total) raw[0].amount = cents(raw[0].amount + (total - summed));

  // Which slices are worth their own colour?
  let keep = raw.filter(r => r.amount / total >= MIN_SHARE);
  if (keep.length > MAX_SLICES) keep = raw.slice(0, MAX_SLICES);
  if (keep.length === 0) keep = raw.slice(0, 1);          // everything is tiny: show the biggest

  let rest = raw.filter(r => !keep.includes(r));

  // One leftover keeps its own name. Grouping it would tell the person less.
  if (rest.length === 1) { keep = [...keep, rest[0]]; rest = []; }

  const segments = keep.map(k => ({ ...k, percent: 0 }));
  if (rest.length) {
    segments.push({
      key: ELSE_KEY,
      label: 'Everything else',
      color: input.otherColor,
      amount: cents(rest.reduce((s, r) => s + r.amount, 0)),
      percent: 0,
    });
  }

  return withPercents(segments, total);
}

/**
 * Whole-number percentages that add up to 100.
 *
 * Rounding each share on its own gives totals like 99% or 101%, which reads as
 * a bug to anyone who adds the column up. The largest-remainder method hands
 * the spare points to the slices that were rounded down hardest, so the column
 * always totals 100 and the biggest slice is never the one that looks wrong.
 *
 * Dollar amounts are untouched by any of this.
 */
export function withPercents(segments: ChartSegment[], total: number): ChartSegment[] {
  if (!segments.length || total <= 0) return segments;

  const exact = segments.map(s => (s.amount / total) * 100);
  const floors = exact.map(Math.floor);
  let spare = 100 - floors.reduce((a, b) => a + b, 0);

  const order = exact
    .map((e, i) => ({ i, frac: e - Math.floor(e) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  const out = segments.map((s, i) => ({ ...s, percent: floors[i] }));
  for (let n = 0; n < order.length && spare > 0; n++, spare--) out[order[n].i].percent++;
  return out;
}

/** What the middle of the donut says. One number, never a dashboard. */
export function donutCentre(moneyOut: number): { amount: number; label: string } {
  return { amount: cents(moneyOut), label: 'Total out' };
}
