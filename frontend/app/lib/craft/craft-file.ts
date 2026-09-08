import type {
  CraftFileData,
  CraftFoldStep,
  CraftLayerScope,
  CraftPoint,
  CraftSheet,
  CraftSheetPreset,
  CraftStepKind,
  CraftVertex,
  FoldType,
} from '@foldify/shared';
import { perpendicularBisector, sideOf, type Bounds } from './geometry';
import { sheetPolygon } from './fold-model';

/** Sheet sizes in millimetres. `custom` carries whatever the maker typed. */
export const SHEET_PRESETS: { value: CraftSheetPreset; label: string; width: number; height: number }[] = [
  { value: 'a4-portrait', label: 'A4 portrait (210 x 297)', width: 210, height: 297 },
  { value: 'a4-landscape', label: 'A4 landscape (297 x 210)', width: 297, height: 210 },
  { value: 'a5-portrait', label: 'A5 portrait (148 x 210)', width: 148, height: 210 },
  { value: 'letter-portrait', label: 'Letter portrait (216 x 279)', width: 216, height: 279 },
  { value: 'square', label: 'Square (200 x 200)', width: 200, height: 200 },
  { value: 'custom', label: 'Custom', width: 210, height: 297 },
];

export const DEFAULT_SHEET: CraftSheet = { preset: 'a4-portrait', width: 210, height: 297 };
export const DEFAULT_FOLD_MS = 900;

export const SHEET_MIN = 40;
export const SHEET_MAX = 1000;

export function sheetForPreset(preset: CraftSheetPreset, current: CraftSheet): CraftSheet {
  const found = SHEET_PRESETS.find((entry) => entry.value === preset);
  if (found === undefined || preset === 'custom') return { ...current, preset };
  return { preset, width: found.width, height: found.height };
}

/** The four sheet corners, which every new file starts with as its foldable points. */
export function cornerVertices(sheet: CraftSheet): CraftVertex[] {
  return sheetPolygon(sheet).map((point, index) => ({ id: `corner-${index}`, x: point.x, y: point.y }));
}

export function emptyCraftData(sheet: CraftSheet = DEFAULT_SHEET): CraftFileData {
  return { sheet, vertices: cornerVertices(sheet), steps: [] };
}

let counter = 0;

/** Ids only have to be unique inside one file, and must be stable across a save. */
export function craftId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
}

/**
 * A fold recorded as a gesture: fold `origin` onto `target`.
 *
 * The crease is the perpendicular bisector of the two points and the moving
 * half is the one `origin` starts in, so neither is a default that happens to
 * be right half the time - they are the only answers consistent with the two
 * points the author picked. Returns null when the two coincide, which is not a
 * fold.
 */
export function foldFromGesture(
  origin: CraftPoint,
  target: CraftPoint,
  bounds: Bounds,
  foldType: FoldType,
  kind: CraftStepKind = 'fold',
  layerScope: CraftLayerScope = 'all',
): CraftFoldStep | null {
  const crease = perpendicularBisector(origin, target, bounds);
  if (crease === null) return null;

  const [from, to] = crease;

  return {
    id: craftId('fold'),
    from,
    to,
    origin,
    target,
    side: sideOf(origin, from, to) > 0 ? 'left' : 'right',
    foldType,
    kind,
    layerScope,
    instruction: '',
    durationMs: DEFAULT_FOLD_MS,
  };
}

/** Anything that is not `all` or a finite positive count means the whole stack. */
function parseLayerScope(value: unknown): CraftLayerScope {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'all';
  const count = Math.floor(value);
  return count >= 1 ? count : 'all';
}

function isPoint(value: unknown): value is CraftPoint {
  if (typeof value !== 'object' || value === null) return false;
  const point = value as Record<string, unknown>;
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

/**
 * Narrows an untrusted payload to `CraftFileData`, returning null when it is
 * not one. Used on both sides of the wire: the backend stores the file as an
 * opaque JSON blob, so the shape is checked wherever it is read.
 */
export function parseCraftData(value: unknown): CraftFileData | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;

  const sheet = raw.sheet as Record<string, unknown> | undefined;
  if (sheet === undefined || !Number.isFinite(sheet.width) || !Number.isFinite(sheet.height)) return null;

  const steps = Array.isArray(raw.steps) ? raw.steps : [];
  const parsedSteps: CraftFoldStep[] = [];

  for (const entry of steps) {
    if (typeof entry !== 'object' || entry === null) return null;
    const step = entry as Record<string, unknown>;
    if (!isPoint(step.from) || !isPoint(step.to)) return null;
    parsedSteps.push({
      id: typeof step.id === 'string' ? step.id : craftId('fold'),
      from: step.from,
      to: step.to,
      side: step.side === 'right' ? 'right' : 'left',
      ...(isPoint(step.origin) ? { origin: step.origin } : {}),
      ...(isPoint(step.target) ? { target: step.target } : {}),
      foldType: (typeof step.foldType === 'string' ? step.foldType : 'valley') as FoldType,
      kind: step.kind === 'crease' ? 'crease' : 'fold',
      layerScope: parseLayerScope(step.layerScope),
      instruction: typeof step.instruction === 'string' ? step.instruction : '',
      durationMs: Number.isFinite(step.durationMs) ? Number(step.durationMs) : DEFAULT_FOLD_MS,
    });
  }

  const vertices = Array.isArray(raw.vertices) ? raw.vertices : [];
  const parsedVertices: CraftVertex[] = vertices.filter(isPoint).map((point, index) => ({
    id: typeof (point as CraftVertex).id === 'string' ? (point as CraftVertex).id : `vertex-${index}`,
    x: point.x,
    y: point.y,
  }));

  return {
    sheet: {
      preset: (typeof sheet.preset === 'string' ? sheet.preset : 'custom') as CraftSheetPreset,
      width: Number(sheet.width),
      height: Number(sheet.height),
    },
    vertices: parsedVertices,
    steps: parsedSteps,
  };
}
