import React from 'react';
import { useToastStore } from '../../store/toastStore';
import { Toast } from './Toast';
import './Toast.css';

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-label="Notifications">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
