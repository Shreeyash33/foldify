'use client';

import { useId } from 'react';
import { cn } from '@/app/lib/utils';

/**
 * A physical-feeling switch: a paper tab that slides in a sunken channel.
 * Built on a real checkbox input so Space toggles it and screen readers
 * announce it correctly without any ARIA of our own.
 *
 * Controlled only — a switch whose state the parent does not own is almost
 * always a bug waiting to happen.
 */

export interface SwitchProps {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Hides the label visually but keeps it for screen readers. */
  hideLabel?: boolean;
  /** LAYOUT ONLY — margin, width, grid/flex placement. */
  className?: string;
}

export function Switch({
  label,
  checked,
  onCheckedChange,
  disabled = false,
  hideLabel = false,
  className,
}: SwitchProps) {
  const fieldId = useId();

  return (
    <label
      htmlFor={fieldId}
      className={cn(
        className,
        'flex min-h-11 items-center gap-3',
        disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer',
      )}
    >
      <input
        id={fieldId}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange(event.target.checked)}
        className="peer sr-only"
      />

      <span
        aria-hidden="true"
        className={cn(
          'surface-sunken relative flex h-6 w-11 shrink-0 items-center rounded-full px-0.5',
          'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-indigo',
          checked ? 'border-indigo bg-indigo' : undefined,
        )}
      >
        {/* Only `transform` is animated — nothing that triggers layout. */}
        <span
          className={cn(
            'surface-crumpled elevation-1 size-5 rounded-full border transition-transform duration-150 ease-[var(--ease-fold)]',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </span>

      <span className={cn('font-body text-base text-ink', hideLabel ? 'sr-only' : undefined)}>
        {label}
      </span>
    </label>
  );
}
