import React, { useEffect, useId, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import './ConfirmModal.css';

// ─────────────────────────────────────────────────────────────────────────────
// ConfirmModal — T-002: accessible confirmation dialog for irreversible actions.
// - Escape cancels (and is stopped from reaching an underlying Modal)
// - Overlay click cancels; focus is trapped and restored to the opener
// - Safe default focus: Cancel button
// ─────────────────────────────────────────────────────────────────────────────

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function ConfirmModal({
  isOpen,
  title = 'Are you sure?',
  message,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  onConfirm,
  onCancel,
  isProcessing = false,
}) {
  const contentRef = useRef(null);
  const openerRef = useRef(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!isOpen) return undefined;
    openerRef.current = document.activeElement;
    const raf = requestAnimationFrame(() => {
      const node = contentRef.current;
      if (!node) return;
      const cancelBtn = node.querySelector('[data-confirm-cancel]');
      const firstFocusable = node.querySelector(FOCUSABLE);
      (cancelBtn || firstFocusable || node).focus();
    });
    return () => {
      cancelAnimationFrame(raf);
      const opener = openerRef.current;
      if (opener && typeof opener.focus === 'function') opener.focus();
    };
  }, [isOpen]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      e.preventDefault();
      if (!isProcessing) onCancel();
      return;
    }
    if (e.key !== 'Tab') return;
    const node = contentRef.current;
    if (!node) return;
    const focusables = [...node.querySelectorAll(FOCUSABLE)].filter((el) => !el.disabled);
    if (focusables.length === 0) {
      e.preventDefault();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  return (
    <div
      className="confirm-overlay"
      onClick={isProcessing ? undefined : onCancel}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={contentRef}
        className={`confirm-content confirm-content--${variant}`}
        role={isDanger ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={message || children ? descId : undefined}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {isDanger ? (
          <div className="confirm-icon confirm-icon--danger" aria-hidden="true">
            <AlertTriangle size={18} />
          </div>
        ) : null}
        <h3 id={titleId} className="confirm-title">{title}</h3>
        {message ? (
          <p id={descId} className="confirm-message">{message}</p>
        ) : null}
        {children ? <div id={descId} className="confirm-body">{children}</div> : null}
        <div className="confirm-actions">
          <Button
            type="button"
            variant="secondary"
            data-confirm-cancel
            onClick={onCancel}
            disabled={isProcessing}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={isDanger ? 'destructive' : 'primary'}
            onClick={onConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? 'Working…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
