/**
 * EDITING INCOME — and above all, editing its DATE.
 *
 * Income used to be insert-only. There was an "Edit" button, but it ran:
 *
 *     UPDATE income SET amount=?, label=? WHERE id=?
 *
 * The date was not in it. The date was not settable when ADDING either -- the
 * insert stamped getTodayString() -- so pay that arrived on Friday and was
 * entered on Sunday was filed on Sunday, permanently. A wrong date is the
 * easiest mistake to make and it was the one thing that could never be fixed.
 *
 * The date is not cosmetic: it decides which MONTH the money belongs to, and
 * therefore what Safe to Spend says.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AddIncomeScreen from '../screens/AddIncomeScreen';

jest.mock('../database/database', () => ({ getDatabase: jest.fn() }));

const mockDb = { runAsync: jest.fn().mockResolvedValue({ changes: 1 }), getAllAsync: jest.fn().mockResolvedValue([]) };
const mockNav = { navigate: jest.fn(), goBack: jest.fn(), canGoBack: jest.fn().mockReturnValue(true) };

function renderScreen(params?: any) {
  return render(
    <SafeAreaProvider>
      <AddIncomeScreen navigation={mockNav} route={{ params }} />
    </SafeAreaProvider>
  );
}

/** The SQL and arguments of the last write. */
function lastWrite() {
  const calls = mockDb.runAsync.mock.calls;
  return calls.length ? { sql: String(calls[calls.length - 1][0]), args: calls[calls.length - 1][1] } : null;
}

describe('Adding income', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    require('../database/database').getDatabase.mockResolvedValue(mockDb);
  });

  it('offers a way to choose when the money arrived', () => {
    const { getByText } = renderScreen();
    expect(getByText('When did it arrive?')).toBeTruthy();
    expect(getByText('Yesterday')).toBeTruthy();
  });

  it('saves the date the user chose, not always today', async () => {
    const { getByText, getByPlaceholderText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText('0.00'), '2200');
    fireEvent.press(getByText('Yesterday'));
    fireEvent.press(getByText('Save Income'));

    await waitFor(() => expect(mockDb.runAsync).toHaveBeenCalled());
    const w = lastWrite()!;
    expect(w.sql).toContain('INSERT INTO income');

    const now = new Date();
    const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const pad = (n: number) => (n < 10 ? '0' + n : String(n));
    expect(w.args[2]).toBe(y.getFullYear() + '-' + pad(y.getMonth() + 1) + '-' + pad(y.getDate()));
  });
});

describe('Editing income', () => {
  const existing = { id: 7, amount: 2200, label: 'Paycheck', date: '2026-08-14' };

  beforeEach(() => {
    jest.clearAllMocks();
    require('../database/database').getDatabase.mockResolvedValue(mockDb);
  });

  it('opens as an edit, not as a new entry', () => {
    const { getByText } = renderScreen(existing);
    expect(getByText('Edit Income')).toBeTruthy();
    expect(getByText('Update Income')).toBeTruthy();
  });

  it('prefills the amount that is already there', () => {
    const { getByPlaceholderText } = renderScreen(existing);
    expect(getByPlaceholderText('0.00').props.value).toBe('2200');
  });

  it('UPDATES the existing row instead of adding a second one', async () => {
    const { getByText } = renderScreen(existing);
    fireEvent.press(getByText('Update Income'));
    await waitFor(() => expect(mockDb.runAsync).toHaveBeenCalled());
    const w = lastWrite()!;
    expect(w.sql).toContain('UPDATE income');
    expect(w.sql).not.toContain('INSERT');
    expect(w.args[w.args.length - 1]).toBe(7);          // the id being updated
  });

  it('THE FIX: the date is part of the update, so a wrong day can be corrected', async () => {
    const { getByText } = renderScreen(existing);
    fireEvent.press(getByText('Today'));
    fireEvent.press(getByText('Update Income'));
    await waitFor(() => expect(mockDb.runAsync).toHaveBeenCalled());

    const w = lastWrite()!;
    const now = new Date();
    const pad = (n: number) => (n < 10 ? '0' + n : String(n));
    const today = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
    expect(w.args).toContain(today);
    expect(w.args).not.toContain('2026-08-14');
  });

  it('keeps the original date when the user does not touch it', async () => {
    const { getByText } = renderScreen(existing);
    fireEvent.press(getByText('Update Income'));
    await waitFor(() => expect(mockDb.runAsync).toHaveBeenCalled());
    expect(lastWrite()!.args).toContain('2026-08-14');
  });
});
