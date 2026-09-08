import type { CraftFileData, CraftPoint, CraftVertex } from '@foldify/shared';
import { boundsOf, distance, projectOnSegment, type Bounds } from '@/app/lib/craft/geometry';
import {
  contentBounds,
  outlineEdges,
  outlinePoints,
  type FoldState,
} from '@/app/lib/craft/fold-model';

/**
 * The editor's half of the fold geometry: what the overlay draws, and what a
 * click on the canvas resolves to. Everything here is in sheet millimetres.
 */

/** Sizes in the overlay are multiples of this, so a big sheet is not a big dot. */
export function stageFrame(data: CraftFileData): { bounds: Bounds; scale: number } {
  const bounds = contentBounds(data);
  return {
    bounds,
    scale: Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) / 100,
  };
}

/** How far a click may miss a snap point and still land on it. */
export const SNAP_RADIUS = 3.5;
/** How far an author vertex may sit off the outline and still count as on it. */
const ON_EDGE = 0.2;

function keyOf(point: CraftPoint): string {
  return `${point.x.toFixed(3)}:${point.y.toFixed(3)}`;
}

/**
 * Every point a fold may start or end on: the outline of the current stack,
 * plus the author's own vertices that still lie on that outline. A vertex
 * placed on an edge that a later fold has consumed is not a target.
 */
export function snapTargets(state: FoldState, vertices: CraftVertex[], scale: number): CraftPoint[] {
  const targets = outlinePoints(state);
  const seen = new Set(targets.map(keyOf));
  const edges = outlineEdges(state);
  const tolerance = ON_EDGE * scale;

  for (const vertex of vertices) {
    const point = { x: vertex.x, y: vertex.y };
    if (seen.has(keyOf(point))) continue;
    if (!edges.some((edge) => projectOnSegment(point, edge[0], edge[1]).distance <= tolerance)) continue;
    seen.add(keyOf(point));
    targets.push(point);
  }

  return targets;
}

export function nearestTarget(
  point: CraftPoint,
  targets: CraftPoint[],
  tolerance: number,
): CraftPoint | null {
  let best: CraftPoint | null = null;
  let bestDistance = tolerance;

  for (const target of targets) {
    const gap = distance(point, target);
    if (gap <= bestDistance) {
      best = target;
      bestDistance = gap;
    }
  }

  return best;
}

/** The nearest point to `point` anywhere on the current outline. */
export function projectOnOutline(point: CraftPoint, state: FoldState): CraftPoint | null {
  let best: CraftPoint | null = null;
  let bestDistance = Infinity;

  for (const edge of outlineEdges(state)) {
    const hit = projectOnSegment(point, edge[0], edge[1]);
    if (hit.distance < bestDistance) {
      best = hit.point;
      bestDistance = hit.distance;
    }
  }

  return best;
}

export function formatPoint(point: CraftPoint): string {
  return `${point.x.toFixed(1)}, ${point.y.toFixed(1)}`;
}

/** The bounding box of the paper as it stands, for clipping a crease to it. */
export function stageBounds(state: FoldState): Bounds | null {
  return boundsOf(state.layers.map((layer) => layer.polygon));
}

/**
 * Where a fold starts: a point ON the paper. A click snaps to a nearby vertex,
 * and otherwise lands wherever it fell on the nearest edge - so "click an edge"
 * works literally, not only "click a corner".
 */
export function resolveOrigin(
  raw: CraftPoint,
  state: FoldState,
  targets: CraftPoint[],
  scale: number,
): CraftPoint | null {
  return nearestTarget(raw, targets, SNAP_RADIUS * scale) ?? projectOnOutline(raw, state);
}

/**
 * Where a fold ends. Unlike the origin this may be anywhere, including off the
 * paper, so an unsnapped click is taken at face value. The sheet centre joins
 * the snap targets because folding a corner to the centre is the single most
 * common move in origami and is otherwise a pixel hunt.
 */
export function destinationTargets(
  state: FoldState,
  vertices: CraftVertex[],
  sheet: { width: number; height: number },
  scale: number,
): CraftPoint[] {
  return [...snapTargets(state, vertices, scale), { x: sheet.width / 2, y: sheet.height / 2 }];
}

export function resolveDestination(
  raw: CraftPoint,
  targets: CraftPoint[],
  scale: number,
): CraftPoint {
  return nearestTarget(raw, targets, SNAP_RADIUS * scale) ?? raw;
}
