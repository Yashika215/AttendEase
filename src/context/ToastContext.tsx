import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (type: ToastType, title: string, message: string, duration?: number) => void;
  success: (title: string, message: string, duration?: number) => void;
  error: (title: string, message: string, duration?: number) => void;
  warning: (title: string, message: string, duration?: number) => void;
  info: (title: string, message: string, duration?: number) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, title: string, message: string, duration = 4000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const item: ToastItem = { id, type, title, message, duration };
      setToasts((prev) => [...prev, item]);
      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
    },
    [dismissToast]
  );

  const success = useCallback(
    (title: string, message: string, duration?: number) => showToast('success', title, message, duration),
    [showToast]
  );
  const error = useCallback(
    (title: string, message: string, duration?: number) => showToast('error', title, message, duration),
    [showToast]
  );
  const warning = useCallback(
    (title: string, message: string, duration?: number) => showToast('warning', title, message, duration),
    [showToast]
  );
  const info = useCallback(
    (title: string, message: string, duration?: number) => showToast('info', title, message, duration),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, success, error, warning, info, dismissToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed top-24 right-6 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((toast) => {
          let icon = <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
          let containerCls =
            'bg-white dark:bg-slate-900 border-emerald-500/40 text-slate-800 dark:text-slate-100 shadow-emerald-500/10';
          let badgeCls = 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300';

          if (toast.type === 'error') {
            icon = <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />;
            containerCls =
              'bg-white dark:bg-slate-900 border-red-500/40 text-slate-800 dark:text-slate-100 shadow-red-500/10';
            badgeCls = 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300';
          } else if (toast.type === 'warning') {
            icon = <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
            containerCls =
              'bg-white dark:bg-slate-900 border-amber-500/40 text-slate-800 dark:text-slate-100 shadow-amber-500/10';
            badgeCls = 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300';
          } else if (toast.type === 'info') {
            icon = <Info className="w-5 h-5 text-blue-500 shrink-0" />;
            containerCls =
              'bg-white dark:bg-slate-900 border-blue-500/40 text-slate-800 dark:text-slate-100 shadow-blue-500/10';
            badgeCls = 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300';
          }

          return (
            <div
              key={toast.id}
              role="alert"
              className={`pointer-events-auto p-4 rounded-2xl border shadow-xl backdrop-blur-md flex items-start gap-3 transition-all ${containerCls}`}
            >
              <div className="pt-0.5">{icon}</div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold leading-tight">{toast.title}</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${badgeCls}`}>
                    {toast.type}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};
