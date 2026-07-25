import { cn } from '@/app/lib/utils';

/**
 * THE SIGNATURE ELEMENT.
 *
 * A section divider drawn in genuine origami notation:
 *   valley   — dashed line       (fold toward you; the paper forms a V)
 *   mountain — dash-dot line     (fold away from you; the paper forms a peak)
 *
 * Pure SVG, no image, no filter. This is the one memorable flourish in the
 * system — everything else stays disciplined so that this reads.
 *
 * @example
 * <CreaseDivider variant="valley" label="Buttons" />
 * <CreaseDivider variant="mountain" withArrow />
 */

export type CreaseVariant = 'valley' | 'mountain';

export interface CreaseDividerProps {
  variant?: CreaseVariant;
  /** Optional caption sitting on the crease, in the mono utility face. */
  label?: string;
  /** Adds the small directional arrow that diagrams use to show fold direction. */
  withArrow?: boolean;
  /** LAYOUT ONLY — margin, width, grid/flex placement. */
  className?: string;
}

/** Standard origami notation: valley is dashed, mountain is dash-dot. */
const DASH: Record<CreaseVariant, string> = {
  valley: '9 7',
  mountain: '14 5 2 5',
};

export function CreaseDivider({
  variant = 'valley',
  label,
  withArrow = false,
  className,
}: CreaseDividerProps) {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label={label ?? `${variant} fold`}
      className={cn(className, 'flex w-full items-center gap-3 py-6')}
    >
      <Line variant={variant} />

      {label !== undefined ? (
        <span className="shrink-0 font-mono text-[0.6875rem] tracking-[0.18em] text-ink-muted uppercase">
          {label}
        </span>
      ) : null}

      {withArrow ? <Arrow variant={variant} /> : null}

      {label !== undefined || withArrow ? <Line variant={variant} /> : null}
    </div>
  );
}

function Line({ variant }: { variant: CreaseVariant }) {
  return (
    <svg
      aria-hidden="true"
      preserveAspectRatio="none"
      viewBox="0 0 100 2"
      className="h-0.5 min-w-0 flex-1 text-crease"
    >
      <line
        x1="0"
        y1="1"
        x2="100"
        y2="1"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray={DASH[variant]}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * The direction arrow from a fold diagram: a valley arrow curls toward the
 * reader, a mountain arrow curls away, drawn with a half-open head.
 */
function Arrow({ variant }: { variant: CreaseVariant }) {
  const isValley = variant === 'valley';

  return (
    <svg aria-hidden="true" viewBox="0 0 24 16" className="h-4 w-6 shrink-0 text-ink-muted">
      <path
        d={isValley ? 'M3 12 C 8 2, 16 2, 21 12' : 'M3 4 C 8 14, 16 14, 21 4'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d={isValley ? 'M21 12 l-4.5 -1 M21 12 l0.5 -4.5' : 'M21 4 l-4.5 1 M21 4 l0.5 4.5'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
