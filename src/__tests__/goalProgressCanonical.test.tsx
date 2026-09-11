/**
 * D8 — GoalsScreen displays the canonical goalProgressPercent(), not a
 * second calculation of the same fraction.
 *
 * Renders the real screen against a mocked goal and checks the displayed
 * percentage is exactly Math.round(goalProgressPercent(target, current))
 * for that goal — computed independently here, not copied from the
 * screen's own formula, so a reintroduced or diverging calculation in the
 * screen would show a different number than this test expects.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import GoalsScreen from '../screens/GoalsScreen';
import { goalProgressPercent } from '../core/finance';

jest.mock('../database/database', () => ({ getDatabase: jest.fn() }));
jest.mock('../context/CustomLogoContext', () => ({
  useCustomLogos: () => ({ logoFor: () => null, pickAndSetLogo: jest.fn(), removeLogo: jest.fn(), hasLogo: () => false }),
}));

const GOAL = {
  id: 1, name: 'Emergency Fund', target_amount: 3000, current_amount: 1240,
  deadline: null, goal_type: 'emergency', pinned: 0, custom_image_uri: null,
};

const mockDb = {
  getAllAsync: jest.fn().mockResolvedValue([GOAL]),
  getFirstAsync: jest.fn().mockResolvedValue(null),
  runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
};

function renderScreen() {
  return render(
    <SafeAreaProvider>
      <GoalsScreen navigation={{ goBack: jest.fn() }} route={{ params: {} }} />
    </SafeAreaProvider>
  );
}

describe('Goal progress agrees with the canonical engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { getDatabase } = require('../database/database');
    getDatabase.mockResolvedValue(mockDb);
    mockDb.getAllAsync.mockResolvedValue([GOAL]);
  });

  it('shows exactly the rounded canonical percentage for the fixture', async () => {
    const expected = Math.round(goalProgressPercent(GOAL.target_amount, GOAL.current_amount));
    expect(expected).toBe(41); // 1240/3000 = 41.33...% -> 41, sanity check on the fixture itself

    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText(`${expected}%`)).toBeTruthy());
  });
});
