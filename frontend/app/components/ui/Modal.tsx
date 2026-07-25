'use client';

import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useIsHydrated } from '@/app/lib/hooks';
import { cn } from '@/app/lib/utils';
import { PaperSurface } from './PaperSurface';

/**
 * A sheet of raised paper over a dimmed page.
 *
 * Handles, so no page has to: portal to <body>, focus trap, Escape to close,
 * backdrop click to close, scroll lock on the page behind, `aria-modal` and a
 * labelled title, and focus restored to whatever opened it.
 *
 * The backdrop is a flat translucent colour, NOT `backdrop-filter: blur()` —
 * a full-screen blur is the single most expensive thing you can ask an
 * integrated GPU to do, and it would drop frames on every open.
 */

export type ModalSize = 'sm' | 'md' | 'lg';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: ModalSize;
  /** Buttons for the footer. Omit for a modal with no actions. */
  footer?: ReactNode;
  children?: ReactNode;
  /** LAYOUT ONLY — margin, width, grid/flex placement. */
  className?: string;
}

const SIZE: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  isOpen,
  onClose,
  title,
  size = 'md',
  footer,
  children,
  className,
}: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  // Portals cannot render during SSR — document does not exist there.
  const isHydrated = useIsHydrated();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || panelRef.current === null) return;

      // Focus trap: wrap from the last focusable element back to the first.
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (first === undefined || last === undefined) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // Scroll lock. Restoring the exact previous value avoids clobbering a
    // page that had its own overflow setting.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    document.addEventListener('keydown', handleKeyDown);

    // Move focus into the dialog so the keyboard is immediately inside it.
    const firstFocusable = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    (firstFocusable ?? panelRef.current)?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus();
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !isHydrated) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="presentation"
    >
      {/* Flat dim, never a blur. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-[color:var(--shadow-deep)]"
      />

      <PaperSurface
        material="paper"
        elevation={3}
        className={cn(
          className,
          'relative flex max-h-[90vh] w-full flex-col',
          SIZE[size],
          // Full width on a phone, a centred sheet from `sm` up.
          'rounded-b-none sm:rounded-b-[inherit]',
        )}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="flex min-h-0 flex-col"
        >
          <div className="flex items-start justify-between gap-4 border-b border-crease px-5 py-4">
            <h2 id={titleId} className="font-display text-xl text-ink">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="-mt-1 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-cut-sm)] text-ink-muted hover:text-ink"
            >
              <span aria-hidden="true" className="text-xl leading-none">
                ×
              </span>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 font-body text-ink">
            {children}
          </div>

          {footer !== undefined ? (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-crease px-5 py-4">
              {footer}
            </div>
          ) : null}
        </div>
      </PaperSurface>
    </div>,
    document.body,
  );
}
