import type { ReactNode } from 'react';
import { cn } from '@/app/lib/utils';
import { CreaseDivider } from '@/app/components/ui/CreaseDivider';

/**
 * The top of every page: an optional eyebrow, the title, an optional
 * description, optional actions on the right, and a crease underneath.
 *
 * Using this everywhere is what makes fifteen pages written by three people
 * look like one site.
 */

export interface PageHeaderProps {
  title: string;
  /** Small mono line above the title — a section name or breadcrumb. */
  eyebrow?: string;
  description?: string;
  /** Buttons or links, right-aligned on wider screens. */
  actions?: ReactNode;
  /** LAYOUT ONLY — margin, width, grid/flex placement. */
  className?: string;
}

export function PageHeader({ title, eyebrow, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn(className, 'w-full pt-8 sm:pt-10')}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          {eyebrow !== undefined ? (
            <span className="font-mono text-xs tracking-[0.18em] text-ink-muted uppercase">
              {eyebrow}
            </span>
          ) : null}

          <h1 className="font-display text-3xl text-ink sm:text-4xl">{title}</h1>

          {description !== undefined ? (
            <p className="max-w-2xl font-body text-base text-ink-muted">{description}</p>
          ) : null}
        </div>

        {actions !== undefined ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>

      <CreaseDivider variant="valley" />
    </header>
  );
}
