import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import GoalProgressWidget from '../components/GoalProgressWidget';
import { SavingsGoal } from '../types';

const baseGoal: SavingsGoal = {
  id:             1,
  name:           'Hawaii Trip',
  target_amount:  5000,
  current_amount: 1500,
  deadline:       '2025-12-01',
  goal_type:      'vacation',
  pinned:         1,
};

const completedGoal: SavingsGoal = {
  ...baseGoal,
  id:             2,
  name:           'New Car',
  current_amount: 5000,
};

const zeroGoal: SavingsGoal = {
  ...baseGoal,
  id:             3,
  name:           'Empty Goal',
  current_amount: 0,
};

describe('GoalProgressWidget', () => {
  it('renders the goal name', () => {
    const { getByText } = render(<GoalProgressWidget goal={baseGoal} />);
    expect(getByText('Hawaii Trip')).toBeTruthy();
  });

  it('renders the correct percentage', () => {
    const { getByText } = render(<GoalProgressWidget goal={baseGoal} />);
    expect(getByText('30%')).toBeTruthy();
  });

  it('renders 0% for a goal with no progress', () => {
    const { getByText } = render(<GoalProgressWidget goal={zeroGoal} />);
    expect(getByText('0%')).toBeTruthy();
  });

  it('renders "X to go" for an incomplete goal', () => {
    const { getByText } = render(<GoalProgressWidget goal={baseGoal} />);
    expect(getByText('$3,500.00 to go')).toBeTruthy();
  });

  it('renders "Goal reached!" when complete', () => {
    const { getByText } = render(<GoalProgressWidget goal={completedGoal} />);
    expect(getByText('Goal reached!')).toBeTruthy();
  });

  it('does not render unpin button when onUnpin is not provided', () => {
    const { queryByTestId } = render(<GoalProgressWidget goal={baseGoal} />);
    expect(queryByTestId('unpin-button')).toBeNull();
  });

  it('renders unpin button when onUnpin is provided', () => {
    const onUnpin = jest.fn();
    const { getByTestId } = render(<GoalProgressWidget goal={baseGoal} onUnpin={onUnpin} />);
    expect(getByTestId('unpin-button')).toBeTruthy();
  });

  it('calls onUnpin when unpin button is pressed', () => {
    const onUnpin = jest.fn();
    const { getByTestId } = render(<GoalProgressWidget goal={baseGoal} onUnpin={onUnpin} />);
    fireEvent.press(getByTestId('unpin-button'));
    expect(onUnpin).toHaveBeenCalledTimes(1);
  });

  it('calls onPress when the widget is tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<GoalProgressWidget goal={baseGoal} onPress={onPress} />);
    fireEvent.press(getByText('Hawaii Trip'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('caps percentage at 100% even if current > target', () => {
    const overGoal = { ...baseGoal, current_amount: 9999 };
    const { getByText } = render(<GoalProgressWidget goal={overGoal} />);
    expect(getByText('100%')).toBeTruthy();
  });
});
