'use client';

import { useId, type SelectHTMLAttributes } from 'react';
import { cn } from '@/app/lib/utils';

/**
 * A native <select> in sunken paper.
 *
 * Native on purpose: a custom listbox means owning keyboard navigation, typeahead,
 * scroll containment and mobile behaviour, and the OS already does all four
 * better than we would. The arrow is an inline SVG background, not a filter.
 */

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

type NativeSelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'className' | 'style' | 'color' | 'children'
>;

export interface SelectProps extends NativeSelectProps {
  label: string;
  options: SelectOption[];
  hint?: string;
  error?: string;
  hideLabel?: boolean;
  /** Shown as a disabled first option when nothing is selected. */
  placeholder?: string;
  /** LAYOUT ONLY — margin, width, grid/flex placement. */
  className?: string;
}

export function Select({
  label,
  options,
  hint,
  error,
  hideLabel = false,
  placeholder,
  className,
  id,
  disabled,
  required,
  ...rest
}: SelectProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const messageId = `${fieldId}-message`;
  const hasError = error !== undefined && error !== '';

  return (
    <div className={cn(className, 'flex w-full flex-col gap-1.5')}>
      <label
        htmlFor={fieldId}
        className={cn(
          'font-mono text-xs tracking-wider text-ink-muted uppercase',
          hideLabel ? 'sr-only' : undefined,
        )}
      >
        {label}
        {required === true ? (
          <span className="ml-1 text-beni" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      <div className="relative flex items-center">
        <select
          id={fieldId}
          disabled={disabled}
          required={required}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError || hint !== undefined ? messageId : undefined}
          className={cn(
            'surface-sunken min-h-[2.75rem] w-full appearance-none py-2 pr-9 pl-3',
            'rounded-[var(--radius-cut-sm)] font-body text-base text-ink',
            hasError ? 'border-beni' : undefined,
            disabled === true ? 'cursor-not-allowed opacity-55' : 'cursor-pointer',
          )}
          {...rest}
        >
          {placeholder !== undefined ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>

        {/* A folded corner pointing down, in place of the usual chevron. */}
        <svg
          viewBox="0 0 12 12"
          aria-hidden="true"
          className="pointer-events-none absolute right-3 size-3 text-ink-muted"
        >
          <path d="M1 3.5h10L6 9.5z" fill="currentColor" />
        </svg>
      </div>

      {hasError ? (
        <p id={messageId} role="alert" className="font-body text-sm text-beni">
          {error}
        </p>
      ) : hint !== undefined ? (
        <p id={messageId} className="font-body text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
