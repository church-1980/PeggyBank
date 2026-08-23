/**
 * REACHING PAST INCOME.
 *
 * The Incomes list queried getMonthRange() -- always the CURRENT month. Income
 * from any earlier month was never loaded at all. It was not tucked behind a
 * button; it did not exist as far as the screen was concerned, so a pay
 * recorded last month could never be opened, corrected or deleted.
 *
 * Editing had been built and worked. It was simply unreachable for anything
 * older than the 1st of the month, which is exactly when someone notices a
 * mistake: after the month turns over.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import IncomesScreen from '../screens/IncomesScreen';

// The shared test setup stubs useFocusEffect as (cb) => cb(), which fires on
// EVERY render. That is fine for a screen that loads once, but here each load
// sets state, which renders, which loads again -- the screen never settles and
// nothing can be asserted. This runs the callback on mount and whenever it
// changes, which is what focus actually does.
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useFocusEffect: (cb: any) => React.useEffect(cb, [cb]),
  };
});

jest.mock('../database/database', () => ({ getDatabase: jest.fn() }));

const JULY = { id: 1, amount: 2200, label: 'Paycheck', date: '2026-07-10' };
const AUGUST = { id: 2, amount: 850, label: 'Paycheck', date: '2026-08-14' };

const mockDb = {
  getAllAsync: jest.fn(),
  getFirstAsync: jest.fn().mockResolvedValue(null),
  runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
};
const mockNav = { navigate: jest.fn(), goBack: jest.fn(), canGoBack: jest.fn().mockReturnValue(true) };

/** Every date range the income list has asked the database for. */
function incomeQueries() {
  return mockDb.getAllAsync.mock.calls
    .filter(c => String(c[0]).includes('FROM income') && !String(c[0]).includes('schedule_id IS NOT NULL'))
    .map(c => c[1])
    .filter(Boolean);
}

/** Let the screen's async database reads settle. */
async function settle() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

function renderScreen() {
  return render(<SafeAreaProvider><IncomesScreen navigation={mockNav} /></SafeAreaProvider>);
}

describe('Looking at earlier months', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date(2026, 7, 23));   // 23 August 2026
    require('../database/database').getDatabase.mockResolvedValue(mockDb);
    mockDb.getAllAsync.mockImplementation(async (sql: string, args?: any[]) => {
      if (String(sql).includes('income_schedules')) return [];
      if (String(sql).includes('FROM income') && args) {
        return [JULY, AUGUST].filter(r => r.date >= args[0] && r.date <= args[1]);
      }
      return [];
    });
  });

  afterEach(() => jest.useRealTimers());

  it('opens on the current month', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('August 2026')).toBeTruthy());
  });

  it('THE FIX: going back a month asks the database for THAT month', async () => {
    const { getByLabelText } = renderScreen();
    await settle();
    expect(incomeQueries().length).toBeGreaterThan(0);

    fireEvent.press(getByLabelText('Show the previous month'));
    await settle();

    expect(incomeQueries().some(r => r[0] === '2026-07-01' && r[1] === '2026-07-31')).toBe(true);
  });

  it('shows the earlier month by name, so it is obvious where you are', async () => {
    const { getByLabelText, getByText } = renderScreen();
    await waitFor(() => expect(getByText('August 2026')).toBeTruthy());
    fireEvent.press(getByLabelText('Show the previous month'));
    await waitFor(() => expect(getByText('July 2026')).toBeTruthy());
  });

  it('past income becomes reachable, so it can be opened and corrected', async () => {
    const { getByLabelText, getAllByText, getByText } = renderScreen();
    await settle();
    fireEvent.press(getByLabelText('Show the previous month'));
    await settle();
    // July's pay is on screen -- as the month total AND as a tappable row.
    // Before the fix it was never queried at all, so neither existed.
    expect(getAllByText('$2,200.00').length).toBeGreaterThanOrEqual(2);
    expect(getByText('July 2026')).toBeTruthy();
  });

  it('can walk back several months', async () => {
    const { getByLabelText } = renderScreen();
    await settle();
    fireEvent.press(getByLabelText('Show the previous month'));
    await settle();
    fireEvent.press(getByLabelText('Show the previous month'));
    await settle();
    expect(incomeQueries().some(r => r[0] === '2026-06-01')).toBe(true);
  });

  it('will not wander into the future', async () => {
    const { getByLabelText } = renderScreen();
    await settle();
    fireEvent.press(getByLabelText('Show the next month'));   // disabled at the current month
    await settle();
    expect(incomeQueries().some(r => r[0] === '2026-09-01')).toBe(false);
  });

  it('comes back to the current month again', async () => {
    const { getByLabelText, getByText } = renderScreen();
    fireEvent.press(getByLabelText('Show the previous month'));
    await waitFor(() => expect(getByText('July 2026')).toBeTruthy());
    fireEvent.press(getByLabelText('Show the next month'));
    await waitFor(() => expect(getByText('August 2026')).toBeTruthy());
  });
});
