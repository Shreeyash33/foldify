import type { CraftPoint } from '@foldify/shared';

/**
 * Straight-fold geometry, in sheet millimetres.
 *
 * The one property the whole fold model leans on: a rectangle is convex, and
 * both clipping a convex polygon by a half-plane and reflecting it across a
 * line preserve convexity. Every paper layer therefore stays convex for the
 * life of a fold sequence, which is why a twelve-line Sutherland-Hodgman clip
 * is exact here and no polygon-boolean library is needed.
 */

export type Polygon = CraftPoint[];

const EPS = 1e-9;
/** Square millimetres. Below this a clipped piece is a sliver, not a layer. */
const MIN_AREA = 1e-4;

/**
 * Twice the signed area of the triangle (a, b, p). Positive when p lies to the
 * left of the directed line a -> b in a y-down coordinate system's mirror
 * sense; the label is arbitrary, the sign is what matters.
 */
export function sideOf(p: CraftPoint, a: CraftPoint, b: CraftPoint): number {
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
}

export function polygonArea(polygon: Polygon): number {
  let total = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const current = polygon[i]!;
    const next = polygon[(i + 1) % polygon.length]!;
    total += current.x * next.y - next.x * current.y;
  }
  return Math.abs(total) / 2;
}

export function isDegenerate(polygon: Polygon): boolean {
  return polygon.length < 3 || polygonArea(polygon) < MIN_AREA;
}

function intersect(p: CraftPoint, q: CraftPoint, dp: number, dq: number): CraftPoint {
  const t = dp / (dp - dq);
  return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t };
}

/** The part of `polygon` on the `keep` side of the line a -> b, plus the cut edge. */
export function clipHalfPlane(polygon: Polygon, a: CraftPoint, b: CraftPoint, keep: 1 | -1): Polygon {
  const out: Polygon = [];

  for (let i = 0; i < polygon.length; i += 1) {
    const current = polygon[i]!;
    const next = polygon[(i + 1) % polygon.length]!;
    const dp = sideOf(current, a, b) * keep;
    const dq = sideOf(next, a, b) * keep;

    if (dp >= -EPS) out.push(current);
    if ((dp > EPS && dq < -EPS) || (dp < -EPS && dq > EPS)) out.push(intersect(current, next, dp, dq));
  }

  return out;
}

export interface SplitResult {
  left: Polygon;
  right: Polygon;
}

/** Cuts a convex polygon in two along the infinite line through a and b. */
export function splitByLine(polygon: Polygon, a: CraftPoint, b: CraftPoint): SplitResult {
  return {
    left: clipHalfPlane(polygon, a, b, 1),
    right: clipHalfPlane(polygon, a, b, -1),
  };
}

/**
 * A point part-way through a fold, viewed from straight above.
 *
 * The flap rotates out of the plane about the fold axis. Seen from overhead
 * the only visible effect is that the perpendicular distance from the axis
 * scales by cos(theta) — so the flap narrows to a crease at the halfway point
 * and opens out mirrored on the far side. `t` runs 0 (flat, unfolded) to 1
 * (flat, fully reflected), which is exactly the reflection at t = 1.
 */
export function foldPoint(p: CraftPoint, a: CraftPoint, b: CraftPoint, t: number): CraftPoint {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  if (length < EPS) return p;

  const ux = dx / length;
  const uy = dy / length;
  const nx = -uy;
  const ny = ux;

  const px = p.x - a.x;
  const py = p.y - a.y;
  const along = px * ux + py * uy;
  const across = (px * nx + py * ny) * Math.cos(Math.PI * t);

  return { x: a.x + along * ux + across * nx, y: a.y + along * uy + across * ny };
}

export function foldPolygon(polygon: Polygon, a: CraftPoint, b: CraftPoint, t: number): Polygon {
  return polygon.map((point) => foldPoint(point, a, b, t));
}

export function toPathData(polygon: Polygon): string {
  if (polygon.length === 0) return '';
  const [first, ...rest] = polygon as [CraftPoint, ...CraftPoint[]];
  const head = `M ${round(first.x)} ${round(first.y)}`;
  const tail = rest.map((point) => `L ${round(point.x)} ${round(point.y)}`).join(' ');
  return `${head} ${tail} Z`;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function boundsOf(polygons: Polygon[]): Bounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const polygon of polygons) {
    for (const point of polygon) {
      if (point.x < minX) minX = point.x;
      if (point.y < minY) minY = point.y;
      if (point.x > maxX) maxX = point.x;
      if (point.y > maxY) maxY = point.y;
    }
  }

  return minX === Infinity ? null : { minX, minY, maxX, maxY };
}

/** Nearest point to `p` on the segment a-b, and how far away it is. */
export function projectOnSegment(
  p: CraftPoint,
  a: CraftPoint,
  b: CraftPoint,
): { point: CraftPoint; distance: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq < EPS ? 0 : clamp01(((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq);
  const point = { x: a.x + dx * t, y: a.y + dy * t };
  return { point, distance: Math.hypot(p.x - point.x, p.y - point.y) };
}

export function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

export function distance(a: CraftPoint, b: CraftPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function midpoint(a: CraftPoint, b: CraftPoint): CraftPoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** The portion of the infinite line `p + t * d` that lies inside `bounds`. */
export function clipLineToBounds(
  p: CraftPoint,
  d: CraftPoint,
  bounds: Bounds,
): [CraftPoint, CraftPoint] | null {
  let near = -Infinity;
  let far = Infinity;

  const slab = (origin: number, direction: number, low: number, high: number): boolean => {
    if (Math.abs(direction) < EPS) return origin >= low && origin <= high;
    const a = (low - origin) / direction;
    const b = (high - origin) / direction;
    near = Math.max(near, Math.min(a, b));
    far = Math.min(far, Math.max(a, b));
    return true;
  };

  if (!slab(p.x, d.x, bounds.minX, bounds.maxX)) return null;
  if (!slab(p.y, d.y, bounds.minY, bounds.maxY)) return null;
  if (near > far) return null;

  return [
    { x: p.x + d.x * near, y: p.y + d.y * near },
    { x: p.x + d.x * far, y: p.y + d.y * far },
  ];
}

/**
 * The crease that folds `origin` exactly onto `target`: the perpendicular
 * bisector of the two, clipped to `bounds` so the drawn line spans the paper
 * rather than running off to infinity.
 *
 * This is what makes the fold tool deterministic. The author says which point
 * moves and where it lands; the crease and the moving half both follow from
 * that, instead of being guessed from two points drawn freehand.
 */
export function perpendicularBisector(
  origin: CraftPoint,
  target: CraftPoint,
  bounds: Bounds,
): [CraftPoint, CraftPoint] | null {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const length = Math.hypot(dx, dy);
  if (length < EPS) return null;

  return clipLineToBounds(midpoint(origin, target), { x: -dy / length, y: dx / length }, bounds);
}
