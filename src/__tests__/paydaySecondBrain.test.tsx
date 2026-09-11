/**
 * PAYDAY SECOND BRAIN — FALSIFICATION.
 *
 * The architecture audit found Payday computing its own budget advice and
 * disagreeing with core/finance.ts: it summed every bill regardless of
 * whether it was already paid, invented a 5% "emergency fund" slice with no
 * product rule behind it, capped savings at an arbitrary 10% of the
 * paycheck, and divided by a fixed 30 days.
 *
 * PaydayScreen.calculatePlan() now reads bills-owed and savings-needed
 * straight off loadFinanceSummary() -- the same function Home calls -- and
 * no longer computes either independently. This test proves that by
 * mocking loadFinanceSummary with a KNOWN summary and checking the screen
 * displays exactly those numbers. If someone reintroduces a standalone
 * calculation, the displayed figures stop matching the mock and this fails.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import PaydayScreen from '../screens/PaydayScreen';

jest.mock('../database/database', () => ({ getDatabase: jest.fn() }));

const mockDb = {
  getAllAsync: jest.fn().mockResolvedValue([]),
  getFirstAsync: jest.fn().mockResolvedValue(null),
  runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
};

jest.mock('../lib/financeSummary', () => ({
  loadFinanceSummary: jest.fn().mockResolvedValue({
    monthIncome: 4400, everydaySpending: 478.30, billsPaidTotal: 149.99,
    debtPaymentsTotal: 200, monthSpending: 828.29, moneyLeft: 3571.71,
    unpaidBillsTotal: 240.99, goalsSavingsNeeded: 300.00,
    safeToSpend: 3030.72, daysLeftInMonth: 12, dailyAllowance: 252.56,
  }),
}));

function renderScreen() {
  return render(
    <SafeAreaProvider>
      <PaydayScreen navigation={{ goBack: jest.fn() }} />
    </SafeAreaProvider>
  );
}

describe('Payday reads bills-owed and savings-needed from the canonical engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { getDatabase } = require('../database/database');
    getDatabase.mockResolvedValue(mockDb);
    mockDb.getAllAsync.mockResolvedValue([]);
    mockDb.getFirstAsync.mockResolvedValue(null);
  });

  it('shows the SAME bills-owed and savings-needed figures the mocked engine returned', async () => {
    const { getByText, getByPlaceholderText } = renderScreen();
    await waitFor(() => {
      const { loadFinanceSummary } = require('../lib/financeSummary');
      expect(loadFinanceSummary).toHaveBeenCalled();
    });

    fireEvent.changeText(getByPlaceholderText('0.00'), '2000');
    fireEvent.press(getByText('Show Me the Plan'));

    // FALSIFIES if calculatePlan() ever sums bills/goals independently again:
    // these exact strings only appear if the values came straight from the
    // mocked summary's unpaidBillsTotal / goalsSavingsNeeded.
    await waitFor(() => {
      expect(getByText('$240.99')).toBeTruthy();  // unpaidBillsTotal, verbatim
      expect(getByText('$300.00')).toBeTruthy();  // goalsSavingsNeeded, verbatim
    });

    // Spending = paycheck - bills owed - savings needed, using those SAME
    // two numbers, not a second calculation with an emergency slice folded in.
    // 2000 - 240.99 - 300.00 = 1459.01
    expect(getByText('$1,459.01')).toBeTruthy();

    // The invented 5% "emergency fund" category no longer exists at all.
    expect(() => getByText(/emergency/i)).toThrow();
  });

  it('the daily figure divides by the canonical days-left, not a fixed 30', async () => {
    const { getByText, getByPlaceholderText } = renderScreen();
    await waitFor(() => {
      const { loadFinanceSummary } = require('../lib/financeSummary');
      expect(loadFinanceSummary).toHaveBeenCalled();
    });
    fireEvent.changeText(getByPlaceholderText('0.00'), '2000');
    fireEvent.press(getByText('Show Me the Plan'));

    // spending 1459.01 / daysLeftInMonth 12 = 121.5841... -> $121.58
    await waitFor(() => expect(getByText('$121.58')).toBeTruthy());
  });
});
