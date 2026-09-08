import type {
  CraftFileData,
  CraftFoldStep,
  CraftPoint,
  CraftSheet,
} from '@foldify/shared';
import {
  boundsOf,
  foldPoint,
  foldPolygon,
  isDegenerate,
  MIN_AREA,
  pointInConvexPolygon,
  polygonArea,
  sideOf,
  splitByLine,
  type Bounds,
  type Polygon,
} from './geometry';

/**
 * THE LAYERING MODEL.
 *
 * Paper after N folds is an ordered stack of convex polygons, bottom first.
 * A fold cuts the layers IN SCOPE along the fold line; the pieces on the moving
 * side are reflected across it and re-stacked as a group, in reverse order —
 * the sheet nearest the top of a flap ends up nearest the bottom once the flap
 * is turned over. A valley fold drops the group on top of those layers, a
 * mountain fold slides it underneath.
 *
 * Scope is the step's `layerScope`: `all` (the default) cuts the whole stack,
 * a number cuts only that many layers from the top. Real folds only move the
 * layers in the flap you are holding, so folding the near wing of a plane must
 * leave the far wing and everything below it exactly where it was. Out-of-scope
 * layers pass through untouched and stay at the bottom of the stack.
 *
 * What this deliberately does NOT model: paper thickness, layers trapped
 * inside a pocket, reverse and squash folds (which move part of a flap through
 * the stack rather than over it), and any fold whose line is not straight
 * across the whole sheet. Steps typed `reverse`, `squash` or `petal` still
 * animate — as the straight fold their line describes. The tradeoff buys a
 * model where every layer stays convex, so the whole engine is a half-plane
 * clip and a cosine, and it renders at 60fps in an SVG with no physics.
 *
 * Layers are capped (see MAX_LAYERS) because a pathological sequence doubles
 * the count on every step. Real tutorials sit in the low tens.
 */

const MAX_LAYERS = 96;

export interface FoldLayer {
  id: string;
  polygon: Polygon;
  /** Reflection count. Odd means the back of the paper is facing the viewer. */
  flips: number;
  /** True only while this layer is the flap being turned in the current step. */
  moving: boolean;
}

export interface FoldState {
  /** Bottom of the stack first, so array order is paint order. */
  layers: FoldLayer[];
}

export function sheetPolygon(sheet: CraftSheet): Polygon {
  return [
    { x: 0, y: 0 },
    { x: sheet.width, y: 0 },
    { x: sheet.width, y: sheet.height },
    { x: 0, y: sheet.height },
  ];
}

export function initialState(sheet: CraftSheet): FoldState {
  return { layers: [{ id: 'sheet', polygon: sheetPolygon(sheet), flips: 0, moving: false }] };
}

function movingKeep(side: CraftFoldStep['side']): 1 | -1 {
  return side === 'left' ? 1 : -1;
}

function scopeStart(state: FoldState, step: CraftFoldStep): number {
  return step.layerScope === undefined || step.layerScope === 'all'
    ? 0
    : Math.max(0, state.layers.length - Math.max(1, Math.floor(step.layerScope)));
}

/**
 * The stack part-way through one fold. `t` of 0 is the state before the step,
 * 1 is the state after it, and everything between is the flap in mid-air —
 * which is why `applyFold` is just this at t = 1 rather than a second
 * implementation that could drift from it.
 */
export function foldFrame(state: FoldState, step: CraftFoldStep, t: number): FoldState {
  // A crease is pressed in and released, so the paper it leaves behind is the
  // paper it started as - no split, no reflection, no new layer.
  if (step.kind === 'crease') return state;

  const keep = movingKeep(step.side);
  // Bottom first, so the top N layers are the last N.
  const first = scopeStart(state, step);

  const untouched: FoldLayer[] = [];
  const stay: FoldLayer[] = [];
  const moved: FoldLayer[] = [];

  state.layers.forEach((layer, index) => {
    if (index < first) {
      untouched.push({ ...layer, moving: false });
      return;
    }

    const { left, right } = splitByLine(layer.polygon, step.from, step.to);
    const movingPart = keep === 1 ? left : right;
    const staticPart = keep === 1 ? right : left;

    if (!isDegenerate(staticPart)) {
      stay.push({ id: `${layer.id}.s${index}`, polygon: staticPart, flips: layer.flips, moving: false });
    }
    if (!isDegenerate(movingPart)) {
      moved.push({
        id: `${layer.id}.m${index}`,
        polygon: foldPolygon(movingPart, step.from, step.to, t),
        flips: layer.flips + 1,
        moving: true,
      });
    }
  });

  moved.reverse();
  const inScope = step.foldType === 'mountain' ? [...moved, ...stay] : [...stay, ...moved];
  const layers = [...untouched, ...inScope];

  return { layers: layers.length > MAX_LAYERS ? layers.slice(layers.length - MAX_LAYERS) : layers };
}

export function applyFold(state: FoldState, step: CraftFoldStep): FoldState {
  if (step.kind === 'crease') return state;
  const next = foldFrame(state, step, 1);
  return { layers: next.layers.map((layer) => ({ ...layer, moving: false })) };
}

/** The stack layers a step actually folds: everything from the scope cut down to the top. */
export function inScopeLayers(state: FoldState, step: CraftFoldStep): FoldLayer[] {
  return state.layers.slice(scopeStart(state, step));
}

export interface FoldQuality {
  /** The crease actually cuts paper in scope (the step is a real fold/crease, not a dead frame). */
  cutsPaper: boolean;
  /** The whole in-scope paper moves over — nothing stays in place, so the reader sees one flat colour. */
  foldsAll: boolean;
  /** 0..1 fraction of in-scope area carried across the crease. */
  movingFraction: number;
}

/**
 * Whether a step plays: a crease that misses the paper folds nothing (a dead
 * frame), and a fold that carries the entire in-scope area — or near-half of
 * it — reads as one flat colour.
 */
export function foldQuality(state: FoldState, step: CraftFoldStep): FoldQuality {
  const keep = movingKeep(step.side);

  let cutsPaper = false;
  let movingArea = 0;
  let staticArea = 0;

  for (const layer of inScopeLayers(state, step)) {
    const { left, right } = splitByLine(layer.polygon, step.from, step.to);

    if (step.kind === 'crease') {
      if (!isDegenerate(left) && !isDegenerate(right)) cutsPaper = true;
      continue;
    }

    const movingPart = keep === 1 ? left : right;
    const staticPart = keep === 1 ? right : left;

    if (!isDegenerate(movingPart) && !isDegenerate(staticPart)) cutsPaper = true;
    movingArea += polygonArea(movingPart);
    staticArea += polygonArea(staticPart);
  }

  if (step.kind === 'crease') return { cutsPaper, foldsAll: false, movingFraction: 0 };

  const total = movingArea + staticArea;
  const foldsAll = total > 0 && staticArea < MIN_AREA;
  const movingFraction = total > 0 ? movingArea / total : 0;
  return { cutsPaper, foldsAll, movingFraction };
}

/** The first step in the sequence that folds nothing (dead frame), or null when every step plays. */
export function firstDeadFrame(data: CraftFileData): { index: number } | null {
  let state = initialState(data.sheet);
  for (let i = 0; i < data.steps.length; i += 1) {
    const step = data.steps[i]!;
    if (!foldQuality(state, step).cutsPaper) return { index: i };
    state = applyFold(state, step);
  }
  return null;
}

/** The crease lines pressed into the paper by the first `count` steps, carried through every later fold. */
export function creaseLines(
  data: CraftFileData,
  count: number,
): { from: CraftPoint; to: CraftPoint }[] {
  const limit = Math.max(0, Math.min(count, data.steps.length));
  let state = initialState(data.sheet);
  const segments: { from: CraftPoint; to: CraftPoint }[] = [];

  for (let i = 0; i < limit; i += 1) {
    const step = data.steps[i]!;

    if (step.kind === 'crease') {
      segments.push({ from: step.from, to: step.to });
      continue;
    }

    // Carry every existing segment through this fold.
    const keep = movingKeep(step.side);
    const moving: Polygon[] = [];
    for (const layer of inScopeLayers(state, step)) {
      const { left, right } = splitByLine(layer.polygon, step.from, step.to);
      const piece = keep === 1 ? left : right;
      if (!isDegenerate(piece)) moving.push(piece);
    }

    const reflect = (p: CraftPoint): CraftPoint =>
      foldPoint(p, step.from, step.to, 1);

    const insideMoving = (p: CraftPoint): boolean =>
      moving.some((piece) => pointInConvexPolygon(p, piece));

    const carried: { from: CraftPoint; to: CraftPoint }[] = [];

    for (const seg of segments) {
      const aMoves = insideMoving(seg.from);
      const bMoves = insideMoving(seg.to);

      if (aMoves && bMoves) {
        carried.push({ from: reflect(seg.from), to: reflect(seg.to) });
      } else if (!aMoves && !bMoves) {
        carried.push(seg);
      } else {
        // One endpoint moves – split at the fold line.
        const a = aMoves ? seg.from : seg.to;
        const b = aMoves ? seg.to : seg.from;
        const sa = sideOf(a, step.from, step.to);
        const sb = sideOf(b, step.from, step.to);
        const t = sa / (sa - sb);
        const c: CraftPoint = {
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t,
        };
        // Static piece: c (on axis) to the non-moving endpoint.
        if (Math.hypot(c.x - b.x, c.y - b.y) >= 1e-3) carried.push({ from: c, to: b });
        // Moving piece: reflected endpoint to c.
        const ra = reflect(a);
        if (Math.hypot(ra.x - c.x, ra.y - c.y) >= 1e-3) carried.push({ from: ra, to: c });
      }
    }

    // Replace segments with the carried result, then apply the fold to state.
    segments.length = 0;
    segments.push(...carried);
    state = applyFold(state, step);
  }

  return segments;
}

/** The stack after the first `count` steps have been folded. */
export function replay(data: CraftFileData, count: number): FoldState {
  let state = initialState(data.sheet);
  const limit = Math.max(0, Math.min(count, data.steps.length));
  for (let i = 0; i < limit; i += 1) state = applyFold(state, data.steps[i]!);
  return state;
}

/** Every distinct outline vertex of the current stack, for the editor's snap targets. */
export function outlinePoints(state: FoldState): CraftPoint[] {
  const seen = new Map<string, CraftPoint>();
  for (const layer of state.layers) {
    for (const point of layer.polygon) {
      const key = `${point.x.toFixed(3)}:${point.y.toFixed(3)}`;
      if (!seen.has(key)) seen.set(key, point);
    }
  }
  return [...seen.values()];
}

/** Every distinct outline edge of the current stack, for the add-vertex tool. */
export function outlineEdges(state: FoldState): [CraftPoint, CraftPoint][] {
  const seen = new Set<string>();
  const edges: [CraftPoint, CraftPoint][] = [];

  for (const layer of state.layers) {
    for (let i = 0; i < layer.polygon.length; i += 1) {
      const a = layer.polygon[i]!;
      const b = layer.polygon[(i + 1) % layer.polygon.length]!;
      const first = `${a.x.toFixed(2)}:${a.y.toFixed(2)}`;
      const second = `${b.x.toFixed(2)}:${b.y.toFixed(2)}`;
      const key = first < second ? `${first}|${second}` : `${second}|${first}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([a, b]);
    }
  }

  return edges;
}

/**
 * The viewBox the whole sequence fits inside. A flap larger than the piece it
 * folds onto lands outside the original sheet, so the box is the union of
 * every state rather than the sheet rectangle.
 */
export function contentBounds(data: CraftFileData, padding = 8): Bounds {
  const polygons: Polygon[] = [sheetPolygon(data.sheet)];
  let state = initialState(data.sheet);

  for (const step of data.steps) {
    // Mid-fold never leaves the envelope of the two flat states, so sampling
    // the endpoints is enough to bound the animation as well as the stills.
    state = applyFold(state, step);
    for (const layer of state.layers) polygons.push(layer.polygon);
  }

  const bounds = boundsOf(polygons) ?? { minX: 0, minY: 0, maxX: data.sheet.width, maxY: data.sheet.height };

  return {
    minX: bounds.minX - padding,
    minY: bounds.minY - padding,
    maxX: bounds.maxX + padding,
    maxY: bounds.maxY + padding,
  };
}

export function viewBoxOf(bounds: Bounds): string {
  return `${bounds.minX} ${bounds.minY} ${bounds.maxX - bounds.minX} ${bounds.maxY - bounds.minY}`;
}
