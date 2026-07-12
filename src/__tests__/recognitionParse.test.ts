import { parseDocument } from '../lib/recognition/parse';

const BILL = [
  'BELL',
  'Account number 123456',
  'Billing period Jun 1 - Jun 30',
  'Amount due $95.42',
  'Due date Jul 28, 2026',
].join('\n');

const RECEIPT = [
  'WALMART',
  '123 Main St',
  'Groceries',
  'Subtotal $40.00',
  'HST $5.95',
  'Total $45.95',
  'VISA APPROVED',
  '07/12/2026',
].join('\n');

describe('parseDocument — bills', () => {
  const r = parseDocument(BILL);
  it('classifies as a bill', () => expect(r.docType).toBe('bill'));
  it('detects the payee from the dictionary', () => expect(r.merchant).toBe('Bell'));
  it('detects amount due', () => expect(r.amount).toBe(95.42));
  it('detects the due date', () => expect(r.dueDate).toBe('2026-07-28'));
  it('suggests a category', () => expect(r.category).toBe('home'));
  it('marks a known utility as recurring', () => expect(r.recurring).toBe(true));
});

describe('parseDocument — receipts', () => {
  const r = parseDocument(RECEIPT);
  it('classifies as an expense', () => expect(r.docType).toBe('expense'));
  it('prefers the total (not subtotal)', () => expect(r.amount).toBe(45.95));
  it('suggests a category from keywords', () => expect(r.category).toBe('groceries'));
  it('parses the transaction date', () => expect(r.date).toBe('2026-07-12'));
  it('has no due date for a receipt', () => expect(r.dueDate).toBeUndefined());
});

describe('parseDocument — nothing readable', () => {
  const r = parseDocument('');
  it('is unknown with no fabricated fields', () => {
    expect(r.docType).toBe('unknown');
    expect(r.amount).toBeUndefined();
    expect(r.merchant).toBeUndefined();
    expect(r.confidence.amount).toBe('none');
  });
});
