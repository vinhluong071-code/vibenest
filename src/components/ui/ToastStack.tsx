'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

export interface VibeToastItem {
  id: string;
  message: string;
  createdAt: number;
}

interface ToastContextValue {
  showToast: (message: string) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_VISIBLE_TOASTS = 4;
const TOAST_DURATION_MS = 2600;

export function VibeToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<VibeToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: VibeToastItem = {
        id,
        message,
        createdAt: Date.now(),
      };

      setToasts((prev) => {
        const next = [...prev, newToast];
        if (next.length > MAX_VISIBLE_TOASTS) {
          const evicted = next.shift();
          if (evicted) {
            const oldTimer = timersRef.current.get(evicted.id);
            if (oldTimer) {
              clearTimeout(oldTimer);
              timersRef.current.delete(evicted.id);
            }
          }
        }
        return next;
      });

      const timer = setTimeout(() => {
        dismissToast(id);
      }, TOAST_DURATION_MS);
      timersRef.current.set(id, timer);
    },
    [dismissToast]
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 w-full max-w-[380px] px-4 pointer-events-none"
      >
        {toasts.map((toast, idx) => {
          const depthFromNewest = toasts.length - 1 - idx;
          const scale = Math.max(0.92, 1 - depthFromNewest * 0.03);
          const opacity = Math.max(0.74, 1 - depthFromNewest * 0.1);

          return (
            <div
              key={toast.id}
              role="status"
              onClick={() => dismissToast(toast.id)}
              style={{
                transform: `translateY(0) scale(${scale})`,
                opacity,
              }}
              className="pointer-events-auto cursor-pointer px-4 py-2.5 rounded-xl bg-[#161B2E]/95 border border-white/15 text-xs font-medium text-[#F3F5FA] shadow-xl backdrop-blur-xl flex items-center gap-2.5 max-w-full transition-[transform,opacity] duration-200 ease-out"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] shrink-0" />
              <span className="truncate">{toast.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useVibeToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useVibeToast must be used within a VibeToastProvider');
  }
  return ctx;
}
