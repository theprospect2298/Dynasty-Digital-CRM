import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-lg border shadow-xl backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${
              t.type === 'success'
                ? 'bg-[#11131F]/95 border-[#7CFF6B]/40 text-[#FFFFFF]'
                : t.type === 'error'
                ? 'bg-[#11131F]/95 border-[#FF5A5F]/40 text-[#FFFFFF]'
                : 'bg-[#11131F]/95 border-[#22D3EE]/40 text-[#FFFFFF]'
            }`}
          >
            <div className="flex items-center gap-2.5 text-sm">
              {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[#7CFF6B] shrink-0" />}
              {t.type === 'error' && <AlertCircle className="w-4 h-4 text-[#FF5A5F] shrink-0" />}
              {t.type === 'info' && <Info className="w-4 h-4 text-[#22D3EE] shrink-0" />}
              <span className="font-medium text-xs sm:text-sm">{t.message}</span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-[#A9ADC6] hover:text-white transition-colors p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
