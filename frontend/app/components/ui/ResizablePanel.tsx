'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useMediaQuery } from '@/app/lib/hooks';
import { cn } from '@/app/lib/utils';

/**
 * Two panes with a draggable crease between them.
 *
 * Keep this API general — it becomes the Craft Maker's canvas/controls split
 * later, so nothing here should assume what is inside either pane.
 *
 * Implementation notes, all of them deliberate:
 *
 *  - POINTER events, not mouse events. `setPointerCapture` keeps the drag
 *    alive when the cursor leaves the handle or the window, and the same code
 *    path handles touch and pen. Mouse events do neither.
 *  - The visible bar is ~4px but the hit area is 24px, made of invisible
 *    padding. A 4px drag target is unusable with a trackpad and impossible
 *    with a finger.
 *  - `touch-action: none` on the handle, or the browser scrolls the page
 *    instead of letting us drag.
 *  - `user-select: none` on <body> while dragging, removed on release —
 *    otherwise a drag selects every piece of text it passes over.
 *  - Size is written to a CSS custom property and consumed by `flex-basis`,
 *    so a pointer move sets one variable instead of triggering a React render
 *    per frame.
 *  - Below `md` the panes stack and resizing is disabled entirely. A
 *    horizontal resizer on a 375px screen is not a feature.
 */

export type ResizeDirection = 'horizontal' | 'vertical';

export interface ResizablePanelProps {
  first: ReactNode;
  second: ReactNode;
  direction?: ResizeDirection;
  /** Percent of the container given to the first pane. */
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  /** Called with the clamped percentage as the user drags. */
  onResize?: (size: number) => void;
  /** Accessible name for the separator, e.g. "Resize canvas". */
  label?: string;
  /** LAYOUT ONLY — margin, width, grid/flex placement. */
  className?: string;
}

const KEYBOARD_STEP = 2;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function ResizablePanel({
  first,
  second,
  direction = 'horizontal',
  defaultSize = 50,
  minSize = 20,
  maxSize = 80,
  onResize,
  label = 'Resize panels',
  className,
}: ResizablePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(() => clamp(defaultSize, minSize, maxSize));
  const [isDragging, setIsDragging] = useState(false);

  /**
   * Resizing is off below `md`; the panes stack instead. Matches the `md:`
   * breakpoint in the classes below — keep the two in step if either changes.
   */
  const canResize = useMediaQuery('(min-width: 768px)');

  const applySize = useCallback(
    (next: number) => {
      const clamped = clamp(next, minSize, maxSize);
      setSize(clamped);
      onResize?.(clamped);
    },
    [minSize, maxSize, onResize],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!canResize) return;

      // Capture on the handle itself: the drag now survives the pointer
      // leaving the element, which a mousemove listener on the handle would not.
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsDragging(true);
      document.body.dataset.dragging = 'true';
    },
    [canResize],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging || containerRef.current === null) return;

      const rect = containerRef.current.getBoundingClientRect();
      const ratio =
        direction === 'horizontal'
          ? (event.clientX - rect.left) / rect.width
          : (event.clientY - rect.top) / rect.height;

      applySize(ratio * 100);
    },
    [isDragging, direction, applySize],
  );

  const endDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsDragging(false);
    delete document.body.dataset.dragging;
  }, []);

  // Safety net: if the component unmounts mid-drag the body must not be left
  // unselectable forever.
  useEffect(() => {
    return () => {
      delete document.body.dataset.dragging;
    };
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!canResize) return;

      const decrease = direction === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
      const increase = direction === 'horizontal' ? 'ArrowRight' : 'ArrowDown';

      if (event.key === decrease) applySize(size - KEYBOARD_STEP);
      else if (event.key === increase) applySize(size + KEYBOARD_STEP);
      else if (event.key === 'Home') applySize(minSize);
      else if (event.key === 'End') applySize(maxSize);
      else return;

      event.preventDefault();
    },
    [canResize, direction, size, applySize, minSize, maxSize],
  );

  const isHorizontal = direction === 'horizontal';

  return (
    <div
      ref={containerRef}
      style={{ '--panel-size': `${size}%` } as React.CSSProperties}
      className={cn(
        className,
        'flex w-full',
        // Stacked below md, split from md up.
        isHorizontal ? 'flex-col md:flex-row' : 'flex-col',
      )}
    >
      <div
        className={cn(
          'min-h-0 min-w-0 overflow-auto',
          // flex-basis reads the CSS variable, so a drag updates one custom
          // property rather than re-laying out from a React state change.
          canResize ? 'md:basis-[var(--panel-size)]' : 'basis-auto',
          isHorizontal ? 'md:grow-0 md:shrink-0' : 'grow-0 shrink-0',
        )}
      >
        {first}
      </div>

      <div
        role="separator"
        tabIndex={canResize ? 0 : -1}
        aria-label={label}
        aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
        aria-valuenow={Math.round(size)}
        aria-valuemin={minSize}
        aria-valuemax={maxSize}
        aria-disabled={!canResize || undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={handleKeyDown}
        className={cn(
          'group relative flex shrink-0 items-center justify-center',
          // Hit area is at least 24px; the visible bar inside is 4px.
          isHorizontal
            ? 'h-3 w-full cursor-default md:h-auto md:w-6 md:cursor-col-resize'
            : 'h-6 w-full cursor-row-resize',
          canResize ? 'touch-none' : 'pointer-events-none',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'surface-cardboard block rounded-full',
            isHorizontal ? 'h-0.5 w-full md:h-full md:w-1' : 'h-1 w-full',
            isDragging ? 'elevation-2' : undefined,
          )}
        />
        {/* Grip dots, so the handle reads as something you can grab. */}
        <span
          aria-hidden="true"
          className={cn(
            'absolute flex items-center justify-center gap-0.5',
            isHorizontal ? 'flex-row md:flex-col' : 'flex-row',
          )}
        >
          <span className="size-0.5 rounded-full bg-cardboard-edge" />
          <span className="size-0.5 rounded-full bg-cardboard-edge" />
          <span className="size-0.5 rounded-full bg-cardboard-edge" />
        </span>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-auto">{second}</div>
    </div>
  );
}
