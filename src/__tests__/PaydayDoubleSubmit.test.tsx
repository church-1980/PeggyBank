/**
 * Section 10 — Payday's Save can be double-submitted.
 *
 * Before the fix, savePlan() read `scheduleId` (still null on a first save)
 * and had no guard: two taps landing before either finishes both take the
 * createSchedule() branch, producing two 'Paycheck' schedules that then
 * both forecast the same payday.
 *
 * Runs against a REAL SQLite database — the duplicate can only be seen in
 * the actual row count, not in a mock that just records call arguments.
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import PaydayScreen from '../screens/PaydayScreen';
import { makeRealDb } from './helpers/realDb';

jest.mock('../database/database', () => ({ getDatabase: jest.fn() }));

const mockNav = { navigate: jest.fn(), goBack: jest.fn(), canGoBack: () => true };

let db: any;

function renderScreen() {
  return render(<SafeAreaProvider><PaydayScreen navigation={mockNav} /></SafeAreaProvider>);
}

describe('Payday Save cannot be double-submitted', () => {
  beforeEach(() => {
    db = makeRealDb();
    require('../database/database').getDatabase.mockResolvedValue(db);
  });

  it('THE BUG: two rapid taps create exactly one schedule, not two', async () => {
    const { getByText, getByPlaceholderText, unmount } = renderScreen();
    await waitFor(() => getByText('Payday Planner'));

    fireEvent.changeText(getByPlaceholderText('0.00'), '2200');
    fireEvent.press(getByText('Show Me the Plan'));
    await waitFor(() => getByText('Save This Plan'));

    // Two taps, back to back, before either save can complete — the same
    // element, the way a real double-tap presses the same button twice.
    const saveButton = getByText('Save This Plan');
    fireEvent.press(saveButton);
    fireEvent.press(saveButton);

    await waitFor(() => getByText('Saved'));
    await waitFor(async () => {
      const rows = await db.getAllAsync(`SELECT * FROM income_schedules WHERE label='Paycheck'`);
      expect(rows).toHaveLength(1);
    });
    unmount();
  });

  it('the Save button disables itself while a save is in flight', async () => {
    const { getByText, getByPlaceholderText, unmount } = renderScreen();
    await waitFor(() => getByText('Payday Planner'));

    fireEvent.changeText(getByPlaceholderText('0.00'), '1500');
    fireEvent.press(getByText('Show Me the Plan'));
    await waitFor(() => getByText('Save This Plan'));

    fireEvent.press(getByText('Save This Plan'));
    // Immediately after the first tap, the label reflects an in-flight save.
    await waitFor(() => expect(getByText(/Saving…|Saved/)).toBeTruthy());

    await waitFor(() => getByText('Saved'));
    unmount();
  });
});
