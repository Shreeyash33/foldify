import { cn } from '@/app/lib/utils';

/**
 * A rotating square, folded corner and all — not a generic circle.
 * Animates `transform` only; nothing else is cheap enough.
 */

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  size?: SpinnerSize;
  /** Announced to screen readers while a region is busy. */
  label?: string;
  /** LAYOUT ONLY — margin, width, grid/flex placement. */
  className?: string;
}

const SIZE: Record<SpinnerSize, string> = {
  sm: 'size-4',
  md: 'size-6',
  lg: 'size-9',
};

export function Spinner({ size = 'md', label = 'Loading', className }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className={cn(className, 'inline-flex shrink-0')}>
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={cn(SIZE[size], 'animate-spin text-indigo')}
        style={{ animationDuration: '1.1s' }}
      >
        <path
          d="M4 4h11l5 5v11H4z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          opacity="0.25"
        />
        <path
          d="M15 4l5 5h-5z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
