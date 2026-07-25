'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);

let idCounter = 0;

const ICONS = { success: '✓', error: '✕', info: 'ℹ' };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const notify = useCallback((message, type = 'info') => {
    const id = ++idCounter;
    setToasts((current) => [...current, { id, message, type }]);
    timers.current[id] = setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toast-stack">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast-${toast.type}`}
            onClick={() => dismiss(toast.id)}
            role="status"
          >
            <span className="toast-icon">{ICONS[toast.type] || ICONS.info}</span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Retourne une fonction notify(message, 'success' | 'error' | 'info')
export function useToast() {
  const notify = useContext(ToastContext);
  if (!notify) {
    throw new Error('useToast doit être utilisé à l\'intérieur de <ToastProvider>');
  }
  return notify;
}
