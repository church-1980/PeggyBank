/**
 * WHERE THE MONEY WENT.
 *
 * "$18.40, Groceries" tells you almost nothing a week later. "$18.40, Metro"
 * tells you everything. The place is what someone is actually trying to
 * remember when they look back at a list of payments.
 *
 * The field already existed -- it is what merchant memory learns vendors from
 * and what a custom logo is keyed to -- but it was labelled "Add a note…" and
 * sat below the category grid and the recurring toggle. So it was usually left
 * empty, and the list showed the category as the headline instead.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AddExpenseScreen from '../screens/AddExpenseScreen';

jest.mock('../database/database', () => ({ getDatabase: jest.fn() }));
jest.mock('../lib/merchantMemory', () => ({
  rememberMerchant: jest.fn().mockResolvedValue(undefined),
  recallMerchant: jest.fn().mockResolvedValue(null),
}));

const mockDb = {
  runAsync: jest.fn().mockResolvedValue({ changes: 1, lastInsertRowId: 1 }),
  getAllAsync: jest.fn().mockResolvedValue([]),
  getFirstAsync: jest.fn().mockResolvedValue(null),
};
const mockNav = { navigate: jest.fn(), goBack: jest.fn(), canGoBack: () => true };

function renderScreen(params?: any) {
  return render(
    <SafeAreaProvider>
      <AddExpenseScreen navigation={mockNav} route={{ params }} />
    </SafeAreaProvider>
  );
}

/** Arguments of the expense INSERT/UPDATE. */
function expenseWrite() {
  const call = mockDb.runAsync.mock.calls.find(c => /INTO expenses|UPDATE expenses/.test(String(c[0])));
  return call ? { sql: String(call[0]), args: call[1] } : null;
}

describe('Recording where the money went', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    require('../database/database').getDatabase.mockResolvedValue(mockDb);
  });

  it('asks the question in plain language', () => {
    const { getByText } = renderScreen();
    expect(getByText('Where was it?')).toBeTruthy();
  });

  it('gives examples people recognise instead of "add a note"', () => {
    const { getByPlaceholderText, queryByPlaceholderText } = renderScreen();
    expect(getByPlaceholderText("Dunn's, Shell, Metro…")).toBeTruthy();
    expect(queryByPlaceholderText('Add a note…')).toBeNull();
  });

  it('explains why it is worth filling in', () => {
    const { getByText } = renderScreen();
    expect(getByText(/remember what a payment was for/i)).toBeTruthy();
  });

  it('saves the place with the expense', async () => {
    const { getByPlaceholderText, getByText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText('0.00'), '18.40');
    fireEvent.changeText(getByPlaceholderText("Dunn's, Shell, Metro…"), 'Metro');
    fireEvent.press(getByText('Save'));

    await waitFor(() => expect(expenseWrite()).not.toBeNull());
    expect(expenseWrite()!.args).toContain('Metro');
  });

  it('still learns the merchant from it, as it always did', async () => {
    const { rememberMerchant } = require('../lib/merchantMemory');
    const { getByPlaceholderText, getByText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText('0.00'), '52.10');
    fireEvent.changeText(getByPlaceholderText("Dunn's, Shell, Metro…"), 'Shell');
    fireEvent.press(getByText('Save'));

    await waitFor(() => expect(rememberMerchant).toHaveBeenCalled());
    expect(rememberMerchant.mock.calls[0][0].name).toBe('Shell');
  });

  it('an expense with no place still saves', async () => {
    const { getByPlaceholderText, getByText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText('0.00'), '9.99');
    fireEvent.press(getByText('Save'));
    await waitFor(() => expect(expenseWrite()).not.toBeNull());
    expect(expenseWrite()!.args).toContain(9.99);
  });

  it('editing keeps the place that was already recorded', () => {
    const { getByPlaceholderText } = renderScreen({ id: 3, amount: 18.4, note: 'Subway', category: 'restaurant' });
    expect(getByPlaceholderText("Dunn's, Shell, Metro…").props.value).toBe('Subway');
  });
});
