/**
 * D6 FALSIFICATION — proves GoalsScreen itself calls the full-row restore,
 * not just that the restore algorithm is correct in isolation.
 *
 * goalUndoFull.test.ts proves the dynamic-column restore logic is correct
 * against real SQLite, but drives that logic directly rather than through
 * the screen — a regression where GoalsScreen.handleUndo() reverted to its
 * old hand-picked four-column INSERT would not be caught by that file
 * alone. This renders the real screen, taps through the real delete-then-
 * undo flow, and inspects the actual SQL the screen issues.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import GoalsScreen from '../screens/GoalsScreen';

jest.mock('../database/database', () => ({ getDatabase: jest.fn() }));
jest.mock('../context/CustomLogoContext', () => ({
  useCustomLogos: () => ({ logoFor: () => null, pickAndSetLogo: jest.fn(), removeLogo: jest.fn(), hasLogo: () => false }),
}));

const GOAL = {
  id: 1, name: 'Emergency Fund', target_amount: 3000, current_amount: 1200,
  deadline: '2026-12-01', goal_type: 'emergency', pinned: 1, custom_image_uri: 'file:///g.jpg',
};

const mockDb = {
  getAllAsync: jest.fn().mockResolvedValue([GOAL]),
  getFirstAsync: jest.fn().mockResolvedValue(null),
  runAsync: jest.fn().mockResolvedValue({ changes: 1, lastInsertRowId: 1 }),
};

function renderScreen() {
  return render(
    <SafeAreaProvider>
      <GoalsScreen navigation={{ goBack: jest.fn() }} route={{ params: {} }} />
    </SafeAreaProvider>
  );
}

describe('GoalsScreen wires delete + undo to the full-row restore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { getDatabase } = require('../database/database');
    getDatabase.mockResolvedValue(mockDb);
    mockDb.getAllAsync.mockResolvedValue([GOAL]);
  });

  it('tapping Delete then Undo issues an INSERT carrying every column, not four', async () => {
    const { getByText } = renderScreen();

    await waitFor(() => expect(getByText('Emergency Fund')).toBeTruthy());
    fireEvent.press(getByText('Emergency Fund'));           // opens the action sheet
    await waitFor(() => expect(getByText('Delete Goal')).toBeTruthy());
    fireEvent.press(getByText('Delete Goal'));               // deletes; shows the undo toast

    await waitFor(() => expect(getByText('Undo')).toBeTruthy());
    fireEvent.press(getByText('Undo'));

    await waitFor(() => {
      const insertCall = mockDb.runAsync.mock.calls.find(
        (c: any[]) => typeof c[0] === 'string' && /INSERT INTO savings_goals/.test(c[0])
      );
      expect(insertCall).toBeDefined();
      // FALSIFIES if handleUndo() reverts to its old 4-column list: this
      // asserts the columns the fix specifically restores are present.
      expect(insertCall![0]).toEqual(expect.stringContaining('goal_type'));
      expect(insertCall![0]).toEqual(expect.stringContaining('pinned'));
      expect(insertCall![0]).toEqual(expect.stringContaining('custom_image_uri'));
      expect(insertCall![1]).toEqual(expect.arrayContaining(['emergency', 1, 'file:///g.jpg']));
    });
  });
});
