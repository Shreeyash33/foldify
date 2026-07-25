import type { ElementType, ReactNode } from 'react';
import { cn } from '@/app/lib/utils';

/**
 * The base of the entire design system. Every other surface composes this one:
 * Card, Modal, Navbar, Footer, Input and Button all end up here.
 *
 * It owns the texture / shadow / highlight / border / radius recipe. NOTHING
 * else in the codebase re-implements those — if a surface looks wrong, it is
 * wrong here, in one place.
 *
 * @see globals.css for the `.surface-*` recipes this maps onto.
 */

export type Material = 'paper' | 'cardboard' | 'crumpled' | 'sunken';
export type Elevation = 0 | 1 | 2 | 3;

export interface PaperSurfaceProps {
  material?: Material;
  elevation?: Elevation;
  /** Renders as a different element — `section`, `nav`, `aside`, `li`… */
  as?: ElementType;
  children?: ReactNode;
  /**
   * LAYOUT ONLY — margin, width, grid/flex placement.
   * Not for colour, padding, font, radius or shadow. Consumer classes are
   * placed before the component's own so the system always wins a conflict.
   */
  className?: string;
  id?: string;
}

const MATERIAL_CLASS: Record<Material, string> = {
  paper: 'surface-paper',
  cardboard: 'surface-cardboard',
  crumpled: 'surface-crumpled',
  sunken: 'surface-sunken',
};

const ELEVATION_CLASS: Record<Elevation, string> = {
  0: 'elevation-0',
  1: 'elevation-1',
  2: 'elevation-2',
  3: 'elevation-3',
};

export function PaperSurface({
  material = 'paper',
  elevation = 1,
  as: Tag = 'div',
  children,
  className,
  id,
}: PaperSurfaceProps) {
  return (
    <Tag
      id={id}
      className={cn(
        // Consumer classes FIRST — later classes in the same layer win ties,
        // so the design system's colours and padding are never overridden.
        className,
        MATERIAL_CLASS[material],
        // A sunken surface already carries its own inset shadow; adding a
        // drop shadow on top of it would read as both raised and recessed.
        material === 'sunken' ? undefined : ELEVATION_CLASS[elevation],
      )}
    >
      {children}
    </Tag>
  );
}
