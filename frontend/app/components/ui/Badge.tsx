import type { ReactNode } from 'react';
import { cn } from '@/app/lib/utils';

/**
 * Small mono label — difficulty, stock, order status, counts.
 * Mono because origami instructions are technical diagrams and their labels
 * belong in a technical face.
 */

export type BadgeTone = 'neutral' | 'accent' | 'danger' | 'cardboard';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  tone?: BadgeTone;
  size?: BadgeSize;
  children?: ReactNode;
  /** LAYOUT ONLY — margin, width, grid/flex placement. */
  className?: string;
}

const TONE: Record<BadgeTone, string> = {
  neutral: 'bg-paper-sunken text-ink-muted border-crease',
  accent: 'bg-indigo text-on-fill border-indigo',
  danger: 'bg-beni text-on-fill border-beni',
  cardboard: 'bg-cardboard text-ink border-cardboard-edge',
};

const SIZE: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-[0.625rem]',
  md: 'px-2 py-1 text-[0.6875rem]',
};

export function Badge({ tone = 'neutral', size = 'md', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        className,
        'inline-flex items-center rounded-[var(--radius-cut-sm)] border font-mono tracking-wider whitespace-nowrap uppercase',
        TONE[tone],
        SIZE[size],
      )}
    >
      {children}
    </span>
  );
}
