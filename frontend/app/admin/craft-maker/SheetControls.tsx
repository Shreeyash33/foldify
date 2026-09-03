'use client';

import { useState } from 'react';
import type { CraftSheet, CraftSheetPreset } from '@foldify/shared';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { SHEET_MAX, SHEET_MIN, SHEET_PRESETS, sheetForPreset } from '@/app/lib/craft/craft-file';

/** The sheet the fold sequence is authored against: a preset, or a custom size. */

export interface SheetControlsProps {
  sheet: CraftSheet;
  onChange: (sheet: CraftSheet) => void;
  disabled?: boolean;
}

function clampSide(value: number): number {
  return Math.min(SHEET_MAX, Math.max(SHEET_MIN, Math.round(value)));
}

export function SheetControls({ sheet, onChange, disabled = false }: SheetControlsProps) {
  // Keyed on the sheet size by the caller, so a committed or preset-driven
  // change remounts this and the drafts start from the new numbers.
  const [width, setWidth] = useState(String(sheet.width));
  const [height, setHeight] = useState(String(sheet.height));

  // Committed on blur, not on every keystroke: clamping mid-type would turn a
  // half-written "15" into 40 before the maker reaches the 0.
  const commit = (side: 'width' | 'height', raw: string) => {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      setWidth(String(sheet.width));
      setHeight(String(sheet.height));
      return;
    }
    const next = clampSide(parsed);
    if (next === sheet[side]) {
      setWidth(String(sheet.width));
      setHeight(String(sheet.height));
      return;
    }
    onChange(
      side === 'width'
        ? { preset: 'custom', width: next, height: sheet.height }
        : { preset: 'custom', width: sheet.width, height: next },
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <Select
        label="Sheet"
        value={sheet.preset}
        disabled={disabled}
        onChange={(event) => onChange(sheetForPreset(event.target.value as CraftSheetPreset, sheet))}
        options={SHEET_PRESETS.map((preset) => ({ value: preset.value, label: preset.label }))}
      />

      {sheet.preset === 'custom' ? (
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Width (mm)"
            type="number"
            min={SHEET_MIN}
            max={SHEET_MAX}
            step={1}
            value={width}
            disabled={disabled}
            onChange={(event) => setWidth(event.target.value)}
            onBlur={(event) => commit('width', event.target.value)}
          />
          <Input
            label="Height (mm)"
            type="number"
            min={SHEET_MIN}
            max={SHEET_MAX}
            step={1}
            value={height}
            disabled={disabled}
            onChange={(event) => setHeight(event.target.value)}
            onBlur={(event) => commit('height', event.target.value)}
          />
        </div>
      ) : (
        <p className="font-body text-sm text-ink-muted">
          {sheet.width} x {sheet.height} mm. Choose Custom to type your own.
        </p>
      )}
    </div>
  );
}
