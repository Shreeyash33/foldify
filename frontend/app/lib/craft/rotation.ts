import type { CraftPoint, CraftRotation } from '@foldify/shared';
import { boundsOf, type Bounds, type Polygon } from './geometry';

export type PointTransform = (point: CraftPoint) => CraftPoint;

export function degreesToRad(d: number): number {
  return (d * Math.PI) / 180;
}

export function rotationTransform(
  rotation: CraftRotation | undefined,
  centre: CraftPoint,
): PointTransform {
  if (rotation === undefined || Math.abs(rotation.degrees) < 1e-9) {
    return (p) => p;
  }

  const θ = degreesToRad(rotation.degrees);
  const cx = centre.x;
  const cy = centre.y;

  switch (rotation.axis) {
    case 'z':
      return (p) => ({
        x: cx + (p.x - cx) * Math.cos(θ) - (p.y - cy) * Math.sin(θ),
        y: cy + (p.x - cx) * Math.sin(θ) + (p.y - cy) * Math.cos(θ),
      });
    case 'x':
      return (p) => ({
        x: p.x,
        y: cy + (p.y - cy) * Math.cos(θ),
      });
    case 'y':
      return (p) => ({
        x: cx + (p.x - cx) * Math.cos(θ),
        y: p.y,
      });
  }
}

export function inverseRotationTransform(
  rotation: CraftRotation | undefined,
  centre: CraftPoint,
): PointTransform {
  if (rotation === undefined) return (p) => p;
  return rotationTransform({ axis: rotation.axis, degrees: -rotation.degrees }, centre);
}

export function transformPolygon(polygon: Polygon, t: PointTransform): Polygon {
  return polygon.map(t);
}

export function transformBounds(bounds: Bounds, t: PointTransform): Bounds {
  const corners: CraftPoint[] = [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY },
  ];
  const midpoints: CraftPoint[] = [
    { x: (bounds.minX + bounds.maxX) / 2, y: bounds.minY },
    { x: bounds.maxX, y: (bounds.minY + bounds.maxY) / 2 },
    { x: (bounds.minX + bounds.maxX) / 2, y: bounds.maxY },
    { x: bounds.minX, y: (bounds.minY + bounds.maxY) / 2 },
  ];
  const points = [...corners, ...midpoints].map(t);
  const rect = boundsOf(
    points.map((p) => [p]),
  );
  return rect ?? bounds;
}

export function rotationAffine(
  rotation: CraftRotation | undefined,
  centre: CraftPoint,
): { a: number; b: number; c: number; d: number; e: number; f: number } | null {
  if (rotation === undefined || Math.abs(rotation.degrees) < 1e-9) return null;

  const θ = degreesToRad(rotation.degrees);
  const cos = Math.cos(θ);
  const sin = Math.sin(θ);
  const cx = centre.x;
  const cy = centre.y;

  switch (rotation.axis) {
    case 'z':
      return { a: cos, b: sin, c: -sin, d: cos, e: cx - cx * cos + cy * sin, f: cy - cy * cos - cx * sin };
    case 'x':
      return { a: 1, b: 0, c: 0, d: cos, e: 0, f: cy * (1 - cos) };
    case 'y':
      return { a: cos, b: 0, c: 0, d: 1, e: cx * (1 - cos), f: 0 };
  }
}
