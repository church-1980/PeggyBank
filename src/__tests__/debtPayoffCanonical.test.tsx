/**
 * Section 2 — DebtScreen must consume the canonical debt payoff math, not
 * its own approximation. The old local calcPayoff() used
 * `payment*months - balance` for interest, proven to disagree with the
 * real amortization by up to 43% on realistic inputs ($5,000 / 6.99% /
 * $200: screen said $600, engine said $419.55).
 *
 * core/finance.ts's debtPayoffMonths/debtTotalInterest are already unit-
 * tested (goldenFinance.test.ts: zero balance, zero APR, non-amortizing
 * null). This file proves two things that weren't proven yet: (1) the
 * SCREEN itself now calls the canonical function rather than a copy of it,
 * and (2) a few more edge cases the repair brief named explicitly.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DebtScreen from '../screens/DebtScreen';
import { debtPayoffMonths, debtTotalInterest } from '../core/finance';

jest.mock('../database/database', () => ({ getDatabase: jest.fn() }));
jest.mock('../context/CustomLogoContext', () => ({
  useCustomLogos: () => ({ logoFor: () => null, pickAndSetLogo: jest.fn(), removeLogo: jest.fn(), hasLogo: () => false }),
}));

// The exact case the diagnostic proved wrong: screen said $600, engine says $419.55.
const DEBT = {
  id: 1, name: 'Visa', total_amount: 5000, amount_paid: 0,
  minimum_payment: 200, monthly_payment: 200, apr: 6.99, notes: null,
};

function mockDbReturning(rows: any[]) {
  return {
    getAllAsync: jest.fn().mockImplementation((sql: string) =>
      /FROM debt_payments/.test(sql) ? Promise.resolve([]) : Promise.resolve(rows)
    ),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    runAsync: jest.fn().mockResolvedValue({ changes: 1, lastInsertRowId: 1 }),
  };
}

function renderScreen() {
  return render(
    <SafeAreaProvider>
      <DebtScreen navigation={{ goBack: jest.fn() }} />
    </SafeAreaProvider>
  );
}

describe('DebtScreen shows the canonical interest figure, not its own approximation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { getDatabase } = require('../database/database');
    getDatabase.mockResolvedValue(mockDbReturning([DEBT]));
  });

  it('displays $419.55, not the old $600 approximation, for the diagnostic\'s own example', async () => {
    const expected = debtTotalInterest(5000, 6.99, 200);
    expect(expected).toBe(419.55); // sanity-check the fixture matches the diagnostic's numbers

    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('Visa')).toBeTruthy());

    // FALSIFIES if DebtScreen reverts to a local approximation: the old
    // formula produces $600.00 for this exact input, which would fail here.
    await waitFor(() => expect(getByText(/\$419\.55/)).toBeTruthy());
    expect(() => getByText(/\$600\.00/)).toThrow();
  });
});

describe('debtPayoffMonths/debtTotalInterest edge cases (Section 2 checklist)', () => {
  it('zero balance pays off instantly with no interest', () => {
    expect(debtPayoffMonths(0, 19.99, 100)).toBe(0);
    expect(debtTotalInterest(0, 19.99, 100)).toBe(0);
  });

  it('zero APR is a pure division, no interest', () => {
    expect(debtPayoffMonths(1000, 0, 100)).toBe(10);
    expect(debtTotalInterest(1000, 0, 100)).toBe(0);
  });

  it('a high APR still resolves to a finite, sane answer for a payment that covers it', () => {
    const months = debtPayoffMonths(3000, 29.99, 200);
    const interest = debtTotalInterest(3000, 29.99, 200);
    expect(months).not.toBeNull();
    expect(months!).toBeGreaterThan(0);
    expect(Number.isFinite(interest!)).toBe(true);
    expect(interest!).toBeGreaterThan(0);
  });

  it('a payment barely above the monthly interest still resolves (does not loop forever)', () => {
    const apr = 24; // 2%/month
    const balance = 5000;
    const monthlyInterest = balance * (apr / 100 / 12); // $100
    const payment = monthlyInterest + 1; // $101 — barely covers interest
    const months = debtPayoffMonths(balance, apr, payment);
    expect(months).not.toBeNull();
    expect(Number.isFinite(months!)).toBe(true);
    // A payment this close to pure interest takes a very long time, but
    // must still terminate with a real number, not hang or return NaN.
    expect(months!).toBeGreaterThan(100);
  });

  it('a non-amortizing payment (does not even cover monthly interest) is null, not a nonsense number', () => {
    const apr = 24;
    const balance = 5000;
    const tooLow = balance * (apr / 100 / 12) - 1; // $1 short of covering interest
    expect(debtPayoffMonths(balance, apr, tooLow)).toBeNull();
    expect(debtTotalInterest(balance, apr, tooLow)).toBeNull();
  });

  it('a large payment relative to balance pays off in one month with minimal interest', () => {
    const months = debtPayoffMonths(500, 19.99, 5000);
    expect(months).toBe(1);
    const interest = debtTotalInterest(500, 19.99, 5000);
    expect(interest!).toBeGreaterThanOrEqual(0);
    expect(interest!).toBeLessThan(10); // one month of interest on $500 is small
  });

  it('the final fractional payoff month rounds up (ceil), never leaving a phantom partial month', () => {
    // A balance that does not divide evenly by the payment at 0% APR.
    const months = debtPayoffMonths(1001, 0, 500);
    expect(months).toBe(3); // 1001/500 = 2.002 -> ceil to 3, not 2
  });
});

describe('DebtScreen shows a safe state for a non-amortizing debt (no crash, no infinite loop)', () => {
  it('renders without crashing and shows no payoff timeline for a payment that never pays it off', async () => {
    jest.clearAllMocks();
    const { getDatabase } = require('../database/database');
    // Payment ($10) does not even cover monthly interest at 29.99% on $5000.
    const HOPELESS = { id: 1, name: 'Maxed Card', total_amount: 5000, amount_paid: 0, minimum_payment: 10, monthly_payment: 10, apr: 29.99, notes: null };
    getDatabase.mockResolvedValue(mockDbReturning([HOPELESS]));

    const { getByText, queryByText } = renderScreen();
    await waitFor(() => expect(getByText('Maxed Card')).toBeTruthy());

    // Safe state: the screen renders (no crash, no hang from an unbounded
    // loop) and the timeline card — which would otherwise show a fabricated
    // payoff date or interest figure — is correctly withheld rather than
    // showing nonsense. "paid off in" only ever appears when the guard
    // (payoffMonths < 999, i.e. the engine returned a real answer) passes.
    expect(queryByText(/paid off in/i)).toBeNull();
    expect(queryByText(/Estimated interest/i)).toBeNull();
  });
});
