/**
 * D5 — merchant memory assists manual (typed) entry, not just Smart Capture.
 *
 * recallMerchant() was already used by QuickCaptureScreen (the camera flow)
 * but never called from AddExpenseScreen (typed entry). A user typing the
 * same merchant name for the fifth time got no benefit from four prior
 * corrections, even though the app had already learned the category.
 *
 * Rule proven here, mirroring the SAME "only ever fills a blank" pattern
 * this screen already uses for its own receipt-photo path (readIntoBlanks):
 * the suggestion fills the category, never invents an amount, and never
 * touches a pre-filled/editing category.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AddExpenseScreen from '../screens/AddExpenseScreen';

jest.mock('../database/database', () => ({ getDatabase: jest.fn() }));
jest.mock('../context/CustomLogoContext', () => ({
  useCustomLogos: () => ({ logoFor: () => null, pickAndSetLogo: jest.fn(), removeLogo: jest.fn(), hasLogo: () => false }),
}));

const mockDb = {
  getAllAsync: jest.fn().mockResolvedValue([]),
  getFirstAsync: jest.fn().mockResolvedValue(null),
  runAsync: jest.fn().mockResolvedValue({ changes: 1, lastInsertRowId: 1 }),
};

jest.mock('../lib/merchantMemory', () => ({
  recallMerchant: jest.fn(),
  rememberMerchant: jest.fn().mockResolvedValue(undefined),
}));

const mockNav = { navigate: jest.fn(), goBack: jest.fn(), canGoBack: jest.fn().mockReturnValue(true) };

function renderScreen(routeParams: any = {}) {
  return render(
    <SafeAreaProvider>
      <AddExpenseScreen navigation={mockNav} route={{ params: routeParams }} />
    </SafeAreaProvider>
  );
}

describe('Manual expense entry recalls merchant memory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { getDatabase } = require('../database/database');
    getDatabase.mockResolvedValue(mockDb);
    mockDb.getAllAsync.mockResolvedValue([]);
    mockDb.getFirstAsync.mockResolvedValue(null);
    mockDb.runAsync.mockResolvedValue({ changes: 1, lastInsertRowId: 1 });
  });

  it('suggests the remembered category once the merchant name is typed and blurred', async () => {
    const { recallMerchant } = require('../lib/merchantMemory');
    recallMerchant.mockResolvedValue({
      nameKey: 'tim hortons', displayName: 'Tim Hortons', docType: 'expense',
      category: 'restaurant', recurring: false, timesSeen: 4,
    });

    const { getByPlaceholderText, getByText } = renderScreen();

    fireEvent.changeText(getByPlaceholderText("Dunn's, Shell, Metro…"), 'Tim Hortons');
    fireEvent(getByPlaceholderText("Dunn's, Shell, Metro…"), 'blur');
    await waitFor(() => expect(recallMerchant).toHaveBeenCalledWith('Tim Hortons'));

    fireEvent.changeText(getByPlaceholderText('0.00'), '12.34');
    fireEvent.press(getByText('Save'));

    await waitFor(() => expect(mockDb.runAsync).toHaveBeenCalled());
    const insertCall = mockDb.runAsync.mock.calls.find((c: any[]) => /INSERT INTO expenses/.test(c[0]));
    expect(insertCall).toBeDefined();
    // args: [amount, category, note, date, photo_uri, is_recurring]
    expect(insertCall![1][1]).toBe('restaurant'); // the recalled category, not the default
  });

  it('never invents an amount from history — only the category is suggested', async () => {
    const { recallMerchant } = require('../lib/merchantMemory');
    recallMerchant.mockResolvedValue({
      nameKey: 'tim hortons', displayName: 'Tim Hortons', docType: 'expense',
      category: 'restaurant', avgAmount: 6.5, lastAmount: 6.5, recurring: false, timesSeen: 4,
    });

    const { getByPlaceholderText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText("Dunn's, Shell, Metro…"), 'Tim Hortons');
    fireEvent(getByPlaceholderText("Dunn's, Shell, Metro…"), 'blur');
    await waitFor(() => expect(recallMerchant).toHaveBeenCalled());

    // The amount field is left exactly as the user left it: empty.
    expect(getByPlaceholderText('0.00').props.value).toBe('');
  });

  it('does not overwrite the category when editing an existing expense', async () => {
    const { recallMerchant } = require('../lib/merchantMemory');
    recallMerchant.mockResolvedValue({
      nameKey: 'tim hortons', displayName: 'Tim Hortons', docType: 'expense',
      category: 'restaurant', recurring: false, timesSeen: 4,
    });

    const { getByPlaceholderText } = renderScreen({
      id: 1, amount: 12.34, category: 'other', note: 'Tim Hortons', date: '2026-08-01',
    });

    // Editing already shows the note; blurring it again must not silently
    // reclassify a category the person already chose (or is correcting).
    fireEvent(getByPlaceholderText("Dunn's, Shell, Metro…"), 'blur');
    await waitFor(() => new Promise(r => setTimeout(r, 0)));
    expect(recallMerchant).not.toHaveBeenCalled();
  });
});
