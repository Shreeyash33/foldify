import type { ReactNode } from 'react';
import { cn } from '@/app/lib/utils';
import { PaperSurface, type Elevation } from './PaperSurface';

/**
 * A sheet of raised paper. The default container for anything with content:
 * a product, a tutorial, a form, a panel of settings.
 *
 * Composes PaperSurface — it does not re-implement the material recipe.
 * Padding lives in the Header / Body / Footer parts so a card can hold a
 * full-bleed image at the top and still keep its text inset.
 */

export interface CardProps {
  elevation?: Elevation;
  /** Cardboard for structural chrome (panels, admin), paper for content. */
  material?: 'paper' | 'cardboard';
  /** Adds the hover lift. Use only when the whole card is a link or a button. */
  interactive?: boolean;
  children?: ReactNode;
  /** LAYOUT ONLY — margin, width, grid/flex placement. */
  className?: string;
}

export function Card({
  elevation = 1,
  material = 'paper',
  interactive = false,
  children,
  className,
}: CardProps) {
  return (
    <PaperSurface
      material={material}
      elevation={elevation}
      className={cn(
        className,
        'flex flex-col overflow-hidden',
        interactive ? 'pressable cursor-pointer' : undefined,
      )}
    >
      {children}
    </PaperSurface>
  );
}

export interface CardPartProps {
  children?: ReactNode;
  /** LAYOUT ONLY — margin, width, grid/flex placement. */
  className?: string;
}

export function CardHeader({ children, className }: CardPartProps) {
  return (
    <div className={cn(className, 'flex flex-col gap-1 border-b border-crease px-4 py-3 sm:px-5')}>
      {children}
    </div>
  );
}

export function CardBody({ children, className }: CardPartProps) {
  return <div className={cn(className, 'flex-1 px-4 py-4 sm:px-5')}>{children}</div>;
}

export function CardFooter({ children, className }: CardPartProps) {
  return (
    <div
      className={cn(
        className,
        'flex flex-wrap items-center gap-2 border-t border-crease px-4 py-3 sm:px-5',
      )}
    >
      {children}
    </div>
  );
}

/** Card title. Display face, correct size, no decisions to make. */
export function CardTitle({ children, className }: CardPartProps) {
  return <h3 className={cn(className, 'font-display text-lg text-ink')}>{children}</h3>;
}

/** Supporting line under a title. */
export function CardMeta({ children, className }: CardPartProps) {
  return <p className={cn(className, 'font-body text-sm text-ink-muted')}>{children}</p>;
}
