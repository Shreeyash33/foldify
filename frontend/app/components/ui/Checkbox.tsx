'use client';

import { useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/app/lib/utils';

/**
 * A real <input type="checkbox">, visually hidden, with a paper square drawn
 * over it. The native input stays in the tab order and keeps every keyboard
 * and assistive-technology behaviour for free — the peer-checked selectors
 * below are purely cosmetic.
 */

type NativeCheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'className' | 'style' | 'type' | 'color'
>;

export interface CheckboxProps extends NativeCheckboxProps {
  label: string;
  hint?: string;
  error?: string;
  /** LAYOUT ONLY — margin, width, grid/flex placement. */
  className?: string;
}

export function Checkbox({ label, hint, error, className, id, disabled, ...rest }: CheckboxProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const messageId = `${fieldId}-message`;
  const hasError = error !== undefined && error !== '';

  return (
    <div className={cn(className, 'flex flex-col gap-1')}>
      {/* min-h-11 keeps the whole row a 44px tap target. */}
      <label
        htmlFor={fieldId}
        className={cn(
          'flex min-h-11 items-center gap-3 py-1',
          disabled === true ? 'cursor-not-allowed opacity-55' : 'cursor-pointer',
        )}
      >
        <input
          id={fieldId}
          type="checkbox"
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError || hint !== undefined ? messageId : undefined}
          className="peer sr-only"
          {...rest}
        />

        <span
          aria-hidden="true"
          className={cn(
            'surface-sunken flex size-5 shrink-0 items-center justify-center',
            'rounded-[var(--radius-cut-sm)] peer-checked:border-indigo peer-checked:bg-indigo',
            'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-indigo',
            // The tick is drawn in currentColor and simply invisible until
            // checked — `peer-checked:` cannot reach a descendant of a sibling,
            // so the colour has to flip on this element, not on the svg.
            'text-transparent peer-checked:text-on-fill',
            hasError ? 'border-beni' : undefined,
          )}
        >
          <svg viewBox="0 0 12 12" className="size-3">
            <path
              d="M2 6.5l2.5 2.5L10 3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        <span className="font-body text-base text-ink">{label}</span>
      </label>

      {hasError ? (
        <p id={messageId} role="alert" className="pl-8 font-body text-sm text-beni">
          {error}
        </p>
      ) : hint !== undefined ? (
        <p id={messageId} className="pl-8 font-body text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
