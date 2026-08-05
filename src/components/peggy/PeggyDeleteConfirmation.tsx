import React from 'react';
import PeggyConfirmationModal from './PeggyConfirmationModal';

/**
 * PeggyDeleteConfirmation — the ONE destructive confirm. A thin specialization
 * of PeggyConfirmationModal (destructive defaults). No new visual is introduced;
 * every "are you sure you want to delete" uses this.
 */
interface Props {
  visible: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function PeggyDeleteConfirmation({
  visible,
  title = 'Delete this?',
  message = "This can't be undone.",
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: Props) {
  return (
    <PeggyConfirmationModal
      visible={visible}
      title={title}
      message={message}
      confirmLabel={confirmLabel}
      cancelLabel="Keep"
      destructive
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
