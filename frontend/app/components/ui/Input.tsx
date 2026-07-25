'use client';

import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/app/lib/utils';

/**
 * Sunken paper — the shadow is inverted so the field sits below the page
 * rather than above it. Label association is handled here, not by the caller:
 * an input whose label is not wired to it is invisible to a screen reader,
 * and leaving that to a teammate means it will eventually be missed.
 */

export type InputSize = 'sm' | 'md' | 'lg';

type NativeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'className' | 'style' | 'size' | 'color'
>;

export interface InputProps extends NativeInputProps {
  label: string;
  /** Helper text below the field. Hidden while an error is showing. */
  hint?: string;
  /** Error message. Its presence switches the field into the error state. */
  error?: string;
  leftIcon?: ReactNode;
  size?: InputSize;
  fullWidth?: boolean;
  /** Hides the label visually but keeps it for screen readers. */
  hideLabel?: boolean;
  /** LAYOUT ONLY — margin, width, grid/flex placement. */
  className?: string;
}

const SIZE: Record<InputSize, string> = {
  sm: 'min-h-[2.25rem] px-2.5 py-1.5 text-sm',
  md: 'min-h-[2.75rem] px-3 py-2 text-base',
  lg: 'min-h-[3.25rem] px-4 py-3 text-lg',
};

export function Input({
  label,
  hint,
  error,
  leftIcon,
  size = 'md',
  fullWidth = true,
  hideLabel = false,
  className,
  id,
  disabled,
  required,
  ...rest
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const hasError = error !== undefined && error !== '';

  return (
    <div className={cn(className, 'flex flex-col gap-1.5', fullWidth ? 'w-full' : undefined)}>
      <label
        htmlFor={inputId}
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
        {leftIcon !== undefined ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3 flex text-ink-muted"
          >
            {leftIcon}
          </span>
        ) : null}

        <input
          id={inputId}
          disabled={disabled}
          required={required}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError || hint !== undefined ? messageId : undefined}
          className={cn(
            'surface-sunken w-full font-body text-ink placeholder:text-ink-muted',
            'rounded-[var(--radius-cut-sm)]',
            SIZE[size],
            leftIcon !== undefined ? 'pl-9' : undefined,
            hasError ? 'border-beni' : undefined,
            disabled === true ? 'cursor-not-allowed opacity-55' : undefined,
          )}
          {...rest}
        />
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
