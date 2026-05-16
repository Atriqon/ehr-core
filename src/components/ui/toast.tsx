'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Lightweight toast foundation ─────────────────────────────────────────────
//
// A tiny in-house toast system — no external dependency (Sonner is not
// installed and Phase 11 forbids adding heavy deps). Provides a single global
// `<ToastProvider>` mounted in the dashboard layout and a `useToast()` hook.
//
// This is a *foundation*: existing success/error banners are intentionally NOT
// migrated in this phase (Phase 11 §6). New flows can opt in via `useToast()`.

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 4000;

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = 'success') => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

/** Access the global toast dispatcher. Must be used under `<ToastProvider>`. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}

const VARIANT_STYLES: Record<
  ToastVariant,
  { icon: typeof Info; ring: string; iconColor: string }
> = {
  success: {
    icon: CheckCircle2,
    ring: 'ring-green-600/20',
    iconColor: 'text-green-600 dark:text-green-400',
  },
  error: {
    icon: XCircle,
    ring: 'ring-red-600/20',
    iconColor: 'text-red-600 dark:text-red-400',
  },
  info: {
    icon: Info,
    ring: 'ring-blue-600/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
};

function Toaster({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const { icon: Icon, ring, iconColor } = VARIANT_STYLES[t.variant];
        return (
          <div
            key={t.id}
            className={cn(
              'flex items-start gap-2.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-3 text-sm shadow-lg ring-1',
              'dark:border-zinc-700 dark:bg-zinc-900',
              ring,
            )}
          >
            <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', iconColor)} />
            <p className="flex-1 text-zinc-700 dark:text-zinc-200">{t.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              aria-label="Cerrar notificación"
              className="rounded p-0.5 text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
