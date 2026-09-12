/**
 * Section 7 — Goals list delete requires confirmation.
 *
 * Cancel makes no mutation. Confirming Delete makes exactly one mutation.
 * The existing Undo toast still works after a confirmed delete.
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import GoalsScreen from '../screens/GoalsScreen';

jest.mock('../database/database', () => ({ getDatabase: jest.fn() }));

const mockDb = {
  getAllAsync: jest.fn(),
  getFirstAsync: jest.fn().mockResolvedValue(null),
  runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
};
const mockNav = { navigate: jest.fn(), goBack: jest.fn(), canGoBack: () => true };

const mockGoals = [
  { id: 1, name: 'Emergency Fund', target_amount: 1000, current_amount: 200, deadline: null, goal_type: 'other', pinned: 0, custom_image_uri: null },
];

function renderScreen() {
  return render(
    <SafeAreaProvider><GoalsScreen navigation={mockNav} route={{ params: {} }} /></SafeAreaProvider>
  );
}

function deleteCalls() {
  return mockDb.runAsync.mock.calls.filter((c: any[]) => String(c[0]).includes('DELETE FROM savings_goals'));
}

describe('GoalsScreen delete confirmation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { getDatabase } = require('../database/database');
    mockDb.getAllAsync.mockResolvedValue(mockGoals);
    getDatabase.mockResolvedValue(mockDb);
  });

  it('tapping Delete Goal opens a confirmation instead of deleting immediately', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => getByText('Emergency Fund'));
    fireEvent.press(getByText('Emergency Fund'));
    await waitFor(() => getByText('Delete Goal'));
    fireEvent.press(getByText('Delete Goal'));
    await waitFor(() => getByText('Delete this goal?'));
    expect(deleteCalls()).toEqual([]);
  });

  it('Cancel makes no mutation', async () => {
    const { getByText, queryByText } = renderScreen();
    await waitFor(() => getByText('Emergency Fund'));
    fireEvent.press(getByText('Emergency Fund'));
    await waitFor(() => getByText('Delete Goal'));
    fireEvent.press(getByText('Delete Goal'));
    await waitFor(() => getByText('Delete this goal?'));
    fireEvent.press(getByText('Cancel'));
    await waitFor(() => expect(queryByText('Delete this goal?')).toBeNull());
    expect(deleteCalls()).toEqual([]);
  });

  it('confirming Delete makes exactly one mutation and shows Undo', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => getByText('Emergency Fund'));
    fireEvent.press(getByText('Emergency Fund'));
    await waitFor(() => getByText('Delete Goal'));
    fireEvent.press(getByText('Delete Goal'));
    await waitFor(() => getByText('Delete this goal?'));
    await act(async () => {
      fireEvent.press(getByText('Delete'));
    });
    expect(deleteCalls()).toHaveLength(1);
    await waitFor(() => expect(getByText(/goal deleted/i)).toBeTruthy());
  });
});
