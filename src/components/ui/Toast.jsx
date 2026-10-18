import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useToastStore } from '../../store/toastStore';
import './Toast.css';

const TOAST_ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export function Toast({ toast }) {
  const removeToast = useToastStore((s) => s.removeToast);
  const {
    id,
    type = 'info',
    title,
    message,
    duration = 5000,
    count = 1,
    action,
  } = toast;

  const [paused, setPaused] = useState(false);
  const remainingRef = useRef(duration);
  const startedAtRef = useRef(0);
  const lastCountRef = useRef(count);

  // Auto-dismiss timer. Pauses on hover/focus without losing elapsed time;
  // if a duplicate toast merges in (count++), the timer restarts at full duration.
  useEffect(() => {
    if (!duration || duration <= 0) return undefined;
    if (lastCountRef.current !== count) {
      remainingRef.current = duration;
      lastCountRef.current = count;
    }
    if (paused) return undefined;
    startedAtRef.current = Date.now();
    const timer = setTimeout(() => removeToast(id), remainingRef.current);
    return () => {
      clearTimeout(timer);
      remainingRef.current = Math.max(
        0,
        remainingRef.current - (Date.now() - startedAtRef.current)
      );
    };
  }, [paused, duration, id, removeToast, count]);

  const Icon = TOAST_ICONS[type] || Info;

  const handleAction = () => {
    if (action && typeof action.onClick === 'function') action.onClick();
    removeToast(id);
  };

  return (
    <div
      className={`toast toast--${type}${paused ? ' is-paused' : ''}`}
      role={type === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <Icon size={18} className="toast-icon" aria-hidden="true" />
      <div className="toast-body">
        <div className="toast-heading">
          {title ? <span className="toast-title">{title}</span> : null}
          {count > 1 ? <span className="toast-count">×{count}</span> : null}
        </div>
        {message ? <p className="toast-message">{message}</p> : null}
        {action && action.label ? (
          <button type="button" className="toast-action" onClick={handleAction}>
            {action.label}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        className="toast-close"
        onClick={() => removeToast(id)}
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
      {duration > 0 ? (
        <span
          key={count}
          className="toast-progress"
          style={{ animationDuration: `${duration}ms` }}
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}
