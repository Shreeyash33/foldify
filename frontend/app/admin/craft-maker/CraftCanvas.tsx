'use client';

import { useMemo } from 'react';
import type { CraftFileData, CraftFoldSide, CraftFoldStep, CraftPoint } from '@foldify/shared';
import { FoldStage } from '@/app/components/craft/FoldStage';
import { contentBounds, replay } from '@/app/lib/craft/fold-model';
import {
  clipHalfPlane,
  distance,
  isDegenerate,
  perpendicularBisector,
  sideOf,
  toPathData,
} from '@/app/lib/craft/geometry';
import {
  SNAP_RADIUS,
  destinationTargets,
  nearestTarget,
  snapTargets,
  stageBounds,
  stageFrame,
} from './editor-geometry';
import type { FoldDraft } from './fold-draft';

/**
 * The FoldStage plus the editor's handles.
 *
 * A fold is authored as a gesture: the origin is the point that travels, the
 * destination is where it lands, and the crease is the perpendicular bisector
 * of the two. The overlay draws that chain - travel line, derived crease, and
 * the tinted half that will actually move - so nothing about the recorded step
 * has to be taken on trust before it is committed.
 */

export type CraftTool = 'fold' | 'vertex';

export interface CraftCanvasProps {
  data: CraftFileData;
  previewIndex: number;
  tool: CraftTool;
  /** The fold being recorded. null when nothing is picked. */
  draft: FoldDraft | null;
  /** The crease and side derived from a complete draft. null until the destination is picked. */
  draftFold: CraftFoldStep | null;
  /** Author override of which half moves; null means use draftFold.side. */
  draftSide: CraftFoldSide | null;
  hover: CraftPoint | null;
  playing: boolean;
  /** The author vertex currently selected, when the vertex tool is active. */
  selectedVertexId: string | null;
  onSelectVertex: (id: string | null) => void;
  onPickPoint: (point: CraftPoint) => void;
  onHover: (point: CraftPoint | null) => void;
  onFoldComplete: () => void;
}

/** Corners are regenerated from the sheet, so they may be moved but not removed. */
export function isCornerVertex(id: string): boolean {
  return id.startsWith('corner-');
}

function keyOf(point: CraftPoint): string {
  return `${point.x.toFixed(3)}:${point.y.toFixed(3)}`;
}

function same(a: CraftPoint, b: CraftPoint): boolean {
  return distance(a, b) < 0.001;
}

/** A triangle at the far end of the gesture. Drawn by hand: a marker element does not scale with the sheet. */
function arrowHead(from: CraftPoint, to: CraftPoint, scale: number): string | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const back = 3.4 * scale;
  if (length < back * 1.4) return null;

  const ux = dx / length;
  const uy = dy / length;
  const half = 1.7 * scale;
  const bx = to.x - ux * back;
  const by = to.y - uy * back;

  return [
    `M ${to.x} ${to.y}`,
    `L ${bx - uy * half} ${by + ux * half}`,
    `L ${bx + uy * half} ${by - ux * half}`,
    'Z',
  ].join(' ');
}

export function CraftCanvas({
  data,
  previewIndex,
  tool,
  draft,
  draftFold,
  draftSide,
  hover,
  playing,
  selectedVertexId,
  onSelectVertex,
  onPickPoint,
  onHover,
  onFoldComplete,
}: CraftCanvasProps) {
  const overlay = useMemo(() => {
    const { bounds, scale } = stageFrame(data);
    const state = replay(data, previewIndex);

    const editingVertices = tool === 'vertex' && !playing;
    const drafting = tool === 'fold' && draft !== null && !playing;
    const picking = drafting && draft.target === null;

    const centre = { x: data.sheet.width / 2, y: data.sheet.height / 2 };
    // The sheet centre is only ever a landing spot, so it joins the targets
    // while the destination is being chosen and not before.
    const targets = picking
      ? destinationTargets(state, data.vertices, data.sheet, scale)
      : snapTargets(state, data.vertices, scale);

    const snappedHover =
      hover === null ? null : (nearestTarget(hover, targets, SNAP_RADIUS * scale) ?? hover);
    const destination = draft === null ? null : (draft.target ?? (picking ? snappedHover : null));

    /** Crease plus the half it moves, drawn the same way whether or not the step exists yet. */
    const foldPreview = (
      from: CraftPoint,
      to: CraftPoint,
      side: CraftFoldSide,
      creaseOpacity: number,
    ) => {
      const keep: 1 | -1 = side === 'right' ? -1 : 1;
      const regions = state.layers
        .map((layer) => clipHalfPlane(layer.polygon, from, to, keep))
        .filter((polygon) => !isDegenerate(polygon));

      return (
        <g pointerEvents="none">
          {regions.map((polygon, index) => (
            <path
              key={`moving:${index}`}
              d={toPathData(polygon)}
              fill="var(--color-beni)"
              opacity={0.22}
            />
          ))}
          <line
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="var(--color-beni)"
            strokeWidth={1.6 * scale}
            strokeDasharray={`${5 * scale} ${2.6 * scale}`}
            strokeLinecap="round"
            opacity={creaseOpacity}
          />
        </g>
      );
    };

    // While the destination is still being chosen the crease is derived from the
    // hover, so the author sees the result before committing to it.
    const provisional = (() => {
      if (!picking || draft === null || snappedHover === null) return null;
      if (distance(draft.origin, snappedHover) < 0.001) return null;
      const crease = perpendicularBisector(
        draft.origin,
        snappedHover,
        stageBounds(state) ?? contentBounds(data),
      );
      if (crease === null) return null;
      const [from, to] = crease;
      const side: CraftFoldSide = sideOf(draft.origin, from, to) > 0 ? 'left' : 'right';
      return foldPreview(from, to, side, 0.65);
    })();

    const head =
      draft === null || destination === null ? null : arrowHead(draft.origin, destination, scale);

    return (
      <g>
        {/* The answer to "which region moves", before the step exists. */}
        {draftFold !== null && drafting
          ? foldPreview(draftFold.from, draftFold.to, draftSide ?? draftFold.side, 1)
          : provisional}

        {draft !== null && destination !== null && drafting ? (
          <g pointerEvents="none">
            <line
              x1={draft.origin.x}
              y1={draft.origin.y}
              x2={destination.x}
              y2={destination.y}
              stroke="var(--color-ink)"
              strokeWidth={0.55 * scale}
              strokeDasharray={`${2 * scale} ${2 * scale}`}
              strokeLinecap="round"
            />
            {head === null ? null : <path d={head} fill="var(--color-ink)" />}
            <circle
              cx={destination.x}
              cy={destination.y}
              r={2.2 * scale}
              fill="var(--color-paper-raised)"
              stroke="var(--color-ink)"
              strokeWidth={0.7 * scale}
            />
          </g>
        ) : null}

        {/* Either paper face can sit under a snap dot, so these read on the
            coloured side and the white one alike. */}
        {playing
          ? null
          : targets.map((target) => {
              if (picking && same(target, centre)) return null;
              const hot = picking && snappedHover !== null && same(snappedHover, target);
              return (
                <circle
                  key={keyOf(target)}
                  cx={target.x}
                  cy={target.y}
                  r={(hot ? 2.2 : 1.5) * scale}
                  fill={hot ? 'var(--color-beni)' : 'var(--color-paper-raised)'}
                  stroke="var(--color-ink)"
                  strokeWidth={0.6 * scale}
                  pointerEvents="none"
                />
              );
            })}

        {/* The centre is a ringed cross, not a dot, so folding to it is findable. */}
        {picking ? (
          <g pointerEvents="none">
            <circle
              cx={centre.x}
              cy={centre.y}
              r={2.9 * scale}
              fill="none"
              stroke="var(--color-beni)"
              strokeWidth={0.7 * scale}
            />
            <line
              x1={centre.x - 1.6 * scale}
              y1={centre.y}
              x2={centre.x + 1.6 * scale}
              y2={centre.y}
              stroke="var(--color-ink)"
              strokeWidth={0.6 * scale}
            />
            <line
              x1={centre.x}
              y1={centre.y - 1.6 * scale}
              x2={centre.x}
              y2={centre.y + 1.6 * scale}
              stroke="var(--color-ink)"
              strokeWidth={0.6 * scale}
            />
          </g>
        ) : null}

        {draft !== null && drafting ? (
          <g pointerEvents="none">
            <circle
              cx={draft.origin.x}
              cy={draft.origin.y}
              r={2.6 * scale}
              fill="var(--color-beni)"
            />
            <circle
              cx={draft.origin.x}
              cy={draft.origin.y}
              r={4.2 * scale}
              fill="none"
              stroke="var(--color-beni)"
              strokeWidth={0.7 * scale}
            />
          </g>
        ) : null}

        {/* Transparent lid so the rubber band can track the pointer. Clicks still
            reach the stage underneath, which owns the coordinate transform. */}
        <rect
          x={bounds.minX}
          y={bounds.minY}
          width={bounds.maxX - bounds.minX}
          height={bounds.maxY - bounds.minY}
          fill="transparent"
          pointerEvents={picking ? 'all' : 'none'}
          onMouseMove={(event) => {
            const svg = event.currentTarget.ownerSVGElement;
            if (svg === null) return;
            const matrix = svg.getScreenCTM();
            if (matrix === null) return;
            const point = svg.createSVGPoint();
            point.x = event.clientX;
            point.y = event.clientY;
            const local = point.matrixTransform(matrix.inverse());
            onHover({ x: local.x, y: local.y });
          }}
          onMouseLeave={() => onHover(null)}
        />

        {/* The author's own points, drawn last so a handle wins over the lid.
            Corners are squares and cannot be removed; added points are round. */}
        {editingVertices ? (
          <g>
            {/* Paper that is not a handle: the click drops the selection and
                still bubbles to the stage, which adds a point. */}
            <rect
              x={bounds.minX}
              y={bounds.minY}
              width={bounds.maxX - bounds.minX}
              height={bounds.maxY - bounds.minY}
              fill="transparent"
              pointerEvents="all"
              onClick={() => onSelectVertex(null)}
            />

            {data.vertices.map((vertex) => {
              const corner = isCornerVertex(vertex.id);
              const half = 2 * scale;

              return (
                <g
                  key={vertex.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectVertex(vertex.id);
                  }}
                >
                  {vertex.id === selectedVertexId ? (
                    <circle
                      cx={vertex.x}
                      cy={vertex.y}
                      r={4.6 * scale}
                      fill="none"
                      stroke="var(--color-beni)"
                      strokeWidth={0.9 * scale}
                      pointerEvents="none"
                    />
                  ) : null}

                  {corner ? (
                    <rect
                      x={vertex.x - half}
                      y={vertex.y - half}
                      width={half * 2}
                      height={half * 2}
                      fill="var(--color-paper-raised)"
                      stroke="var(--color-ink-muted)"
                      strokeWidth={0.7 * scale}
                      pointerEvents="none"
                    />
                  ) : (
                    <circle
                      cx={vertex.x}
                      cy={vertex.y}
                      r={2.3 * scale}
                      fill="var(--color-paper-raised)"
                      stroke="var(--color-indigo)"
                      strokeWidth={0.9 * scale}
                      pointerEvents="none"
                    />
                  )}

                  {/* A handle is smaller than a comfortable click target. */}
                  <circle
                    cx={vertex.x}
                    cy={vertex.y}
                    r={4 * scale}
                    fill="transparent"
                    pointerEvents="all"
                    style={{ cursor: 'pointer' }}
                  />
                </g>
              );
            })}
          </g>
        ) : null}
      </g>
    );
  }, [
    data,
    previewIndex,
    tool,
    draft,
    draftFold,
    draftSide,
    hover,
    playing,
    selectedVertexId,
    onSelectVertex,
    onHover,
  ]);

  return (
    <FoldStage
      data={data}
      stepIndex={previewIndex}
      onFoldComplete={onFoldComplete}
      onPickPoint={onPickPoint}
      overlay={overlay}
      ariaLabel="Fold canvas. Click the point that moves, then click where it lands."
    />
  );
}
