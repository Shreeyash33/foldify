'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/app/lib/utils';

/**
 * A trigger button that opens a small absolute-positioned menu of actions.
 *
 * Used for the per-row "⋯" menus on admin panels. There is no dependency on a
 * popper library: the menu is absolutely positioned to the trigger's wrapped
 * container, which is enough here because the menus open downwards inside a
 * list of full-width cards.
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

export function DropdownMenu({ trigger, triggerLabel, items, className }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleItems = items.filter((item) => !item.hidden);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current !== null && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
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

  if (visibleItems.length === 0) return null;

  return (
    <div ref={containerRef} className={cn(className, 'relative')}>
      <button
        type="button"
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="surface-crumpled pressable inline-flex size-9 items-center justify-center rounded-[var(--radius-cut-sm)] border border-crease text-ink-muted transition-colors hover:text-ink"
      >
        {trigger}
      </button>

      {open ? (
        <div
          role="menu"
          className="surface-crumpled elevation-2 absolute right-0 z-30 mt-1.5 min-w-44 overflow-hidden rounded-[var(--radius-cut-sm)] border border-crease p-1"
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
        </div>
      ) : null}
    </div>
  );
}