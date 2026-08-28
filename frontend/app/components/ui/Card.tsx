import Image from 'next/image';
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

export type CardMediaAspect = 'square' | 'wide';

/**
 * A full-bleed image at the top of a card. The aspect ratio is fixed by the
 * system rather than by the image, so a grid of cards keeps one baseline
 * whatever sizes the photography arrives in.
 *
 * `src` accepts null because it usually is one: no product or tutorial row
 * carries an image yet. That case renders the fold mark rather than a broken
 * image, so a card with no photograph still looks finished.
 */
export interface CardMediaProps {
  src: string | null;
  alt: string;
  aspect?: CardMediaAspect;
  /** Only for an image above the fold — see the performance budget. */
  priority?: boolean;
  /** LAYOUT ONLY — margin, width, grid/flex placement. */
  className?: string;
}

const ASPECT: Record<CardMediaAspect, string> = {
  square: 'aspect-square',
  wide: 'aspect-[16/9]',
};

export function CardMedia({
  src,
  alt,
  aspect = 'square',
  priority = false,
  className,
}: CardMediaProps) {
  return (
    <div
      className={cn(
        className,
        'relative w-full overflow-hidden border-b border-crease bg-paper-sunken',
        ASPECT[aspect],
      )}
    >
      {src === null ? (
        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
          {/* The same folded square the Spinner draws — an empty slot still
              reads as Foldify rather than as a missing asset. */}
          <svg viewBox="0 0 24 24" className="size-10 text-ink-muted opacity-40">
            <path
              d="M4 4h11l5 5v11H4z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M15 4l5 5h-5z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          // Without this every card downloads a full-width image on mobile.
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
      )}
    </div>
  );
}
