import React from 'react';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('../database/database', () => ({
  getDatabase: jest.fn(),
}));

jest.mock('../components/GoalProgressWidget', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return ({ goal }: any) => React.createElement(Text, { testID: 'goal-widget' }, goal.name);
});

const mockDb = {
  getFirstAsync: jest.fn(),
  getAllAsync:   jest.fn(),
  runAsync:      jest.fn().mockResolvedValue({ changes: 1 }),
  execAsync:     jest.fn().mockResolvedValue(undefined),
};

const mockBills = [
  { id: 1, name: 'Netflix', amount: 15.99, due_day: 15, is_paid: 0, frequency: 'monthly' },
];

const mockPinnedGoal = [
  { id: 1, name: 'Hawaii Trip', target_amount: 5000, current_amount: 1500, pinned: 1, goal_type: 'vacation' },
];

const mockNav = {
  navigate:  jest.fn(),
  goBack:    jest.fn(),
  replace:   jest.fn(),
  canGoBack: jest.fn().mockReturnValue(true),
};

function withProviders(ui: React.ReactElement) {
  return <SafeAreaProvider>{ui}</SafeAreaProvider>;
}

describe('DashboardScreen section order', () => {
  beforeEach(() => {
    const { getDatabase } = require('../database/database');
    mockDb.getFirstAsync.mockImplementation((sql: string) => {
      if (sql.includes('expenses')) return Promise.resolve({ total: 800 });
      if (sql.includes('income'))   return Promise.resolve({ total: 3000 });
      if (sql.includes('payday'))   return Promise.resolve({ value: '15' });
      return Promise.resolve(null);
    });
    mockDb.getAllAsync.mockImplementation((sql: string) => {
      if (sql.includes('savings_goals') && sql.includes('pinned = 1'))
        return Promise.resolve(mockPinnedGoal);
      if (sql.includes('savings_goals'))
        return Promise.resolve(mockPinnedGoal);
      if (sql.includes('bills'))
        return Promise.resolve(mockBills);
      return Promise.resolve([]);
    });
    getDatabase.mockResolvedValue(mockDb);
  });

  it('renders Safe to spend text', async () => {
    const DashboardScreen = require('../screens/DashboardScreen').default;
    const { findByText } = render(withProviders(<DashboardScreen navigation={mockNav} />));
    expect(await findByText(/Safe to spend/i)).toBeTruthy();
  });

  it('renders Coming Up section', async () => {
    const DashboardScreen = require('../screens/DashboardScreen').default;
    const { findByText } = render(withProviders(<DashboardScreen navigation={mockNav} />));
    expect(await findByText('Coming Up')).toBeTruthy();
  });

  it('renders Your Goals section', async () => {
    const DashboardScreen = require('../screens/DashboardScreen').default;
    const { findByText } = render(withProviders(<DashboardScreen navigation={mockNav} />));
    expect(await findByText('Your Goals')).toBeTruthy();
  });

  it('renders the pinned goal widget', async () => {
    const DashboardScreen = require('../screens/DashboardScreen').default;
    const { findByTestId } = render(withProviders(<DashboardScreen navigation={mockNav} />));
    expect(await findByTestId('goal-widget')).toBeTruthy();
  });
});

describe('DashboardScreen empty goal state', () => {
  beforeEach(() => {
    const { getDatabase } = require('../database/database');
    mockDb.getFirstAsync.mockImplementation((sql: string) => {
      if (sql.includes('payday')) return Promise.resolve({ value: '15' });
      return Promise.resolve({ total: 0 });
    });
    mockDb.getAllAsync.mockResolvedValue([]);
    getDatabase.mockResolvedValue(mockDb);
  });

  it('shows empty state text when no pinned goals', async () => {
    const DashboardScreen = require('../screens/DashboardScreen').default;
    const { findByText } = render(withProviders(<DashboardScreen navigation={mockNav} />));
    expect(await findByText('No featured goal')).toBeTruthy();
  });

  it('shows "Pin a goal" sub-text', async () => {
    const DashboardScreen = require('../screens/DashboardScreen').default;
    const { findByText } = render(withProviders(<DashboardScreen navigation={mockNav} />));
    expect(await findByText('Pin a goal to track your progress here.')).toBeTruthy();
  });

  it('shows Browse button', async () => {
    const DashboardScreen = require('../screens/DashboardScreen').default;
    const { findByText } = render(withProviders(<DashboardScreen navigation={mockNav} />));
    expect(await findByText('Browse')).toBeTruthy();
  });
});
