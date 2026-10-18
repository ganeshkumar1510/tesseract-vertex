import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────────────────
// useQueryParams — T-007: URL-synced filter state.
// Read filter values directly from the URL; updates use history `replace` so
// typing in a filter does not spam browser history. Refresh, share and
// back/forward all preserve the current filter state.
//
// Usage:
//   const { getParam, setParam } = useQueryParams();
//   const q = getParam('q');
//   <input value={q} onChange={(e) => setParam('q', e.target.value)} />
// ─────────────────────────────────────────────────────────────────────────────

export function useQueryParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const getParam = useCallback(
    (key, fallback = '') => {
      const value = searchParams.get(key);
      return value === null ? fallback : value;
    },
    [searchParams]
  );

  const setParam = useCallback(
    (key, value) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value === '' || value === null || value === undefined) {
            next.delete(key);
          } else {
            next.set(key, String(value));
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setParams = useCallback(
    (updates) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(updates).forEach(([key, value]) => {
            if (value === '' || value === null || value === undefined) {
              next.delete(key);
            } else {
              next.set(key, String(value));
            }
          });
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  return { getParam, setParam, setParams };
}
