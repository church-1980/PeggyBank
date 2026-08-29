/**
 * "OH. THAT'S WHERE MY MONEY WENT."
 *
 * The donut on Monthly Breakdown has exactly one job, and one way to fail at
 * it. If the slices add up to $694 while the "Money out" printed directly
 * above them says $781, the chart has quietly taught the person that this
 * app's numbers are decoration. Nothing crashes. They just stop believing it.
 *
 * So the first and largest group here is arithmetic, not aesthetics:
 *
 *     SUM(slice dollars) === Money out, exactly, in every shape of month.
 */

import {
  buildSegments, withPercents, donutCentre, MAX_SLICES, ELSE_KEY, BILLS_KEY,
  type ChartInput, type ChartSegment,
} from '../core/spendingChart';
import { cents } from '../core/finance';

const META: Record<string, { label: string; color: string }> = {
  groceries:  { label: 'Groceries',  color: '#52C9B8' },
  restaurant: { label: 'Restaurant', color: '#E87070' },
  gas:        { label: 'Gas',        color: '#F5A662' },
  shopping:   { label: 'Shopping',   color: '#F57FA0' },
  fun:        { label: 'Fun',        color: '#FFD166' },
  pets:       { label: 'Pets',       color: '#F5A662' },
  health:     { label: 'Health',     color: '#98D8C8' },
  kids:       { label: 'Kids',       color: '#A8D8EA' },
  travel:     { label: 'Travel',     color: '#7C6EFA' },
  other:      { label: 'Other',      color: '#8B8FA8' },
};

function chart(over: Partial<ChartInput> = {}): ChartSegment[] {
  return buildSegments({
    moneyOut: 0, billsPaid: 0, categories: [],
    meta: (k) => META[k] ?? { label: k, color: '#000' },
    billsColor: '#FF6B6B', otherColor: '#8B8FA8',
    ...over,
  });
}

const sumOf = (segs: ChartSegment[]) => cents(segs.reduce((s, x) => s + x.amount, 0));

describe('THE INVARIANT: the slices always add up to Money out', () => {
  it('bills and several categories', () => {
    const segs = chart({
      moneyOut: 781.78, billsPaid: 351.10,
      categories: [
        { category: 'groceries', total: 195.65 },
        { category: 'restaurant', total: 117.27 },
        { category: 'gas', total: 78.18 },
        { category: 'shopping', total: 39.58 },
      ],
    });
    expect(sumOf(segs)).toBe(781.78);
  });

  it('bills only — the month my phone actually showed', () => {
    // Everyday spending $0.00, bills paid $781.78. A real, valid month.
    const segs = chart({ moneyOut: 781.78, billsPaid: 781.78, categories: [] });
    expect(sumOf(segs)).toBe(781.78);
    expect(segs.length).toBe(1);
    expect(segs[0].key).toBe(BILLS_KEY);
    expect(segs[0].percent).toBe(100);
    // No invented categories just to make the ring colourful.
    expect(segs.some(s => s.key === ELSE_KEY)).toBe(false);
  });

  it('everyday spending only, no bills paid', () => {
    const segs = chart({
      moneyOut: 300, billsPaid: 0,
      categories: [{ category: 'groceries', total: 200 }, { category: 'fun', total: 100 }],
    });
    expect(sumOf(segs)).toBe(300);
    expect(segs.some(s => s.key === BILLS_KEY)).toBe(false);
  });

  it('one category and nothing else', () => {
    const segs = chart({ moneyOut: 45.5, categories: [{ category: 'groceries', total: 45.5 }] });
    expect(sumOf(segs)).toBe(45.5);
    expect(segs.length).toBe(1);
    expect(segs[0].percent).toBe(100);
  });

  it('still reconciles when small categories are grouped away', () => {
    const segs = chart({
      moneyOut: 1000, billsPaid: 500,
      categories: [
        { category: 'groceries', total: 300 }, { category: 'restaurant', total: 100 },
        { category: 'gas', total: 40 },  { category: 'shopping', total: 25 },
        { category: 'fun', total: 15 },  { category: 'pets', total: 10 },
        { category: 'health', total: 5 }, { category: 'kids', total: 3 },
        { category: 'travel', total: 2 },
      ],
    });
    expect(sumOf(segs)).toBe(1000);     // nothing lost to grouping
  });

  it('absorbs a sub-cent difference rather than showing a wrong total', () => {
    // The engine's total and the per-category totals can round a hair apart.
    // The chart bends; the authoritative total never does.
    const segs = chart({
      moneyOut: 100.00, billsPaid: 0,
      categories: [{ category: 'groceries', total: 33.33 }, { category: 'fun', total: 33.33 }, { category: 'gas', total: 33.33 }],
    });
    expect(sumOf(segs)).toBe(100.00);
  });
});

describe('Percentages that survive being added up', () => {
  it('always total exactly 100', () => {
    // Three equal thirds is the classic case that naively rounds to 99.
    const segs = chart({
      moneyOut: 300,
      categories: [{ category: 'groceries', total: 100 }, { category: 'fun', total: 100 }, { category: 'gas', total: 100 }],
    });
    expect(segs.reduce((s, x) => s + x.percent, 0)).toBe(100);
  });

  it('totals 100 across many awkward shares', () => {
    const shapes: number[][] = [
      [1, 1, 1], [1, 1, 1, 1, 1, 1], [7, 3], [1, 2, 3, 4, 5],
      [99, 1], [50, 25, 12, 7, 6], [1, 1, 97], [33, 33, 34],
    ];
    for (const shape of shapes) {
      const total = shape.reduce((a, b) => a + b, 0);
      const segs = withPercents(
        shape.map((amount, i) => ({ key: 'k' + i, label: 'L', color: '#000', amount, percent: 0 })),
        total);
      expect(segs.reduce((s, x) => s + x.percent, 0)).toBe(100);
    }
  });

  it('gives the spare points to the slices rounded down hardest', () => {
    // 100/3 each: every share is 33.33, so all three want the same rounding up.
    // Two get it, deterministically, and the total is still 100.
    const segs = withPercents([
      { key: 'a', label: 'A', color: '#000', amount: 100, percent: 0 },
      { key: 'b', label: 'B', color: '#000', amount: 100, percent: 0 },
      { key: 'c', label: 'C', color: '#000', amount: 100, percent: 0 },
    ], 300);
    expect(segs.map(s => s.percent).sort()).toEqual([33, 33, 34]);
  });

  it('never rewrites a dollar amount to make a percentage tidy', () => {
    const segs = chart({
      moneyOut: 300,
      categories: [{ category: 'groceries', total: 100 }, { category: 'fun', total: 100 }, { category: 'gas', total: 100 }],
    });
    for (const s of segs) expect(s.amount).toBe(100);
  });

  it('is deterministic — the same month gives the same chart twice', () => {
    const input = {
      moneyOut: 500, billsPaid: 200,
      categories: [{ category: 'groceries', total: 150 }, { category: 'fun', total: 150 }],
    };
    expect(chart(input)).toEqual(chart(input));
  });
});

describe('Not too many slices, and nothing meaningful hidden', () => {
  const many = {
    moneyOut: 1000, billsPaid: 500,
    categories: [
      { category: 'groceries', total: 150 }, { category: 'restaurant', total: 120 },
      { category: 'gas', total: 90 },  { category: 'shopping', total: 60 },
      { category: 'fun', total: 40 },  { category: 'pets', total: 20 },
      { category: 'health', total: 10 }, { category: 'kids', total: 6 },
      { category: 'travel', total: 4 },
    ],
  };

  it('never draws more than the readable maximum, plus the grouped slice', () => {
    const segs = chart(many);
    expect(segs.length).toBeLessThanOrEqual(MAX_SLICES + 1);
  });

  it('groups the small ones into one honest slice', () => {
    const segs = chart(many);
    const rest = segs.find(s => s.key === ELSE_KEY);
    expect(rest).toBeDefined();
    expect(rest!.label).toBe('Everything else');
    expect(rest!.amount).toBeGreaterThan(0);
  });

  it('keeps the biggest categories individually — that is the whole point', () => {
    const keys = chart(many).map(s => s.key);
    expect(keys).toContain(BILLS_KEY);
    expect(keys).toContain('groceries');
    expect(keys).toContain('restaurant');
  });

  it('does NOT hide a lone leftover behind "Everything else"', () => {
    // "Everything else: $4.20" tells the person strictly less than "Pets: $4.20".
    const segs = chart({
      moneyOut: 1000, billsPaid: 500,
      categories: [
        { category: 'groceries', total: 200 }, { category: 'restaurant', total: 150 },
        { category: 'gas', total: 100 }, { category: 'shopping', total: 46 },
        { category: 'pets', total: 4 },
      ],
    });
    expect(segs.some(s => s.key === ELSE_KEY)).toBe(false);
    const pets = segs.find(s => s.key === 'pets');
    expect(pets).toBeDefined();
    expect(pets!.amount).toBe(4);
  });

  it('shows a handful of categories untouched', () => {
    const segs = chart({
      moneyOut: 300, billsPaid: 100,
      categories: [{ category: 'groceries', total: 120 }, { category: 'fun', total: 80 }],
    });
    expect(segs.length).toBe(3);
    expect(segs.some(s => s.key === ELSE_KEY)).toBe(false);
  });

  it('biggest first, so the eye lands on what matters', () => {
    const segs = chart(many);
    const amounts = segs.filter(s => s.key !== ELSE_KEY).map(s => s.amount);
    expect([...amounts].sort((a, b) => b - a)).toEqual(amounts);
  });
});

describe('Months with nothing in them', () => {
  it('a zero month draws no chart at all, rather than an empty ring', () => {
    expect(chart({ moneyOut: 0 })).toEqual([]);
  });

  it('a negative or nonsense total is not drawn either', () => {
    expect(chart({ moneyOut: -50, billsPaid: 10 })).toEqual([]);
  });

  it('categories with zero in them are left out', () => {
    const segs = chart({
      moneyOut: 100,
      categories: [{ category: 'groceries', total: 100 }, { category: 'fun', total: 0 }],
    });
    expect(segs.length).toBe(1);
  });
});

describe('The middle of the donut', () => {
  it('is one number, and it is the money out', () => {
    const c = donutCentre(781.78);
    expect(c.amount).toBe(781.78);
    expect(c.label).toBe('Total out');
    expect(Object.keys(c).length).toBe(2);      // never a dashboard
  });
});
