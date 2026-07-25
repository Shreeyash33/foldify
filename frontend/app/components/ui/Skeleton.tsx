import { cn } from '@/app/lib/utils';

/**
 * Loading placeholder shaped like the content it stands in for.
 * Pulses opacity — no shimmer sweep, which would animate background-position
 * and repaint a large area on every frame.
 */

export type SkeletonShape = 'text' | 'title' | 'block' | 'circle';

export interface SkeletonProps {
  shape?: SkeletonShape;
  /** Number of stacked lines. Only meaningful for `text`. */
  lines?: number;
  /** LAYOUT ONLY — margin, width, grid/flex placement. */
  className?: string;
}

const SHAPE: Record<SkeletonShape, string> = {
  text: 'h-4 w-full rounded-[var(--radius-cut-sm)]',
  title: 'h-7 w-2/3 rounded-[var(--radius-cut-sm)]',
  block: 'h-32 w-full rounded-[var(--radius-cut)]',
  circle: 'size-12 rounded-full',
};

export function Skeleton({ shape = 'text', lines = 1, className }: SkeletonProps) {
  if (shape === 'text' && lines > 1) {
    return (
      <div className={cn(className, 'flex flex-col gap-2')} aria-hidden="true">
        {Array.from({ length: lines }, (_, index) => (
          <span
            key={index}
            className={cn(
              SHAPE.text,
              'block animate-pulse bg-paper-sunken',
              // Last line stops short, the way real text does.
              index === lines - 1 ? 'w-4/5' : undefined,
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(className, SHAPE[shape], 'block animate-pulse bg-paper-sunken')}
    />
  );
}
