import { useMemo } from 'react';
import { useToastStore } from '../store/toastStore';

// ─────────────────────────────────────────────────────────────────────────────
// useToast — ergonomic access to the global toast queue (T-001)
// Usage: const toast = useToast(); toast.success('Saved', 'Optional detail');
// ─────────────────────────────────────────────────────────────────────────────

export function useToast() {
  const addToast = useToastStore((s) => s.addToast);
  const removeToast = useToastStore((s) => s.removeToast);
  const clearToasts = useToastStore((s) => s.clearToasts);

  return useMemo(
    () => ({
      toast: addToast,
      success: (title, message, opts = {}) =>
        addToast({ type: 'success', title, message, duration: 5000, ...opts }),
      error: (title, message, opts = {}) =>
        addToast({ type: 'error', title, message, duration: 8000, ...opts }),
      warning: (title, message, opts = {}) =>
        addToast({ type: 'warning', title, message, duration: 6000, ...opts }),
      info: (title, message, opts = {}) =>
        addToast({ type: 'info', title, message, duration: 5000, ...opts }),
      dismiss: removeToast,
      clear: clearToasts,
    }),
    [addToast, removeToast, clearToasts]
  );
}
