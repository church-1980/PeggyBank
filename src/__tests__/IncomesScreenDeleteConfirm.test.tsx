/**
 * Section 7 — Incomes list delete requires confirmation.
 *
 * Cancel makes no mutation. Confirming Delete makes exactly one mutation.
 * The existing Undo toast still works after a confirmed delete.
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import IncomesScreen from '../screens/IncomesScreen';
import { deleteIncome as deleteIncomeRecord } from '../lib/saveIncome';

jest.mock('../lib/saveIncome', () => ({
  deleteIncome: jest.fn().mockResolvedValue(undefined),
  restoreIncome: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../lib/incomeSchedules', () => ({
  pendingIncome: jest.fn().mockResolvedValue([]),
  confirmIncome: jest.fn().mockResolvedValue(undefined),
  activeSchedules: jest.fn().mockResolvedValue([]),
  updateSchedule: jest.fn().mockResolvedValue(undefined),
  deactivateSchedule: jest.fn().mockResolvedValue(undefined),
  describeSchedule: jest.fn().mockReturnValue(''),
  nextOccurrence: jest.fn().mockReturnValue('2026-08-15'),
}));
jest.mock('../database/database', () => ({ getDatabase: jest.fn() }));

const mockDb = {
  getAllAsync: jest.fn(),
  getFirstAsync: jest.fn().mockResolvedValue(null),
  runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
};
const mockNav = { navigate: jest.fn(), goBack: jest.fn(), canGoBack: () => true };

const mockIncomes = [
  { id: 1, amount: 2200, label: 'Paycheck', date: '2026-08-15', schedule_id: null, cycle_date: null, is_recurring: 0 },
];

function renderScreen() {
  return render(
    <SafeAreaProvider><IncomesScreen navigation={mockNav} /></SafeAreaProvider>
  );
}

describe('IncomesScreen delete confirmation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { getDatabase } = require('../database/database');
    mockDb.getAllAsync.mockResolvedValue(mockIncomes);
    getDatabase.mockResolvedValue(mockDb);
  });

  it('tapping Delete opens a confirmation instead of deleting immediately', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => getByText('Paycheck'));
    fireEvent.press(getByText('Paycheck'));
    await waitFor(() => getByText('Delete'));
    fireEvent.press(getByText('Delete'));
    await waitFor(() => getByText('Delete this income entry?'));
    expect(deleteIncomeRecord).not.toHaveBeenCalled();
  });

  it('Cancel makes no mutation', async () => {
    const { getByText, queryByText } = renderScreen();
    await waitFor(() => getByText('Paycheck'));
    fireEvent.press(getByText('Paycheck'));
    await waitFor(() => getByText('Delete'));
    fireEvent.press(getByText('Delete'));
    await waitFor(() => getByText('Delete this income entry?'));
    fireEvent.press(getByText('Cancel'));
    await waitFor(() => expect(queryByText('Delete this income entry?')).toBeNull());
    expect(deleteIncomeRecord).not.toHaveBeenCalled();
  });

  it('confirming Delete makes exactly one mutation and shows Undo', async () => {
    const { getByText, getAllByText } = renderScreen();
    await waitFor(() => getByText('Paycheck'));
    fireEvent.press(getByText('Paycheck'));
    await waitFor(() => getByText('Delete'));
    fireEvent.press(getByText('Delete'));
    await waitFor(() => getByText('Delete this income entry?'));
    await act(async () => {
      fireEvent.press(getAllByText('Delete')[getAllByText('Delete').length - 1]);
    });
    expect(deleteIncomeRecord).toHaveBeenCalledTimes(1);
    expect(deleteIncomeRecord).toHaveBeenCalledWith(expect.anything(), 1);
    await waitFor(() => expect(getByText(/income entry deleted/i)).toBeTruthy());
  });
});
