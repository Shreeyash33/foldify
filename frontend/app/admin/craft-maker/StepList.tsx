'use client';

import { useState } from 'react';
import type { CraftFoldStep, FoldType } from '@foldify/shared';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { Textarea } from '@/app/components/ui/Textarea';
import { sideOf } from '@/app/lib/craft/geometry';
import { cn } from '@/app/lib/utils';
import { formatPoint } from './editor-geometry';

/** The step recorder: the ordered fold list, and the editor for one of them. */

const FOLD_TYPES: FoldType[] = ['valley', 'mountain', 'reverse', 'squash', 'petal', 'other'];

const DURATION_MIN = 200;
const DURATION_MAX = 4000;

export interface StepListProps {
  steps: CraftFoldStep[];
  selectedId: string | null;
  previewIndex: number;
  disabled: boolean;
  onSelect: (index: number) => void;
  onMove: (index: number, delta: -1 | 1) => void;
  onDelete: (index: number) => void;
  onUpdate: (id: string, patch: Partial<CraftFoldStep>) => void;
}

function StepEditor({
  step,
  disabled,
  onUpdate,
}: {
  step: CraftFoldStep;
  disabled: boolean;
  onUpdate: (id: string, patch: Partial<CraftFoldStep>) => void;
}) {
  // Keyed on step.id by StepList, so selecting another fold remounts this and
  // the draft starts from that fold's duration.
  const [duration, setDuration] = useState(String(step.durationMs));
  const [scopeCount, setScopeCount] = useState(
    String(typeof step.layerScope === 'number' ? step.layerScope : 1),
  );
  const allLayers = typeof step.layerScope !== 'number';

  const gesture =
    step.origin !== undefined && step.target !== undefined
      ? { origin: step.origin, target: step.target }
      : null;
  // The half the folded point starts in, so "which half moves" can be named.
  const originSide =
    step.origin === undefined ? null : sideOf(step.origin, step.from, step.to) > 0 ? 'left' : 'right';
  const movingValue =
    originSide === null
      ? step.side
      : step.side === originSide
        ? 'the half with the folded point'
        : 'the rest of the paper';

  const commitDuration = (raw: string) => {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      setDuration(String(step.durationMs));
      return;
    }
    const next = Math.min(DURATION_MAX, Math.max(DURATION_MIN, Math.round(parsed)));
    setDuration(String(next));
    if (next !== step.durationMs) onUpdate(step.id, { durationMs: next });
  };

  const commitScope = (raw: string) => {
    const parsed = Number(raw);
    const next = Number.isFinite(parsed) ? Math.max(1, Math.round(parsed)) : 1;
    setScopeCount(String(next));
    onUpdate(step.id, { layerScope: next });
  };

  return (
    <div className="flex flex-col gap-3 border-t border-crease pt-4">
      <p className="font-mono text-xs tracking-wider text-ink-muted uppercase">Selected fold</p>

      {step.kind === 'crease' ? (
        <p className="font-body text-sm text-ink-muted">
          Crease only: the paper returns flat and only the line is kept.
        </p>
      ) : null}

      {gesture === null ? null : (
        <div className="flex flex-col gap-1">
          <p className="font-body text-sm text-ink">
            Folds {formatPoint(gesture.origin)} onto {formatPoint(gesture.target)}
          </p>
          <p className="font-mono text-xs text-ink-muted">
            Crease: {formatPoint(step.from)} to {formatPoint(step.to)}
          </p>
        </div>
      )}

      <Select
        label="Fold type"
        value={step.foldType}
        disabled={disabled}
        onChange={(event) => onUpdate(step.id, { foldType: event.target.value as FoldType })}
        options={FOLD_TYPES.map((type) => ({
          value: type,
          label: type.charAt(0).toUpperCase() + type.slice(1),
        }))}
      />

      <div className="flex items-center justify-between gap-2">
        <p className="font-body text-sm text-ink-muted">
          {originSide === null ? 'Moving side' : 'Moves'}:{' '}
          <span className="text-ink">{movingValue}</span>
        </p>
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() => onUpdate(step.id, { side: step.side === 'left' ? 'right' : 'left' })}
        >
          Flip side
        </Button>
      </div>

      <div className="flex flex-col gap-1">
        <span className="font-mono text-xs tracking-wider text-ink-muted uppercase">
          How many layers
        </span>
        <div className="flex items-end gap-2">
          <Button
            variant={allLayers ? 'primary' : 'secondary'}
            size="sm"
            disabled={disabled}
            onClick={() => onUpdate(step.id, { layerScope: 'all' })}
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
            value={scopeCount}
            disabled={disabled}
            onChange={(event) => setScopeCount(event.target.value)}
            onBlur={(event) => commitScope(event.target.value)}
            className="w-24"
          />
        </div>
      </div>

      <Textarea
        label="Instruction"
        rows={3}
        value={step.instruction}
        disabled={disabled}
        onChange={(event) => onUpdate(step.id, { instruction: event.target.value })}
        hint="What the reader should do on this step."
      />

      <Input
        label="Duration (ms)"
        type="number"
        min={DURATION_MIN}
        max={DURATION_MAX}
        step={50}
        value={duration}
        disabled={disabled}
        onChange={(event) => setDuration(event.target.value)}
        onBlur={(event) => commitDuration(event.target.value)}
        hint={`${DURATION_MIN} to ${DURATION_MAX}.`}
      />

      {gesture === null ? (
        <p className="font-mono text-xs text-ink-muted">
          Line: {formatPoint(step.from)} to {formatPoint(step.to)}
        </p>
      ) : null}
    </div>
  );
}

export function StepList({
  steps,
  selectedId,
  previewIndex,
  disabled,
  onSelect,
  onMove,
  onDelete,
  onUpdate,
}: StepListProps) {
  const selected = steps.find((step) => step.id === selectedId);

  return (
    <div className="flex flex-col gap-3">
      {steps.length === 0 ? (
        <div className="flex flex-col gap-2 rounded-[var(--radius-cut)] border border-crease p-4">
          <p className="font-display text-base text-ink">No folds yet</p>
          <p className="font-body text-sm text-ink-muted">
            With the Fold tool active, click the point on the paper you want to fold, then click
            where it should land. The crease follows from those two picks.
          </p>
        </div>
      ) : (
        <ol className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {steps.map((step, index) => (
            <li key={step.id}>
              <div
                className={cn(
                  'flex items-center gap-2 rounded-[var(--radius-cut)] border p-2',
                  step.id === selectedId ? 'border-indigo' : 'border-crease',
                  previewIndex === index + 1 ? 'bg-paper-sunken' : undefined,
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(index)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="font-mono text-xs text-ink-muted">{index + 1}</span>
                  <Badge size="sm" tone={step.id === selectedId ? 'accent' : 'neutral'}>
                    {step.foldType}
                  </Badge>
                  {step.kind === 'crease' ? (
                    <Badge tone="accent" size="sm">
                      crease
                    </Badge>
                  ) : null}
                  {typeof step.layerScope === 'number' ? (
                    <Badge tone="neutral" size="sm">
                      top {step.layerScope}
                    </Badge>
                  ) : null}
                  <span className="min-w-0 flex-1 truncate font-body text-sm text-ink">
                    {step.instruction.trim() === '' ? 'No instruction yet' : step.instruction}
                  </span>
                </button>

                <div className="flex shrink-0 items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={disabled || index === 0}
                    onClick={() => onMove(index, -1)}
                    aria-label={`Move fold ${index + 1} up`}
                  >
                    Up
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={disabled || index === steps.length - 1}
                    onClick={() => onMove(index, 1)}
                    aria-label={`Move fold ${index + 1} down`}
                  >
                    Down
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    onClick={() => onDelete(index)}
                    aria-label={`Delete fold ${index + 1}`}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {selected === undefined ? null : (
        <StepEditor key={selected.id} step={selected} disabled={disabled} onUpdate={onUpdate} />
      )}
    </div>
  );
}
