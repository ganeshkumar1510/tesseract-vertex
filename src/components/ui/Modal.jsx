import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import './Modal.css';

// ─────────────────────────────────────────────────────────────────────────────
// Modal — T-014: keyboard-accessible dialog.
// - Focus moves into the dialog on open (autoFocus wins, else first form control)
// - Tab is trapped inside; Escape closes; focus returns to the opener on close
// - Announced as role="dialog" with its title
// ─────────────────────────────────────────────────────────────────────────────

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function Modal({ isOpen, onClose, title, children }) {
  const contentRef = useRef(null);
  const openerRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return undefined;
    openerRef.current = document.activeElement;
    const raf = requestAnimationFrame(() => {
      const node = contentRef.current;
      if (!node) return;
      // Keep focus already placed by an element's autoFocus attribute.
      if (node.contains(document.activeElement) && document.activeElement !== node) return;
      const preferred = node.querySelector('input, select, textarea') || node.querySelector(FOCUSABLE) || node;
      preferred.focus();
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
      onClose();
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
    if (e.shiftKey && (document.activeElement === first || document.activeElement === node || !node.contains(document.activeElement))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={contentRef}
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <div className="modal-header">
          <h3 id={titleId} className="modal-title">{title}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close dialog"><X size={20} /></button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}
