'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { PaperSurface } from '@/app/components/ui/PaperSurface';

/**
 * One notification system for the whole app.
 *
 * This exists in the skeleton on purpose: every form the team writes tomorrow
 * needs to tell the user something went right or wrong, and without a shared
 * one you end up with three homegrown notification systems and three visual
 * languages for "error".
 *
 *   const toast = useToast();
 *   toast.success('Saved.');
 *   toast.error('That email is already registered.');
 */

type ToastTone = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VISIBLE_MS = 4500;

const TONE_ACCENT: Record<ToastTone, string> = {
  success: 'border-l-indigo',
  error: 'border-l-beni',
  info: 'border-l-cardboard-edge',
};

const TONE_LABEL: Record<ToastTone, string> = {
  success: 'Done',
  error: 'Problem',
  info: 'Note',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, tone, message }]);
      window.setTimeout(() => dismiss(id), VISIBLE_MS);
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      success: (message: string) => push('success', message),
      error: (message: string) => push('error', message),
      info: (message: string) => push('info', message),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Stack sits above everything, out of the way of thumbs on mobile. */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-3 bottom-3 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:items-end"
      >
        {toasts.map((toast) => (
          <PaperSurface
            key={toast.id}
            material="paper"
            elevation={3}
            className={cnToast(TONE_ACCENT[toast.tone])}
          >
            <div className="flex items-start gap-3 px-4 py-3">
              <span className="mt-0.5 font-mono text-[0.6875rem] tracking-wider text-ink-muted uppercase">
                {TONE_LABEL[toast.tone]}
              </span>
              <p className="min-w-0 flex-1 text-sm break-words text-ink">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="-mr-1 -mt-1 shrink-0 rounded-sm px-2 py-1 text-ink-muted hover:text-ink"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
          </PaperSurface>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Layout-only classes for a toast card, plus the tone accent stripe. */
function cnToast(accent: string): string {
  return `pointer-events-auto w-full max-w-sm border-l-4 ${accent}`;
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (context === null) throw new Error('useToast must be used inside <ToastProvider>.');
  return context;
}
