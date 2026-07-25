import type { ElementType, ReactNode } from 'react';
import { cn } from '@/app/lib/utils';

/**
 * The horizontal rhythm of every page. Use this instead of hand-written
 * max-width and padding, so all pages line up with each other and with the
 * navbar.
 */

export type ContainerWidth = 'narrow' | 'default' | 'wide' | 'full';

export interface ContainerProps {
  width?: ContainerWidth;
  as?: ElementType;
  children?: ReactNode;
  /** LAYOUT ONLY — margin, grid/flex placement. Not padding or width. */
  className?: string;
}

const WIDTH: Record<ContainerWidth, string> = {
  narrow: 'max-w-2xl', // prose, forms, auth
  default: 'max-w-5xl', // most pages
  wide: 'max-w-7xl', // product grids, admin tables
  full: 'max-w-none',
};

export function Container({
  width = 'default',
  as: Tag = 'div',
  children,
  className,
}: ContainerProps) {
  return (
    <Tag className={cn(className, 'mx-auto w-full px-4 sm:px-6 lg:px-8', WIDTH[width])}>
      {children}
    </Tag>
  );
}
