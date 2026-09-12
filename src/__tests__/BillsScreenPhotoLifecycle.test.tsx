/**
 * Section 9 — deleting a bill PLAN must not orphan its photo, and must
 * never touch a photo still referenced by anything else.
 *
 * Runs against a REAL SQLite database (the same makeRealDb() the finance
 * and write-path tests use) rather than a mocked one, since the fix reads
 * the row back, deletes it, then re-queries both bills and expenses to
 * decide whether the file is still owned by anything — a mock would only
 * prove the mock was told what to return.
 *
 * The confirm tap is fired plainly (not wrapped in an async act()) and
 * verified by polling the database with waitFor: wrapping it in act()
 * here stalls the test runner until timeout, because BillsScreen's
 * post-delete reload (loadAll) chains several more awaits than the simpler
 * screens do. Each test also unmounts before finishing, since leaving the
 * screen mounted has the same stalling effect independently of this fix.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BillsScreen from '../screens/BillsScreen';
import { makeRealDb } from './helpers/realDb';

jest.mock('../database/database', () => ({ getDatabase: jest.fn() }));
jest.mock('../lib/notifications', () => ({
  getNotificationMode: jest.fn().mockResolvedValue('off'),
  rescheduleAll: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../lib/merchantMemory', () => ({
  rememberMerchant: jest.fn().mockResolvedValue(undefined),
  recallMerchant: jest.fn().mockResolvedValue(null),
}));
jest.mock('../context/CustomLogoContext', () => ({
  useCustomLogos: () => ({ logoFor: () => null, pickAndSetLogo: jest.fn(), removeLogo: jest.fn(), hasLogo: () => false }),
}));
jest.mock('../lib/receiptStorage', () => ({
  isOwnedReceipt: (uri: string | null | undefined) => !!uri && uri.startsWith('file:///receipts/'),
  deleteReceiptImage: jest.fn().mockResolvedValue(undefined),
}));

const mockNav = { navigate: jest.fn(), goBack: jest.fn(), canGoBack: () => true };

let db: any;

function renderScreen() {
  return render(<SafeAreaProvider><BillsScreen navigation={mockNav} route={{ params: {} }} /></SafeAreaProvider>);
}

describe('BillsScreen photo lifecycle on plan deletion', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    db = makeRealDb();
    require('../database/database').getDatabase.mockResolvedValue(db);
    await db.runAsync(
      `INSERT INTO bills (id, name, amount, due_day, photo_uri) VALUES (1, 'Hydro', 88.5, 15, 'file:///receipts/hydro.jpg')`
    );
  });

  it('THE BUG: deleting a bill whose photo nothing else references deletes the file', async () => {
    const { getByText, unmount } = renderScreen();
    await waitFor(() => getByText('Hydro'));
    fireEvent.press(getByText('Hydro'));
    await waitFor(() => getByText('Delete'));
    fireEvent.press(getByText('Delete'));
    await waitFor(() => getByText('Delete this bill?'));
    fireEvent.press(getByText('Delete'));

    await waitFor(async () => {
      expect(await db.getAllAsync(`SELECT * FROM bills`)).toHaveLength(0);
    });
    const { deleteReceiptImage } = require('../lib/receiptStorage');
    expect(deleteReceiptImage).toHaveBeenCalledWith('file:///receipts/hydro.jpg');
    unmount();
  });

  it('does not delete a photo still shared by another bill', async () => {
    await db.runAsync(
      `INSERT INTO bills (id, name, amount, due_day, photo_uri) VALUES (2, 'Hydro Backup', 88.5, 15, 'file:///receipts/hydro.jpg')`
    );
    const { getByText, getAllByText, unmount } = renderScreen();
    await waitFor(() => getByText('Hydro'));
    fireEvent.press(getByText('Hydro'));
    await waitFor(() => getByText('Delete'));
    fireEvent.press(getByText('Delete'));
    await waitFor(() => getByText('Delete this bill?'));
    fireEvent.press(getAllByText('Delete')[getAllByText('Delete').length - 1]);

    await waitFor(async () => {
      expect(await db.getAllAsync(`SELECT * FROM bills`)).toHaveLength(1);
    });
    const { deleteReceiptImage } = require('../lib/receiptStorage');
    expect(deleteReceiptImage).not.toHaveBeenCalled();
    unmount();
  });

  it('does not delete a photo still shared by an expense', async () => {
    await db.runAsync(
      `INSERT INTO expenses (id, amount, category, date, photo_uri) VALUES (1, 12, 'groceries', '2026-08-01', 'file:///receipts/hydro.jpg')`
    );
    const { getByText, getAllByText, unmount } = renderScreen();
    await waitFor(() => getByText('Hydro'));
    fireEvent.press(getByText('Hydro'));
    await waitFor(() => getByText('Delete'));
    fireEvent.press(getByText('Delete'));
    await waitFor(() => getByText('Delete this bill?'));
    fireEvent.press(getAllByText('Delete')[getAllByText('Delete').length - 1]);

    await waitFor(async () => {
      expect(await db.getAllAsync(`SELECT * FROM bills`)).toHaveLength(0); // the bill itself is still gone
    });
    const { deleteReceiptImage } = require('../lib/receiptStorage');
    expect(deleteReceiptImage).not.toHaveBeenCalled();
    unmount();
  });
});
