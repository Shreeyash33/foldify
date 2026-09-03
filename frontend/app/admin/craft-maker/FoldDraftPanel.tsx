'use client';

import { useState } from 'react';
import type { CraftFoldSide, CraftLayerScope, CraftStepKind, FoldType } from '@foldify/shared';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { formatPoint } from './editor-geometry';
import type { FoldDraft } from './fold-draft';

/**
 * The third step of recording a fold. The two clicks say WHICH point moves and
 * WHERE it lands; this says what kind of fold it is and which half travels.
 * Nothing is written to the step list until Record, so no part of a fold is
 * ever a default the author did not choose.
 */

const FOLD_TYPES: FoldType[] = ['valley', 'mountain', 'reverse', 'squash', 'petal', 'other'];

export interface FoldDraftPanelProps {
  draft: FoldDraft;
  foldType: FoldType;
  kind: CraftStepKind;
  side: CraftFoldSide;
  /** The half `origin` sits in, so the panel can label which button is which. */
  originSide: CraftFoldSide;
  onFoldType: (type: FoldType) => void;
  onKind: (kind: CraftStepKind) => void;
  onSide: (side: CraftFoldSide) => void;
  layerScope: CraftLayerScope;
  onLayerScope: (scope: CraftLayerScope) => void;
  /** Layers in the stack right now, so the control cannot exceed them. */
  layerCount: number;
  onRecord: () => void;
  onCancel: () => void;
}

export function FoldDraftPanel({
  draft,
  foldType,
  kind,
  side,
  originSide,
  onFoldType,
  onKind,
  onSide,
  layerScope,
  onLayerScope,
  layerCount,
  onRecord,
  onCancel,
}: FoldDraftPanelProps) {
  const movesPicked = side === originSide;
  const maxLayers = Math.max(1, layerCount);
  const singleLayer = layerCount <= 1;
  const [count, setCount] = useState(String(typeof layerScope === 'number' ? layerScope : 1));

  const commitCount = (raw: string) => {
    const parsed = Number(raw);
    const next = Number.isFinite(parsed)
      ? Math.min(maxLayers, Math.max(1, Math.round(parsed)))
      : 1;
    setCount(String(next));
    onLayerScope(next);
  };

  return (
    <div className="flex flex-col gap-3 border-t border-crease pt-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-xs tracking-wider text-ink-muted uppercase">New fold</p>
        <Badge tone="accent">Step {draft.target === null ? '1' : '2'} of 2 picked</Badge>
      </div>

      {draft.target === null ? (
        <p className="font-body text-sm text-ink-muted">
          Folding from {formatPoint(draft.origin)}. Now click where that point should land.
        </p>
      ) : (
        <>
          <p className="font-body text-sm text-ink-muted">
            {formatPoint(draft.origin)} lands on {formatPoint(draft.target)}. The crease is the
            line halfway between them.
          </p>

          <Select
            label="Fold type"
            value={foldType}
            onChange={(event) => onFoldType(event.target.value as FoldType)}
            options={FOLD_TYPES.map((type) => ({
              value: type,
              label: type.charAt(0).toUpperCase() + type.slice(1),
            }))}
          />

          <div className="flex flex-col gap-1">
            <span className="font-mono text-xs tracking-wider text-ink-muted uppercase">
              What this step does
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={kind === 'fold' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => onKind('fold')}
                className="flex-1"
              >
                Fold it over
              </Button>
              <Button
                type="button"
                variant={kind === 'crease' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => onKind('crease')}
                className="flex-1"
              >
                Crease only
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="font-mono text-xs tracking-wider text-ink-muted uppercase">
              {kind === 'crease' ? 'Which half moves, then returns flat' : 'Which half moves'}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={movesPicked ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => onSide(originSide)}
                className="flex-1"
              >
                The picked point
              </Button>
              <Button
                type="button"
                variant={movesPicked ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => onSide(originSide === 'left' ? 'right' : 'left')}
                className="flex-1"
              >
                The rest
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="font-mono text-xs tracking-wider text-ink-muted uppercase">
              How many layers
            </span>
            <div className="flex items-end gap-2">
              <Button
                type="button"
                variant={layerScope === 'all' ? 'primary' : 'secondary'}
                size="sm"
                disabled={singleLayer}
                onClick={() => onLayerScope('all')}
                className="flex-1"
              >
                All layers
              </Button>
              <Input
                label="Top layers"
                hideLabel
                size="sm"
                type="number"
                min={1}
                max={maxLayers}
                value={count}
                disabled={singleLayer}
                onChange={(event) => setCount(event.target.value)}
                onBlur={(event) => commitCount(event.target.value)}
                className="w-24"
              />
            </div>
            {singleLayer ? (
              <p className="font-body text-sm text-ink-muted">
                Only one layer so far, so this fold takes all of it.
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="primary" size="sm" onClick={onRecord} className="flex-1">
              Record fold
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
          </div>
        </>
      )}

      {draft.target === null ? (
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      ) : null}
    </div>
  );
}
