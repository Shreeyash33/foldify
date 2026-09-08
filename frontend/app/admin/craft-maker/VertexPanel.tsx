'use client';

import { useState } from 'react';
import type { CraftPoint, CraftVertex } from '@foldify/shared';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';

/**
 * The selected snap point. Coordinates are committed on blur rather than per
 * keystroke, so a half-typed number never moves the point, and the four sheet
 * corners are movable but never removable.
 */

export interface VertexPanelProps {
  vertex: CraftVertex;
  /** True for the four sheet corners, which may be moved but never deleted. */
  isCorner: boolean;
  onMove: (id: string, point: CraftPoint) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function label(value: number): string {
  return value.toFixed(1);
}

export function VertexPanel({
  vertex,
  isCorner,
  onMove,
  onDelete,
  onClose,
}: VertexPanelProps): React.JSX.Element {
  // Seeded once; the caller keys this component on vertex.id.
  const [x, setX] = useState(() => label(vertex.x));
  const [y, setY] = useState(() => label(vertex.y));

  const commit = (axis: 'x' | 'y', raw: string) => {
    const parsed = Number(raw);
    if (raw.trim() === '' || !Number.isFinite(parsed)) {
      if (axis === 'x') setX(label(vertex.x));
      else setY(label(vertex.y));
      return;
    }

    const rounded = Math.round(parsed * 10) / 10;
    if (axis === 'x') setX(label(rounded));
    else setY(label(rounded));

    // The other field may still hold a half-typed value; the vertex wins.
    const otherRaw = Number(axis === 'x' ? y : x);
    const other = Number.isFinite(otherRaw) ? otherRaw : axis === 'x' ? vertex.y : vertex.x;

    onMove(vertex.id, {
      x: axis === 'x' ? rounded : other,
      y: axis === 'y' ? rounded : other,
    });
  };

  return (
    <div className="flex flex-col gap-3 border-t border-crease pt-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-xs tracking-wider text-ink-muted uppercase">Selected point</p>
        <Badge tone={isCorner ? 'neutral' : 'accent'}>{isCorner ? 'corner' : 'added'}</Badge>
      </div>

      <div className="flex items-end gap-2">
        <Input
          label="X"
          type="number"
          step={0.1}
          size="sm"
          value={x}
          onChange={(event) => setX(event.target.value)}
          onBlur={(event) => commit('x', event.target.value)}
        />
        <Input
          label="Y"
          type="number"
          step={0.1}
          size="sm"
          value={y}
          onChange={(event) => setY(event.target.value)}
          onBlur={(event) => commit('y', event.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        {isCorner ? null : (
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => onDelete(vertex.id)}
            className="flex-1"
          >
            Delete point
          </Button>
        )}
        <Button type="button" variant="ghost" size="sm" onClick={onClose} className="flex-1">
          Done
        </Button>
      </div>
    </div>
  );
}
