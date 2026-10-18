import { useCallback, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// useDiscardGuard — T-003: protect unsaved form input inside modals.
// Wrap a form modal's onClose with `requestClose`. When the form is dirty,
// a confirmation dialog is shown instead of silently discarding the input.
//
// Usage:
//   const { requestClose, discardModalProps } = useDiscardGuard({ isDirty, onClose: closeModal });
//   <Modal isOpen={...} onClose={requestClose}> ... </Modal>
//   <ConfirmModal {...discardModalProps} />
// ─────────────────────────────────────────────────────────────────────────────

export function useDiscardGuard({
  isDirty,
  onClose,
  title = 'Discard unsaved changes?',
  message = 'You have unsaved changes. They will be lost if you close this form.',
  confirmLabel = 'Discard changes',
}) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const requestClose = useCallback(() => {
    if (isDirty) {
      setIsConfirmOpen(true);
      return;
    }
    onClose();
  }, [isDirty, onClose]);

  const cancelDiscard = useCallback(() => setIsConfirmOpen(false), []);

  const confirmDiscard = useCallback(() => {
    setIsConfirmOpen(false);
    onClose();
  }, [onClose]);

  const discardModalProps = {
    isOpen: isConfirmOpen,
    title,
    message,
    confirmLabel,
    variant: 'danger',
    onConfirm: confirmDiscard,
    onCancel: cancelDiscard,
  };

  return { requestClose, discardModalProps };
}
