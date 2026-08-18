import { parseDocument } from '../lib/recognition/parse';

/**
 * Guards the receipt→category matching. These regexes have silently broken
 * before (a bad edit replaced the word-boundary escapes with control
 * characters and every category returned undefined), so the everyday cases
 * are pinned here.
 */
describe('receipt recognition', () => {
  const cases: [string, string, string][] = [
    ['restaurant', 'BOSTON PIZZA\nSubtotal 51.30\nTOTAL 58.00\nVISA APPROVED', 'restaurant'],
    ['groceries',  'NO FRILLS\nMilk 5.49\nSUBTOTAL 44.10\nTOTAL 48.22\nDEBIT',  'groceries'],
    ['pharmacy',   'JEAN COUTU\nPrescription\nTOTAL 32.15\nDEBIT APPROVED',      'health'],
    ['netflix',    'NETFLIX.COM\nMonthly\nTOTAL 16.49\nVISA',                    'fun'],
  ];

  it.each(cases)('files a %s receipt correctly', (_label, text, expected) => {
    const r = parseDocument(text);
    expect(r.docType).toBe('expense');
    expect(r.category).toBe(expected);
    expect(r.amount).toBeGreaterThan(0);
  });

  it('reads a hydro bill as a bill with a due date', () => {
    const r = parseDocument('HYDRO QUEBEC\nAccount number 12345678\nAmount due 84.20\nDue date March 15 2026');
    expect(r.docType).toBe('bill');
    expect(r.amount).toBe(84.2);
  });
});
