'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/app/lib/utils';

/**
 * A trigger button that opens a small menu of actions.
 *
 * Used for the per-row "⋯" menus on admin panels. There is no dependency on a
 * popper library: the menu is rendered into a portal anchored to the trigger's
 * on-screen position. The portal matters — admin rows live inside overflow-
 * clipped cards, so an absolutely positioned child would be cut off; drawing
 * over the body keeps the menu visible whatever the surrounding layout is.
 *
 * Outside click and Escape both close it, and it is keyboard-reachable because
 * the trigger is a real <button>.
 */

export interface DropdownMenuItem {
  label: string;
  onClick: () => void;
  /** Danger renders in the danger colour — for destructive actions. */
  tone?: 'default' | 'danger';
  /** Hidden actions (e.g. "Unban" replaces "Ban") are excluded from the menu. */
  hidden?: boolean;
}

export interface DropdownMenuProps {
  /** The trigger — usually a "⋯" icon button. */
  trigger: ReactNode;
  /** `aria-label` for the trigger button. */
  triggerLabel: string;
  items: DropdownMenuItem[];
  /** LAYOUT ONLY — margin, width, grid/flex placement. */
  className?: string;
}

/** Steady-state width to lay out with before the menu's own width is known. */
const ESTIMATED_WIDTH = 192;
/** Gap between the trigger and the menu, in px. */
const GAP_PX = 8;

export function DropdownMenu({ trigger, triggerLabel, items, className }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const lastPositionRef = useRef<{ top: number; left: number } | null>(null);

  const visibleItems = items.filter((item) => !item.hidden);

  /**
   * Anchors the menu just below the trigger, right-aligned to it, clamped so
   * it never runs off a screen edge. Re-runs as the menu's real size becomes
   * known and while the page scrolls or resizes.
   */
  const measure = () => {
    const button = triggerRef.current;
    if (button === null) return;

    const rect = button.getBoundingClientRect();
    const width = menuRef.current?.offsetWidth ?? ESTIMATED_WIDTH;
    const next = {
      top: rect.bottom + GAP_PX,
      left: Math.max(GAP_PX, Math.min(rect.right - width, window.innerWidth - width - GAP_PX)),
    };

    const last = lastPositionRef.current;
    if (last === null || Math.abs(last.top - next.top) > 1 || Math.abs(last.left - next.left) > 1) {
      setPosition(next);
      lastPositionRef.current = next;
    }
  };

  useLayoutEffect(() => {
    if (!open) return;

    measure();
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) lastPositionRef.current = null;
  }, [open]);

  if (visibleItems.length === 0) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          className,
          'surface-crumpled pressable inline-flex size-9 items-center justify-center rounded-[var(--radius-cut-sm)] border border-crease text-ink-muted transition-colors hover:text-ink',
        )}
      >
        {trigger}
      </button>

      {open && position !== null
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              className="surface-crumpled elevation-2 fixed z-50 min-w-44 overflow-hidden rounded-[var(--radius-cut-sm)] border border-crease p-1"
              style={{ top: position.top, left: position.left }}
            >
              {visibleItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    item.onClick();
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-[var(--radius-cut-sm)] px-3 py-2 text-left font-body text-sm transition-colors',
                    item.tone === 'danger'
                      ? 'text-beni hover:bg-beni/10'
                      : 'text-ink hover:bg-paper-sunken',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}