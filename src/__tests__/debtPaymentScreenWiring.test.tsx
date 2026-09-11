/**
 * D1 FALSIFICATION — proves DebtScreen itself writes to the debt_payments
 * ledger, not just that the finance engine can read one if it exists.
 *
 * debtPaymentLedger.test.ts proves the engine integration against real SQL
 * the diagnostic's own scenario used, but constructs that SQL directly
 * rather than through the screen — a regression where DebtScreen.
 * handlePayment() reverted to `UPDATE debts SET amount_paid=?` (the
 * original bug) would not be caught by that file alone. This renders the
 * real screen, taps through the real payment flow, and inspects the actual
 * SQL the screen issues.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DebtScreen from '../screens/DebtScreen';

jest.mock('../database/database', () => ({ getDatabase: jest.fn() }));
jest.mock('../context/CustomLogoContext', () => ({
  useCustomLogos: () => ({ logoFor: () => null, pickAndSetLogo: jest.fn(), removeLogo: jest.fn(), hasLogo: () => false }),
}));

const DEBT = {
  id: 1, name: 'Visa', total_amount: 1000, amount_paid: 0,
  minimum_payment: 50, monthly_payment: 100, apr: 19.99, notes: null,
};

const mockDb = {
  getAllAsync: jest.fn().mockResolvedValue([DEBT]),
  getFirstAsync: jest.fn().mockResolvedValue(null),
  runAsync: jest.fn().mockResolvedValue({ changes: 1, lastInsertRowId: 1 }),
};

function renderScreen() {
  return render(
    <SafeAreaProvider>
      <DebtScreen navigation={{ goBack: jest.fn() }} />
    </SafeAreaProvider>
  );
}

describe('DebtScreen wires "Make Payment" to the debt_payments ledger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { getDatabase } = require('../database/database');
    getDatabase.mockResolvedValue(mockDb);
    mockDb.getAllAsync.mockImplementation((sql: string) =>
      /FROM debt_payments/.test(sql) ? Promise.resolve([]) : Promise.resolve([DEBT])
    );
  });

  it('recording a payment INSERTs into debt_payments, never touches debts.amount_paid', async () => {
    const { getByText, getByPlaceholderText } = renderScreen();

    await waitFor(() => expect(getByText('Visa')).toBeTruthy());
    fireEvent.press(getByText('Make Payment'));

    await waitFor(() => expect(getByText('Record Payment')).toBeTruthy());
    fireEvent.changeText(getByPlaceholderText('0.00'), '500');
    fireEvent.press(getByText('Record Payment'));

    await waitFor(() => {
      const ledgerWrite = mockDb.runAsync.mock.calls.find(
        (c: any[]) => typeof c[0] === 'string' && /INSERT INTO debt_payments/.test(c[0])
      );
      expect(ledgerWrite).toBeDefined();
      expect(ledgerWrite![1]).toEqual(expect.arrayContaining([1, 500, 'Visa']));

      // FALSIFIES if handlePayment() reverts to the original bug.
      const cumulativeWrite = mockDb.runAsync.mock.calls.find(
        (c: any[]) => typeof c[0] === 'string' && /UPDATE debts SET amount_paid/.test(c[0])
      );
      expect(cumulativeWrite).toBeUndefined();
    });
  });
});
