'use client';

import gsap from 'gsap';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CraftFileData, CraftPoint } from '@foldify/shared';
import { toPathData } from '@/app/lib/craft/geometry';
import {
  contentBounds,
  creaseLines,
  foldFrame,
  replay,
  viewBoxOf,
  type FoldLayer,
} from '@/app/lib/craft/fold-model';
import { cn } from '@/app/lib/utils';

/**
 * The paper, as one SVG, driven by GSAP.
 *
 * Shared by the public player and the Craft Maker preview so a fold can never
 * look one way to the author and another to the reader.
 *
 * GSAP tweens a single scalar — the fold's progress — and each frame rebuilds
 * the layer paths from it (MorphSVG is a Club GreenSock plugin and is not on
 * npm, so the morph is done by hand). That is cheaper than it sounds: the
 * split of each layer into flap and remainder does not depend on progress, so
 * the path elements are mounted once per transition and only their `d`
 * changes. React never re-renders during the tween.
 */

export interface FoldStageProps {
  data: CraftFileData;
  /** Folds completed. 0 is the flat sheet, `steps.length` is the finished model. */
  stepIndex: number;
  onFoldComplete?: () => void;
  /** Drawn in sheet coordinates on top of the paper. Editor handles live here. */
  overlay?: React.ReactNode;
  onPickPoint?: (point: CraftPoint) => void;
  ariaLabel?: string;
  /** LAYOUT ONLY. */
  className?: string;
}

type Plan =
  | { kind: 'static'; layers: FoldLayer[] }
  | {
      kind: 'fold';
      layers: FoldLayer[];
      stepIndex: number;
      from: number;
      to: number;
      /** A crease tweens out and back, and settles where it started. */
      crease: boolean;
    };

/**
 * Origami paper is coloured on one side and white on the other, and that is the
 * only cue for which face you are looking at once the sheet stops being flat.
 * `flips` counts reflections, so an even count is the side that started
 * upwards - the coloured one, matching the "start coloured side up" the
 * instructions open with.
 *
 * The fills are opaque on purpose. Translucent layers blend the two faces into
 * each other, which is what made the previous pair of near-identical off-whites
 * impossible to tell apart.
 */
const FACE_FILL = {
  front: 'var(--color-indigo)',
  back: 'var(--color-paper-raised)',
} as const;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function FoldStage({
  data,
  stepIndex,
  onFoldComplete,
  overlay,
  onPickPoint,
  ariaLabel,
  className,
}: FoldStageProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pathsRef = useRef(new Map<string, SVGPathElement>());
  const shownRef = useRef({ index: stepIndex, data });

  const bounds = useMemo(() => contentBounds(data), [data]);
  const scale = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) / 100;

  const [plan, setPlan] = useState<Plan>(() => ({ kind: 'static', layers: replay(data, stepIndex).layers }));

  useEffect(() => {
    const shown = shownRef.current;
    const settled = Math.max(0, Math.min(stepIndex, data.steps.length));
    if (shown.index === settled && shown.data === data) return;

    const isAdjacent = shown.data === data && Math.abs(settled - shown.index) === 1;
    const folding = Math.min(shown.index, settled);
    const step = data.steps[folding];

    shownRef.current = { index: settled, data };

    if (!isAdjacent || step === undefined || prefersReducedMotion()) {
      setPlan({ kind: 'static', layers: replay(data, settled).layers });
      return;
    }

    const crease = step.kind === 'crease';
    const from = crease || settled > shown.index ? 0 : 1;
    // foldFrame leaves a crease step's paper untouched, so the frames are built
    // from a copy typed as a fold: the flap lifts on screen while the committed
    // state stays flat.
    const shape = crease ? { ...step, kind: 'fold' as const } : step;
    setPlan({
      kind: 'fold',
      // Sampled at the starting progress, not an arbitrary point: the split into
      // flap and remainder does not depend on progress, but the paths do, and a
      // mid-fold sample here would paint one frame of the wrong geometry.
      layers: foldFrame(replay(data, folding), shape, from).layers,
      stepIndex: folding,
      from,
      to: 1,
      crease,
    });
  }, [data, stepIndex]);

  useEffect(() => {
    if (plan.kind !== 'fold') return;

    const step = data.steps[plan.stepIndex];
    if (step === undefined) return;

    const base = replay(data, plan.stepIndex);
    const progress = { t: plan.from };
    // Same reason as the plan above: a crease is animated as the fold it would
    // have been, because foldFrame returns the unchanged paper for a crease.
    const shape = plan.crease ? { ...step, kind: 'fold' as const } : step;

    const write = () => {
      const frame = foldFrame(base, shape, progress.t);
      for (const layer of frame.layers) {
        pathsRef.current.get(layer.id)?.setAttribute('d', toPathData(layer.polygon));
      }
    };

    write();

    const seconds = Math.max(0.2, step.durationMs / (plan.crease ? 2000 : 1000));

    const tween = gsap.to(progress, {
      t: plan.to,
      duration: seconds,
      yoyo: plan.crease,
      repeat: plan.crease ? 1 : 0,
      ease: 'power2.inOut',
      onUpdate: write,
      onComplete: () => {
        setPlan({ kind: 'static', layers: replay(data, shownRef.current.index).layers });
        onFoldComplete?.();
      },
    });

    return () => {
      tween.kill();
    };
  }, [plan, data, onFoldComplete]);

  const handleClick = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (onPickPoint === undefined || svg === null) return;

      const matrix = svg.getScreenCTM();
      if (matrix === null) return;

      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const local = point.matrixTransform(matrix.inverse());
      onPickPoint({ x: local.x, y: local.y });
    },
    [onPickPoint],
  );

  const activeStep = plan.kind === 'fold' ? data.steps[plan.stepIndex] : undefined;
  /** The guide lines already pressed into the paper at this point in the fold. */
  const marks = useMemo(() => creaseLines(data, stepIndex), [data, stepIndex]);

  return (
    <svg
      ref={svgRef}
      viewBox={viewBoxOf(bounds)}
      role="img"
      aria-label={ariaLabel ?? 'Folded paper'}
      onClick={onPickPoint === undefined ? undefined : handleClick}
      className={cn(className, 'block h-full w-full touch-none select-none')}
    >
      {plan.layers.map((layer) => (
        <path
          key={layer.id}
          ref={(node) => {
            if (node === null) pathsRef.current.delete(layer.id);
            else pathsRef.current.set(layer.id, node);
          }}
          d={toPathData(layer.polygon)}
          fill={FACE_FILL[layer.flips % 2 === 0 ? 'front' : 'back']}
          stroke="var(--color-crease)"
          strokeWidth={0.7 * scale}
          strokeLinejoin="round"
        />
      ))}

      {marks.map((mark, index) => (
        <line
          key={`crease-${index}`}
          x1={mark.from.x}
          y1={mark.from.y}
          x2={mark.to.x}
          y2={mark.to.y}
          stroke="var(--color-crease)"
          strokeWidth={0.5 * scale}
          strokeDasharray={`${2 * scale} ${2 * scale}`}
          strokeLinecap="round"
          opacity={0.55}
        />
      ))}

      {activeStep === undefined ? null : (
        <line
          x1={activeStep.from.x}
          y1={activeStep.from.y}
          x2={activeStep.to.x}
          y2={activeStep.to.y}
          stroke="var(--color-beni)"
          strokeWidth={0.9 * scale}
          strokeDasharray={`${3 * scale} ${2.4 * scale}`}
          strokeLinecap="round"
          opacity={0.7}
        />
      )}

      {overlay}
    </svg>
  );
}
