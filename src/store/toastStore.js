import { create } from 'zustand';

// ─────────────────────────────────────────────────────────────────────────────
// toastStore — global, ephemeral notification queue
// T-001: single source of truth for toast notifications across the app.
// Toasts are NOT persisted (intentionally not added to useAppStore persist).
// ─────────────────────────────────────────────────────────────────────────────

let toastSeq = 0;
const MAX_VISIBLE = 4;
const DEDUPE_WINDOW_MS = 1000;

export const useToastStore = create((set, get) => ({
  toasts: [],

  /**
   * Push a toast onto the queue.
   * @param {object} toast
   * @param {'success'|'error'|'warning'|'info'} [toast.type]
   * @param {string} [toast.title]
   * @param {string} [toast.message]
   * @param {number} [toast.duration] ms before auto-dismiss; 0 = persist until dismissed
   * @param {{ label: string, onClick: Function }} [toast.action]
   * @returns {number} the toast id
   */
  addToast: (toast) => {
    const now = Date.now();
    const {
      type = 'info',
      title = '',
      message = '',
      duration = 5000,
      action = null,
    } = toast || {};

    // Merge rapid duplicates (e.g. repeated saves) into a single toast with a count.
    const duplicate = get().toasts.find(
      (t) =>
        t.type === type &&
        t.title === title &&
        t.message === message &&
        now - t.createdAt < DEDUPE_WINDOW_MS
    );
    if (duplicate) {
      set((state) => ({
        toasts: state.toasts.map((t) =>
          t.id === duplicate.id ? { ...t, count: t.count + 1, createdAt: now } : t
        ),
      }));
      return duplicate.id;
    }

    const id = ++toastSeq;
    set((state) => ({
      toasts: [
        ...state.toasts,
        { id, type, title, message, duration, action, count: 1, createdAt: now },
      ].slice(-MAX_VISIBLE),
    }));
    return id;
  },

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  clearToasts: () => set({ toasts: [] }),
}));
