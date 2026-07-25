'use client';

import { useId, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/app/lib/utils';

/** Sunken paper, same label/hint/error contract as Input. */

type NativeTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'className' | 'style' | 'color'
>;

export interface TextareaProps extends NativeTextareaProps {
  label: string;
  hint?: string;
  error?: string;
  hideLabel?: boolean;
  /** LAYOUT ONLY — margin, width, grid/flex placement. */
  className?: string;
}

export function Textarea({
  label,
  hint,
  error,
  hideLabel = false,
  className,
  id,
  rows = 4,
  disabled,
  required,
  ...rest
}: TextareaProps) {
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

      <textarea
        id={fieldId}
        rows={rows}
        disabled={disabled}
        required={required}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError || hint !== undefined ? messageId : undefined}
        className={cn(
          'surface-sunken w-full px-3 py-2 font-body text-base text-ink placeholder:text-ink-muted',
          'rounded-[var(--radius-cut-sm)] resize-y',
          hasError ? 'border-beni' : undefined,
          disabled === true ? 'cursor-not-allowed opacity-55' : undefined,
        )}
        {...rest}
      />

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
