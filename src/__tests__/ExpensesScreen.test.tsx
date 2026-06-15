import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ExpensesScreen from '../screens/ExpensesScreen';

jest.mock('../database/database', () => ({
  getDatabase: jest.fn(),
}));

const mockDb = {
  getAllAsync: jest.fn(),
  runAsync:   jest.fn().mockResolvedValue({ changes: 1 }),
};

const mockNav = {
  navigate:  jest.fn(),
  goBack:    jest.fn(),
  canGoBack: jest.fn().mockReturnValue(true),
};

const mockExpenses = [
  { id: 1, amount: 84.50, category: 'groceries', note: 'Metro', date: '2026-06-09', photo_uri: null, is_recurring: 0 },
  { id: 2, amount: 18.00, category: 'food',      note: 'Lunch', date: '2026-06-07', photo_uri: null, is_recurring: 0 },
];

function withProviders(ui: React.ReactElement) {
  return <SafeAreaProvider>{ui}</SafeAreaProvider>;
}

function renderScreen() {
  return render(withProviders(<ExpensesScreen navigation={mockNav} />));
}

describe('ExpensesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { getDatabase } = require('../database/database');
    mockDb.getAllAsync.mockResolvedValue(mockExpenses);
    getDatabase.mockResolvedValue(mockDb);
  });

  it('renders the month label and total', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => {
      expect(getByText(/total spent this month/i)).toBeTruthy();
    });
  });

  it('shows empty state when there are no expenses', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    const { getByText } = renderScreen();
    await waitFor(() => {
      expect(getByText(/nothing recorded yet/i)).toBeTruthy();
    });
  });

  it('renders expense items from the database', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => {
      expect(getByText('Metro')).toBeTruthy();
      expect(getByText('Lunch')).toBeTruthy();
    });
  });

  it('shows correct total from expense amounts', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => {
      // $84.50 + $18.00 = $102.50
      expect(getByText('$102.50')).toBeTruthy();
    });
  });

  it('navigates to AddExpense when Add button is tapped', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => getByText('Add'));
    fireEvent.press(getByText('Add'));
    expect(mockNav.navigate).toHaveBeenCalledWith('AddExpense', expect.objectContaining({ returnTo: 'Spending' }));
  });

  it('opens action sheet when an expense item is tapped', async () => {
    const { getByText, getAllByText } = renderScreen();
    await waitFor(() => getByText('Metro'));
    fireEvent.press(getByText('Metro'));
    await waitFor(() => {
      expect(getByText('Edit Expense')).toBeTruthy();
      expect(getByText('Delete')).toBeTruthy();
    });
  });

  it('navigates to AddExpense with item data when Edit is tapped', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => getByText('Metro'));
    fireEvent.press(getByText('Metro'));
    await waitFor(() => getByText('Edit Expense'));
    fireEvent.press(getByText('Edit Expense'));
    expect(mockNav.navigate).toHaveBeenCalledWith('AddExpense', expect.objectContaining({ id: 1 }));
  });

  it('calls DELETE on the database when Delete is tapped', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => getByText('Metro'));
    fireEvent.press(getByText('Metro'));
    await waitFor(() => getByText('Delete'));
    await act(async () => {
      fireEvent.press(getByText('Delete'));
    });
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM expenses'),
      expect.arrayContaining([1])
    );
  });

  it('shows undo toast after deleting an expense', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => getByText('Metro'));
    fireEvent.press(getByText('Metro'));
    await waitFor(() => getByText('Delete'));
    await act(async () => {
      fireEvent.press(getByText('Delete'));
    });
    await waitFor(() => {
      expect(getByText(/expense deleted/i)).toBeTruthy();
    });
  });

  it('closes action sheet when Cancel is tapped', async () => {
    const { getByText, queryByText } = renderScreen();
    await waitFor(() => getByText('Metro'));
    fireEvent.press(getByText('Metro'));
    await waitFor(() => getByText('Cancel'));
    fireEvent.press(getByText('Cancel'));
    await waitFor(() => {
      expect(queryByText('Edit Expense')).toBeNull();
    });
  });
});
