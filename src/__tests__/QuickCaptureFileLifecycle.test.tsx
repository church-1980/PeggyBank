/**
 * Section 8 — QuickCapture must not leak files it made for a capture that
 * was never saved.
 *
 * TWO KINDS OF FILE:
 *   TEMPORARY CAPTURE FILE  — the raw camera/gallery cache file (tempUri).
 *   AUTHORITATIVE RECEIPT FILE — the copy made into PeggyBank's own
 *   receipts folder the moment "Use Photo" is tapped (ownedUri). It only
 *   becomes truly authoritative once a transaction is saved with it; before
 *   that, abandoning the capture must delete it too, or it sits on the
 *   phone forever with nothing ever pointing at it.
 *
 * These tests prove retake() and Cancel actually call the cleanup
 * functions with the files currently in play — not that the cleanup
 * functions themselves work (receiptStorage.test.ts already proves that).
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import QuickCaptureScreen from '../screens/QuickCaptureScreen';

jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    CameraView: React.forwardRef((props: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        takePictureAsync: jest.fn().mockResolvedValue({ uri: 'file:///cache/temp-capture.jpg' }),
      }));
      return React.createElement(View, props);
    }),
    useCameraPermissions: () => [{ granted: true, canAskAgain: true }, jest.fn()],
  };
});

jest.mock('../lib/receiptStorage', () => ({
  saveAcceptedImage: jest.fn().mockResolvedValue('file:///receipts/owned-123.jpg'),
  deleteTempImage: jest.fn().mockResolvedValue(undefined),
  deleteReceiptImage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../lib/recognition', () => ({
  recognizer: {
    // ok:false always routes to 'review' (captureRoute.ts), regardless of
    // docType, so the review screen's Retake/Cancel are reliably reachable.
    recognize: jest.fn().mockResolvedValue({ ok: false, rawTextLength: 0, docType: 'unknown', confidence: {} }),
  },
}));

jest.mock('../lib/merchantMemory', () => ({
  recallMerchant: jest.fn().mockResolvedValue(null),
}));

jest.mock('../database/database', () => ({ getDatabase: jest.fn() }));

const mockDb = { getAllAsync: jest.fn(), getFirstAsync: jest.fn(), runAsync: jest.fn() };
const mockNav = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn(), canGoBack: () => true };

function renderScreen() {
  return render(<SafeAreaProvider><QuickCaptureScreen navigation={mockNav} /></SafeAreaProvider>);
}

describe('QuickCapture temp/owned file cleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    require('../database/database').getDatabase.mockResolvedValue(mockDb);
  });

  it('Cancel from the preview stage deletes the temp capture file', async () => {
    const { getByLabelText, getByText } = renderScreen();
    await act(async () => { fireEvent.press(getByLabelText('Take photo')); });
    await waitFor(() => getByText('Cancel'));

    const { deleteTempImage } = require('../lib/receiptStorage');
    expect(deleteTempImage).not.toHaveBeenCalled();

    await act(async () => { fireEvent.press(getByText('Cancel')); });
    expect(deleteTempImage).toHaveBeenCalledWith('file:///cache/temp-capture.jpg');
  });

  it('Retake from the preview stage deletes the temp capture file', async () => {
    const { getByLabelText, getByText } = renderScreen();
    await act(async () => { fireEvent.press(getByLabelText('Take photo')); });
    await waitFor(() => getByText('Retake'));

    await act(async () => { fireEvent.press(getByText('Retake')); });
    const { deleteTempImage } = require('../lib/receiptStorage');
    expect(deleteTempImage).toHaveBeenCalledWith('file:///cache/temp-capture.jpg');
  });

  it('THE BUG: Cancel from the review stage deletes the abandoned owned receipt copy', async () => {
    const { getByLabelText, getByText } = renderScreen();
    await act(async () => { fireEvent.press(getByLabelText('Take photo')); });
    await waitFor(() => getByText('Use Photo'));
    await act(async () => { fireEvent.press(getByText('Use Photo')); });

    await waitFor(() => getByText('Cancel'));
    const { deleteReceiptImage } = require('../lib/receiptStorage');
    expect(deleteReceiptImage).not.toHaveBeenCalled();

    await act(async () => { fireEvent.press(getByText('Cancel')); });
    expect(deleteReceiptImage).toHaveBeenCalledWith('file:///receipts/owned-123.jpg');
  });

  it('THE BUG: Retake from the review stage deletes the abandoned owned receipt copy', async () => {
    const { getByLabelText, getByText } = renderScreen();
    await act(async () => { fireEvent.press(getByLabelText('Take photo')); });
    await waitFor(() => getByText('Use Photo'));
    await act(async () => { fireEvent.press(getByText('Use Photo')); });

    await waitFor(() => getByText('Retake'));
    const { deleteReceiptImage } = require('../lib/receiptStorage');
    expect(deleteReceiptImage).not.toHaveBeenCalled();

    await act(async () => { fireEvent.press(getByText('Retake')); });
    expect(deleteReceiptImage).toHaveBeenCalledWith('file:///receipts/owned-123.jpg');
  });
});
