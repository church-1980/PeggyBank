/**
 * PUTTING A SPLIT RECEIPT BACK TOGETHER.
 *
 * ML Kit groups text into blocks, and on a receipt the labels and the amounts
 * are frequently two separate blocks. The flat text then reads:
 *
 *     SUBTOTAL / GST / TOTAL / 10.09 / 0.50 / 11.60
 *
 * with every label divorced from its number. A parser looking for an amount
 * beside the word TOTAL finds nothing, and the review screen says "please
 * review" for a figure that is plainly on the page.
 *
 * Each line carries a bounding box, which was being discarded.
 */

import { flattenLines, rowsFromLines, readableText } from '../lib/recognition/layout';
import { parseDocument } from '../lib/recognition/parse';

/** Two columns, as two blocks — the shape that defeats a flat read. */
const SPLIT_BLOCKS = [
  {
    text: 'SUBTOTAL\nGST 5%\nTOTAL',
    lines: [
      { text: 'SUBTOTAL', frame: { top: 300, left: 20, width: 120, height: 20 } },
      { text: 'GST 5%',   frame: { top: 330, left: 20, width: 100, height: 20 } },
      { text: 'TOTAL',    frame: { top: 360, left: 20, width: 90,  height: 20 } },
    ],
  },
  {
    text: '10.09\n0.50\n11.60',
    lines: [
      { text: '10.09', frame: { top: 302, left: 260, width: 70, height: 20 } },
      { text: '0.50',  frame: { top: 332, left: 260, width: 60, height: 20 } },
      { text: '11.60', frame: { top: 362, left: 260, width: 70, height: 20 } },
    ],
  },
  {
    text: 'TIM HORTONS #4021',
    lines: [{ text: 'TIM HORTONS #4021', frame: { top: 40, left: 20, width: 300, height: 26 } }],
  },
];

describe('Rebuilding rows from geometry', () => {
  it('finds every line across every block', () => {
    expect(flattenLines(SPLIT_BLOCKS)).toHaveLength(7);
  });

  it('rejoins a label with the amount beside it', () => {
    const rows = rowsFromLines(flattenLines(SPLIT_BLOCKS));
    expect(rows.some(r => /TOTAL\s+11\.60/.test(r))).toBe(true);
    expect(rows.some(r => /SUBTOTAL\s+10\.09/.test(r))).toBe(true);
  });

  it('reads top to bottom, so the shop name comes first', () => {
    const rows = rowsFromLines(flattenLines(SPLIT_BLOCKS));
    expect(rows[0]).toMatch(/TIM HORTONS/);
  });

  it('reads each row left to right, label before amount', () => {
    const row = rowsFromLines(flattenLines(SPLIT_BLOCKS)).find(r => /11\.60/.test(r))!;
    expect(row.indexOf('TOTAL')).toBeLessThan(row.indexOf('11.60'));
  });

  it('tolerates a slightly crooked photo', () => {
    // The amount sits 2px lower than its label, as it would in a real photo.
    const rows = rowsFromLines(flattenLines(SPLIT_BLOCKS));
    expect(rows.some(r => /GST 5%\s+0\.50/.test(r))).toBe(true);
  });

  it('does not merge two genuinely different rows', () => {
    const rows = rowsFromLines(flattenLines(SPLIT_BLOCKS));
    expect(rows.some(r => /10\.09/.test(r) && /11\.60/.test(r))).toBe(false);
  });

  it('falls back to the flat text when there is no geometry', () => {
    const flat = 'A\nB\nC';
    expect(readableText([], flat)).toBe(flat);
    expect(readableText(undefined, flat)).toBe(flat);
  });

  it('keeps text that carries no box rather than dropping it', () => {
    const rows = rowsFromLines([
      { text: 'WITH BOX', frame: { top: 10, left: 0, width: 50, height: 10 } },
      { text: 'ALSO BOXED', frame: { top: 40, left: 0, width: 50, height: 10 } },
      { text: 'NO BOX AT ALL' },
    ]);
    expect(rows.join(' ')).toContain('NO BOX AT ALL');
  });
});

describe('THE PAYOFF: a split receipt becomes readable', () => {
  it('the total is found once the columns are rejoined', () => {
    const text = readableText(SPLIT_BLOCKS, SPLIT_BLOCKS.map(b => b.text).join('\n'));
    const r = parseDocument(text);
    expect(r.amount).toBe(11.60);
    expect(r.confidence.amount).toBe('high');
    expect(r.merchant).toBe('Tim Hortons');
  });

  it('and WITHOUT rejoining, the same receipt loses its total', () => {
    // This is the failure mode: the flat text has the numbers, but nothing
    // connects them to their labels, so no confident total can be read.
    const flat = SPLIT_BLOCKS.map(b => b.text).join('\n');
    expect(parseDocument(flat).confidence.amount).not.toBe('high');
  });
});
