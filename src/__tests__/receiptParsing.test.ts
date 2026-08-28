/**
 * READING A RECEIPT.
 *
 * Driven by a real failure: a Tim Hortons receipt photographed on a phone came
 * back with merchant "Please review" and amount "Please review". The true total
 * was $11.60 and the date was read correctly.
 *
 * A receipt is full of numbers -- item prices, subtotal, GST, QST, the total,
 * what was tendered, the change. Picking the largest, the last, or the first
 * one that looks like money is guaranteed to be wrong sooner or later. So is
 * assuming the first line of text is the shop's name.
 */

import { parseDocument } from '../lib/recognition/parse';
import {
  TIM_HORTONS, MAXI_FRENCH, COMMA_DECIMALS, SHELL_GAS,
  BELL_BILL, CASH_WITH_CHANGE, UNREADABLE,
} from './fixtures/receipts';

describe('THE RECEIPT THAT EXPOSED THIS', () => {
  const r = parseDocument(TIM_HORTONS);

  it('names the merchant', () => {
    expect(r.merchant).toMatch(/tim hortons/i);
  });

  it('finds the FINAL total, not the subtotal', () => {
    expect(r.amount).toBe(11.60);
    expect(r.amount).not.toBe(10.09);
  });

  it('reads the date', () => {
    expect(r.date).toBe('2026-08-28');
  });

  it('suggests a category', () => {
    expect(r.category).toBe('restaurant');
  });

  it('treats it as an expense, not a bill', () => {
    expect(r.docType).toBe('expense');
  });

  it('is confident enough not to say "please review"', () => {
    expect(r.confidence.merchant).not.toBe('none');
    expect(r.confidence.amount).not.toBe('none');
  });
});

describe('Total, not the things that look like it', () => {
  it('SUBTOTAL is not the total', () => {
    expect(parseDocument(TIM_HORTONS).amount).not.toBe(10.09);
    expect(parseDocument(SHELL_GAS).amount).not.toBe(56.79);
  });

  it('the tax lines are not the total', () => {
    const r = parseDocument(TIM_HORTONS);
    expect(r.amount).not.toBe(0.50);
    expect(r.amount).not.toBe(1.01);
  });

  it('"TOTAL DES TAXES" is not the total', () => {
    const r = parseDocument(MAXI_FRENCH);
    expect(r.amount).not.toBe(6.23);
    expect(r.amount).toBe(47.83);
  });

  it('"SOUS-TOTAL" is not the total, despite containing the word', () => {
    expect(parseDocument(MAXI_FRENCH).amount).not.toBe(41.60);
    expect(parseDocument(COMMA_DECIMALS).amount).not.toBe(20.39);
  });

  it('cash tendered and change are not the total', () => {
    const r = parseDocument(CASH_WITH_CHANGE);
    expect(r.amount).toBe(5.15);
    expect(r.amount).not.toBe(20.00);      // tendered
    expect(r.amount).not.toBe(14.85);      // change
  });

  it('the biggest number on the page is not automatically the total', () => {
    // CASH 20.00 is the largest figure; the total is 5.15.
    expect(parseDocument(CASH_WITH_CHANGE).amount).toBe(5.15);
  });

  it('litres and unit prices are not money', () => {
    const r = parseDocument(SHELL_GAS);
    expect(r.amount).toBe(65.29);
    expect(r.amount).not.toBe(42.15);
    expect(r.amount).not.toBe(1.549);
  });
});

describe('Quebec receipts', () => {
  it('reads a French grocery receipt', () => {
    const r = parseDocument(MAXI_FRENCH);
    expect(r.merchant).toMatch(/maxi/i);
    expect(r.amount).toBe(47.83);
    expect(r.category).toBe('groceries');
  });

  it('understands a decimal comma', () => {
    const r = parseDocument(COMMA_DECIMALS);
    expect(r.amount).toBe(23.45);
  });

  it('reads a French date', () => {
    expect(parseDocument(COMMA_DECIMALS).date).toBe('2026-08-28');
  });
});

describe('Merchants', () => {
  it('recognises a brand even when the line carries a store number', () => {
    expect(parseDocument(TIM_HORTONS).merchant).toMatch(/tim hortons/i);
  });

  it('does not report the street address as the shop', () => {
    for (const t of [TIM_HORTONS, MAXI_FRENCH, SHELL_GAS]) {
      const m = parseDocument(t).merchant ?? '';
      expect(m).not.toMatch(/BOUL|RUE|TEL:|QC$/i);
    }
  });

  it('names a shop it has never heard of, from the top of the receipt', () => {
    const r = parseDocument(CASH_WITH_CHANGE);
    expect(r.merchant).toMatch(/DEPANNEUR/i);
  });

  it('still recognises a bill payee', () => {
    const r = parseDocument(BELL_BILL);
    expect(r.merchant).toBe('Bell');
    expect(r.docType).toBe('bill');
    expect(r.amount).toBe(117.43);
  });

  it('a credit on a bill is not mistaken for the amount due', () => {
    expect(parseDocument(BELL_BILL).amount).not.toBe(-112.10);
    expect(parseDocument(BELL_BILL).amount).not.toBe(112.10);
  });
});

describe('Admitting defeat honestly', () => {
  it('invents nothing from an unreadable photo', () => {
    const r = parseDocument(UNREADABLE);
    expect(r.amount).toBeUndefined();
    expect(r.confidence.amount).toBe('none');
  });

  it('never returns a nonsense amount', () => {
    for (const t of [TIM_HORTONS, MAXI_FRENCH, COMMA_DECIMALS, SHELL_GAS, CASH_WITH_CHANGE, BELL_BILL]) {
      const a = parseDocument(t).amount;
      expect(a).toBeGreaterThan(0);
      expect(Number.isFinite(a)).toBe(true);
    }
  });
});

describe('Confidence means something', () => {
  it('a known shop is named with confidence, not offered as a guess', () => {
    const r = parseDocument(TIM_HORTONS);
    expect(r.merchant).toBe('Tim Hortons');
    expect(r.confidence.merchant).toBe('high');
  });

  it('a labelled total is read with confidence', () => {
    expect(parseDocument(TIM_HORTONS).confidence.amount).toBe('high');
    expect(parseDocument(MAXI_FRENCH).confidence.amount).toBe('high');
  });

  it('an unknown shop is offered, but marked as worth checking', () => {
    const r = parseDocument(CASH_WITH_CHANGE);
    expect(r.merchant).toBeDefined();
    expect(r.confidence.merchant).toBe('low');
  });

  it('the brand name is tidied, not echoed with the store number', () => {
    // The line reads "TIM HORTONS #4021"; the shop is called Tim Hortons.
    expect(parseDocument(TIM_HORTONS).merchant).not.toMatch(/#|4021/);
  });

  it('nothing is claimed about an unreadable photo', () => {
    const r = parseDocument(UNREADABLE);
    expect(r.confidence.merchant).toBe('none');
    expect(r.confidence.amount).toBe('none');
  });
});
