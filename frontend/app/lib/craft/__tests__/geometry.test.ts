import { describe, expect, it } from 'vitest';
import type { CraftFoldStep, CraftPoint, CraftSheet } from '@foldify/shared';
import {
  boundsOf,
  clamp01,
  clipHalfPlane,
  distance,
  foldPoint,
  foldPolygon,
  isDegenerate,
  midpoint,
  perpendicularBisector,
  polygonArea,
  projectOnSegment,
  splitByLine,
  type Polygon,
} from '../geometry';
import { initialState, replay, sheetPolygon } from '../fold-model';
const SHEET: CraftSheet = { preset: 'square', width: 100, height: 100 };

function isConvex(polygon: Polygon): boolean {
  if (polygon.length < 3) return false;
  let sign = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;
    const c = polygon[(i + 2) % polygon.length]!;
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (cross !== 0) {
      if (sign === 0) sign = Math.sign(cross);
      else if (Math.sign(cross) !== sign) return false;
    }
  }
  return true;
}

function totalArea(polygons: Polygon[]): number {
  return polygons.reduce((sum, polygon) => sum + polygonArea(polygon), 0);
}

function foldAll(sheet: CraftSheet, steps: CraftFoldStep[]): Polygon[] {
  return replay({ sheet, vertices: [], steps }, steps.length).layers.map((layer) => layer.polygon);
}

describe('polygonArea', () => {
  it('returns the area of a unit square', () => {
    const square: CraftPoint[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    expect(polygonArea(square)).toBeCloseTo(1, 6);
  });

  it('returns the area of a triangle', () => {
    const triangle: CraftPoint[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: 10 },
    ];
    expect(polygonArea(triangle)).toBeCloseTo(50, 6);
  });

  it('is independent of vertex winding direction', () => {
    const clockwise: CraftPoint[] = [
      { x: 0, y: 0 },
      { x: 0, y: 4 },
      { x: 4, y: 4 },
      { x: 4, y: 0 },
    ];
    const counterClockwise = [...clockwise].reverse();
    expect(polygonArea(clockwise)).toBeCloseTo(polygonArea(counterClockwise), 9);
  });
});

describe('isDegenerate', () => {
  it('flags fewer than 3 vertices', () => {
    expect(isDegenerate([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe(true);
  });

  it('accepts a real square', () => {
    const square = sheetPolygon({ preset: 'square', width: 10, height: 10 });
    expect(isDegenerate(square)).toBe(false);
  });
});

describe('splitByLine', () => {
  it('splits a square in half vertically', () => {
    const square = sheetPolygon(SHEET);
    const { left, right } = splitByLine(square, { x: 50, y: 0 }, { x: 50, y: 100 });
    const areaLeft = polygonArea(left);
    const areaRight = polygonArea(right);
    expect(areaLeft).toBeCloseTo(areaRight, 6);
    expect(areaLeft + areaRight).toBeCloseTo(polygonArea(square), 6);
    expect(isConvex(left)).toBe(true);
    expect(isConvex(right)).toBe(true);
  });

  it('leaves a single piece when the line misses the polygon', () => {
    const square = sheetPolygon(SHEET);
    const { left, right } = splitByLine(square, { x: 200, y: 0 }, { x: 200, y: 100 });
    expect(isDegenerate(left) || isDegenerate(right)).toBe(true);
    const kept = isDegenerate(left) ? right : left;
    expect(kept.length).toBeGreaterThanOrEqual(4);
  });

  it('conserves total area across both halves', () => {
    const square = sheetPolygon(SHEET);
    const { left, right } = splitByLine(square, { x: 25, y: 0 }, { x: 25, y: 100 });
    expect(polygonArea(left) + polygonArea(right)).toBeCloseTo(polygonArea(square), 6);
  });
});

describe('clipHalfPlane', () => {
  it('returns the input untouched when the plane contains everything', () => {
    const square = sheetPolygon(SHEET);
    const clipped = clipHalfPlane(square, { x: 0, y: 0 }, { x: 100, y: 0 }, 1);
    expect(clipped).toHaveLength(square.length);
    expect(polygonArea(clipped)).toBeCloseTo(polygonArea(square), 6);
  });

  it('produces an empty polygon when the plane excludes everything', () => {
    const square = sheetPolygon(SHEET);
    const clipped = clipHalfPlane(square, { x: 0, y: 200 }, { x: 100, y: 200 }, 1);
    expect(clipped.length).toBe(0);
  });

  it('introduces a cut edge on the clip boundary', () => {
    const square = sheetPolygon(SHEET);
    const clipped = clipHalfPlane(square, { x: 50, y: 0 }, { x: 50, y: 100 }, 1);
    expect(clipped.some((p) => Math.abs(p.x - 50) < 1e-6)).toBe(true);
  });
});

describe('foldPoint and foldPolygon', () => {
  it('keeps the point still at t = 0', () => {
    const p = { x: 10, y: 20 };
    const folded = foldPoint(p, { x: 0, y: 0 }, { x: 100, y: 0 }, 0);
    expect(folded.x).toBeCloseTo(p.x, 9);
    expect(folded.y).toBeCloseTo(p.y, 9);
  });

  it('mirrors the point across the fold line at t = 1', () => {
    const p = { x: 10, y: 10 };
    const folded = foldPoint(p, { x: 0, y: 0 }, { x: 100, y: 0 }, 1);
    expect(folded.x).toBeCloseTo(10, 6);
    expect(folded.y).toBeCloseTo(-10, 6);
  });

  it('conserves the polygon area through a full fold', () => {
    const square = sheetPolygon(SHEET);
    const folded = foldPolygon(square, { x: 0, y: 0 }, { x: 100, y: 0 }, 1);
    expect(polygonArea(folded)).toBeCloseTo(polygonArea(square), 6);
    expect(isConvex(folded)).toBe(true);
  });

  it('maps geometry proportionally at a halfway fold', () => {
    const p = { x: 0, y: 10 };
    const half = foldPoint(p, { x: 0, y: 0 }, { x: 100, y: 0 }, 0.5);
    expect(half.x).toBeCloseTo(0, 6);
    expect(half.y).toBeCloseTo(0, 6);
  });
});

describe('fold model invariants', () => {
  it('conserves total area across a fold that splits the sheet in two', () => {
    const sheet: CraftSheet = { preset: 'square', width: 100, height: 100 };
    const step: CraftFoldStep = {
      id: 'fold-1',
      from: { x: 50, y: 0 },
      to: { x: 50, y: 100 },
      side: 'right',
      foldType: 'valley',
      instruction: '',
      durationMs: 900,
    };
    const before = [sheetPolygon(sheet)];
    const after = foldAll(sheet, [step]);
    expect(totalArea(after)).toBeCloseTo(totalArea(before), 6);
    for (const polygon of after) expect(isConvex(polygon)).toBe(true);
  });

  it('conserves area after two consecutive folds', () => {
    const sheet: CraftSheet = { preset: 'square', width: 100, height: 100 };
    const steps: CraftFoldStep[] = [
      {
        id: 'fold-1',
        from: { x: 50, y: 0 },
        to: { x: 50, y: 100 },
        side: 'right',
        foldType: 'valley',
        instruction: '',
        durationMs: 900,
      },
      {
        id: 'fold-2',
        from: { x: 0, y: 50 },
        to: { x: 100, y: 50 },
        side: 'right',
        foldType: 'mountain',
        instruction: '',
        durationMs: 900,
      },
    ];
    const before = [sheetPolygon(sheet)];
    const after = foldAll(sheet, steps);
    expect(totalArea(after)).toBeCloseTo(totalArea(before), 6);
    for (const polygon of after) expect(isConvex(polygon)).toBe(true);
  });

  it('every layer stays convex after repeated folds', () => {
    const sheet: CraftSheet = { preset: 'square', width: 200, height: 200 };
    const steps: CraftFoldStep[] = [
      {
        id: 'fold-1',
        from: { x: 100, y: 0 },
        to: { x: 100, y: 200 },
        side: 'right',
        foldType: 'valley',
        instruction: '',
        durationMs: 900,
      },
      {
        id: 'fold-2',
        from: { x: 0, y: 100 },
        to: { x: 200, y: 100 },
        side: 'right',
        foldType: 'valley',
        instruction: '',
        durationMs: 900,
      },
      {
        id: 'fold-3',
        from: { x: 50, y: 0 },
        to: { x: 50, y: 200 },
        side: 'left',
        foldType: 'mountain',
        instruction: '',
        durationMs: 900,
      },
    ];
    const after = foldAll(sheet, steps);
    for (const polygon of after) expect(isConvex(polygon)).toBe(true);
  });
});

describe('initialState and sheetPolygon', () => {
  it('produces the sheet area', () => {
    const state = initialState(SHEET);
    expect(state.layers).toHaveLength(1);
    expect(polygonArea(state.layers[0]!.polygon)).toBeCloseTo(100 * 100, 6);
  });
});

describe('ancillary geometry helpers', () => {
  it('midpoint halves the segment', () => {
    const mid = midpoint({ x: 0, y: 0 }, { x: 10, y: 8 });
    expect(mid.x).toBeCloseTo(5, 9);
    expect(mid.y).toBeCloseTo(4, 9);
  });

  it('distance measures Euclidean separation', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5, 9);
  });

  it('clamp01 clamps into [0, 1]', () => {
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(7)).toBe(1);
  });

  it('projectOnSegment projects to the nearest point', () => {
    const { point, distance: d } = projectOnSegment({ x: 1, y: 2 }, { x: 0, y: 0 }, { x: 10, y: 0 });
    expect(point.x).toBeCloseTo(1, 9);
    expect(point.y).toBeCloseTo(0, 9);
    expect(d).toBeCloseTo(2, 9);
  });

  it('boundsOf unions point extents', () => {
    const bounds = boundsOf([
      [
        { x: 0, y: 0 },
        { x: 4, y: 2 },
      ],
      [
        { x: -1, y: 3 },
        { x: 2, y: -5 },
      ],
    ]);
    expect(bounds!.minX).toBeCloseTo(-1, 9);
    expect(bounds!.maxX).toBeCloseTo(4, 9);
    expect(bounds!.minY).toBeCloseTo(-5, 9);
    expect(bounds!.maxY).toBeCloseTo(3, 9);
  });

  it('perpendicularBisector folds origin onto target at t = 1', () => {
    const crease = perpendicularBisector(
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { minX: -100, minY: -100, maxX: 100, maxY: 100 },
    );
    expect(crease).not.toBeNull();
    const [from, to] = crease!;
    const reflected = foldPoint({ x: 0, y: 0 }, from, to, 1);
    expect(reflected.x).toBeCloseTo(20, 6);
    expect(reflected.y).toBeCloseTo(0, 6);
  });
});
