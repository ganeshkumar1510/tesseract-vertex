import { useCallback, useRef, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// useSubmitGuard — T-004: prevent duplicate form submissions.
// Wrap a submit handler; re-entrant calls are ignored until the wrapped
// handler finishes (sync handlers resolve immediately, promises on settle).
//
// Usage:
//   const { isSubmitting, guard } = useSubmitGuard();
//   const handleSubmit = guard((e) => { ... });
//   <Button type="submit" disabled={isSubmitting}>Save</Button>
// ─────────────────────────────────────────────────────────────────────────────

export function useSubmitGuard() {
  const inFlight = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const guard = useCallback(
    (fn) =>
      (...args) => {
        if (inFlight.current) return undefined;
        inFlight.current = true;
        setIsSubmitting(true);

        const finish = () => {
          inFlight.current = false;
          setIsSubmitting(false);
        };

        let result;
        try {
          result = fn(...args);
        } catch (err) {
          finish();
          throw err;
        }

        if (result && typeof result.then === 'function') {
          return result.finally(finish);
        }

        finish();
        return result;
      },
    []
  );

  return { isSubmitting, guard };
}
