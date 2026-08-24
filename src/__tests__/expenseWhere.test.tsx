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

/**
 * EDITING MUST NOT DESTROY WHAT IT WAS NOT ASKED ABOUT.
 *
 * The form read prefill.capturedPhoto but never prefill.photo_uri, and always
 * started with recurring off. The update then wrote both of those blanks back:
 *
 *     UPDATE expenses SET ..., photo_uri=?, is_recurring=? WHERE id=?
 *
 * So correcting an amount silently deleted the receipt photo attached to the
 * expense and forgot that it repeated. Nothing warned, and the photo was the
 * evidence of the purchase.
 */
describe('Correcting an expense keeps everything else', () => {
  const existing = {
    id: 9, amount: 5, category: 'restaurant', note: 'Supper',
    date: '2026-08-18', photo_uri: 'file:///receipt.jpg', is_recurring: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    require('../database/database').getDatabase.mockResolvedValue(mockDb);
  });

  it('can correct the date, which was not editable at all before', async () => {
    const { getByText } = renderScreen(existing);
    expect(getByText('When was it?')).toBeTruthy();
    fireEvent.press(getByText('Today'));
    fireEvent.press(getByText('Update'));

    await waitFor(() => expect(expenseWrite()).not.toBeNull());
    const w = expenseWrite()!;
    expect(w.sql).toContain('UPDATE expenses');
    expect(w.sql).toContain('date=?');
    expect(w.args).not.toContain('2026-08-18');
  });

  it('keeps the date when it is not touched', async () => {
    const { getByText } = renderScreen(existing);
    fireEvent.press(getByText('Update'));
    await waitFor(() => expect(expenseWrite()).not.toBeNull());
    expect(expenseWrite()!.args).toContain('2026-08-18');
  });

  it('THE BUG: the receipt photo survives an edit', async () => {
    const { getByText } = renderScreen(existing);
    fireEvent.press(getByText('Update'));
    await waitFor(() => expect(expenseWrite()).not.toBeNull());
    expect(expenseWrite()!.args).toContain('file:///receipt.jpg');
  });

  it('THE BUG: the recurring flag survives an edit', async () => {
    const { getByText } = renderScreen(existing);
    fireEvent.press(getByText('Update'));
    await waitFor(() => expect(expenseWrite()).not.toBeNull());
    expect(expenseWrite()!.args).toContain(1);
  });

  it('the place and category survive an edit', async () => {
    const { getByText } = renderScreen(existing);
    fireEvent.press(getByText('Update'));
    await waitFor(() => expect(expenseWrite()).not.toBeNull());
    const args = expenseWrite()!.args;
    expect(args).toContain('Supper');
    expect(args).toContain('restaurant');
  });

  it('correcting the amount changes only the amount', async () => {
    const { getByPlaceholderText, getByText } = renderScreen(existing);
    fireEvent.changeText(getByPlaceholderText('0.00'), '30');
    fireEvent.press(getByText('Update'));
    await waitFor(() => expect(expenseWrite()).not.toBeNull());
    const args = expenseWrite()!.args;
    expect(args).toContain(30);
    expect(args).toContain('file:///receipt.jpg');   // still there
    expect(args).toContain('2026-08-18');            // still there
    expect(args).toContain('Supper');                // still there
  });
});
