'use client';

import { useCallback, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/app/lib/utils';

/**
 * Tabs that work controlled or uncontrolled.
 *
 *   <Tabs items={items} defaultValue="one" />            // uncontrolled
 *   <Tabs items={items} value={v} onValueChange={setV} />  // controlled
 *
 * Follows the WAI-ARIA tabs pattern: arrow keys move between tabs, Home and
 * End jump to the ends, and only the active tab is in the tab order.
 */

export interface TabItem {
  value: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  /** Controlled value. Pass together with onValueChange. */
  value?: string;
  onValueChange?: (value: string) => void;
  /** Uncontrolled starting value. Defaults to the first item. */
  defaultValue?: string;
  /** LAYOUT ONLY — margin, width, grid/flex placement. */
  className?: string;
}

export function Tabs({ items, value, onValueChange, defaultValue, className }: TabsProps) {
  const baseId = useId();
  const listRef = useRef<HTMLDivElement>(null);

  const [internalValue, setInternalValue] = useState(() => defaultValue ?? items[0]?.value ?? '');

  const isControlled = value !== undefined;
  const activeValue = isControlled ? value : internalValue;

  const select = useCallback(
    (next: string) => {
      if (!isControlled) setInternalValue(next);
      onValueChange?.(next);
    },
    [isControlled, onValueChange],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const enabled = items.filter((item) => item.disabled !== true);
      if (enabled.length === 0) return;

      const currentIndex = enabled.findIndex((item) => item.value === activeValue);
      let nextIndex: number | null = null;

      if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % enabled.length;
      else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + enabled.length) % enabled.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = enabled.length - 1;

      if (nextIndex === null) return;

      event.preventDefault();
      const nextItem = enabled[nextIndex];
      if (nextItem === undefined) return;

      select(nextItem.value);
      listRef.current
        ?.querySelector<HTMLButtonElement>(`[data-tab-value="${nextItem.value}"]`)
        ?.focus();
    },
    [items, activeValue, select],
  );

  return (
    <div className={cn(className, 'flex w-full flex-col')}>
      <div
        ref={listRef}
        role="tablist"
        onKeyDown={handleKeyDown}
        className="flex flex-wrap items-end gap-1 border-b border-crease"
      >
        {items.map((item) => {
          const isActive = item.value === activeValue;

          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.value}`}
              data-tab-value={item.value}
              aria-selected={isActive}
              aria-controls={`${baseId}-panel-${item.value}`}
              // Roving tabindex: one stop for the whole tablist.
              tabIndex={isActive ? 0 : -1}
              disabled={item.disabled}
              onClick={() => select(item.value)}
              className={cn(
                'min-h-11 rounded-t-[var(--radius-cut-sm)] border border-b-0 px-4 py-2',
                'font-mono text-xs tracking-wider uppercase',
                isActive
                  ? 'surface-paper -mb-px border-crease text-ink'
                  : 'border-transparent text-ink-muted hover:text-ink',
                item.disabled === true ? 'cursor-not-allowed opacity-55' : 'cursor-pointer',
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {items.map((item) => (
        <div
          key={item.value}
          role="tabpanel"
          id={`${baseId}-panel-${item.value}`}
          aria-labelledby={`${baseId}-tab-${item.value}`}
          hidden={item.value !== activeValue}
          tabIndex={0}
          className="py-4 font-body text-ink"
        >
          {item.value === activeValue ? item.content : null}
        </div>
      ))}
    </div>
  );
}
